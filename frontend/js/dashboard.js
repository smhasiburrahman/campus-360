document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch User Profile
    await fetchUserProfile();

    // 2. Fetch Dashboard Feed and Widgets
    fetchWidgets();
    fetchFeed();
});

async function fetchUserProfile() {
    try {
        const res = await apiFetch('/students/me');
        if (res && res.ok) {
            const user = await res.json();
            document.getElementById('navName').textContent = user.fullName;
            const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById('navAvatar').textContent = initials;
        }
    } catch (err) {
        console.error('Failed to load user profile', err);
    }
}

window.incrementVisits = async function(id) {
    try {
        await apiFetch('/materials/' + id + '/visit', { method: 'POST' });
    } catch (e) {
        console.error('Failed to increment visits', e);
    }
}

async function fetchWidgets() {
    // Upcoming Events
    try {
        const res = await apiFetch('/events?upcoming=true');
        if (res && res.ok) {
            const page = await res.json();
            const events = page.content.slice(0, 3); // top 3
            
            const container = document.getElementById('upcomingEventsContainer');
            if (events.length === 0) {
                container.innerHTML = '<p style="color: #94a3b8; text-align: center;">No upcoming events.</p>';
            } else {
                container.innerHTML = events.map(ev => {
                    const dateObj = new Date(ev.eventDate);
                    const month = dateObj.toLocaleString('default', { month: 'short' });
                    const day = dateObj.getDate();
                    return `
                    <div class="event-item">
                        <div class="event-date">
                            <span>${month}</span>
                            ${day}
                        </div>
                        <div class="event-details">
                            <h4>${ev.title || 'Untitled Event'}</h4>
                            <p>${ev.postedBy ? ev.postedBy.name : 'Campus Event'}</p>
                        </div>
                    </div>`;
                }).join('');
            }
        }
    } catch (err) {
        console.error('Events failed', err);
    }

    // Campus Pulse (Dummy Data for now, as stats endpoints aren't ready)
    const pulseGrid = document.getElementById('pulseGrid');
    pulseGrid.innerHTML = `
        <div class="pulse-card">
            <i class="fa-solid fa-pen-to-square" style="color: #3b82f6;"></i>
            <h2>12</h2>
            <p>Posts Today</p>
        </div>
        <div class="pulse-card">
            <i class="fa-solid fa-flag" style="color: #ef4444;"></i>
            <h2>3</h2>
            <p>Open Complaints</p>
        </div>
        <div class="pulse-card">
            <i class="fa-solid fa-book" style="color: #0ea5e9;"></i>
            <h2>4</h2>
            <p>Active Studies</p>
        </div>
        <div class="pulse-card">
            <i class="fa-regular fa-file-lines" style="color: #6366f1;"></i>
            <h2>7</h2>
            <p>New Materials</p>
        </div>
    `;
}

let globalFeedData = [];

async function fetchFeed() {
    const feedContainer = document.getElementById('feedContainer');
    
    try {
        // Fetch concurrently
        const [announcementsRes, eventsRes, materialsRes, lostFoundRes] = await Promise.all([
            apiFetch('/announcements'),
            apiFetch('/events'),
            apiFetch('/materials'),
            apiFetch('/lost-found')
        ]);
        
        let allPosts = [];
        
        if (announcementsRes && announcementsRes.ok) {
            const data = await announcementsRes.json();
            data.content.forEach(p => allPosts.push({...p, _type: 'announcement'}));
        }
        
        if (eventsRes && eventsRes.ok) {
            const data = await eventsRes.json();
            data.content.forEach(p => allPosts.push({...p, _type: 'event'}));
        }
        
        if (materialsRes && materialsRes.ok) {
            const data = await materialsRes.json();
            data.content.forEach(p => allPosts.push({...p, _type: 'material'}));
        }

        if (lostFoundRes && lostFoundRes.ok) {
            const data = await lostFoundRes.json();
            data.content.forEach(p => allPosts.push({...p, _type: 'lost-found'}));
        }
        
        // Sort chronologically (newest first)
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        globalFeedData = allPosts;
        
        renderFeed(globalFeedData);
        
    } catch (err) {
        console.error('Feed failed', err);
        feedContainer.innerHTML = '<p style="color: red; padding: 2rem;">Error loading feed data.</p>';
    }
}

function renderFeed(posts) {
    const feedContainer = document.getElementById('feedContainer');
    
    if (posts.length === 0) {
        feedContainer.innerHTML = '<div style="text-align:center; padding: 3rem; color: #94a3b8;"><i class="fa-solid fa-inbox fa-3x"></i><p style="margin-top:1rem;">Your feed is empty.</p></div>';
        return;
    }
    
    feedContainer.innerHTML = posts.map(post => {
        return createPostCardHTML(post);
    }).join('');
}

function createPostCardHTML(post) {
    let typeName = '';
    let dotClass = '';
    let contentHTML = '';
    let title = '';
    
    // Customize based on type
    if (post._type === 'announcement') {
        typeName = 'Announcement';
        dotClass = 'announcement';
        title = 'Announcement';
        contentHTML = `<p>${post.description}</p>`;
    } else if (post._type === 'event') {
        typeName = 'Event';
        dotClass = 'event';
        title = post.title || 'Untitled Event';
        let imgHtml = (post.imageUrls && post.imageUrls.length > 0) ? `<img src="${post.imageUrls[0]}" class="post-image" alt="Event Image">` : '';
        let dateStr = post.eventDate ? new Date(post.eventDate).toLocaleDateString() : 'TBD';
        contentHTML = `
            ${imgHtml}
            <p><strong>Date:</strong> ${dateStr} at ${post.time || 'TBD'}</p>
            <p><strong>Location:</strong> ${post.location || 'TBD'}</p>
            <p>${post.description}</p>
            ${post.registrationLink ? `<a href="${post.registrationLink}" target="_blank" class="tag-pill" style="display:inline-block; margin-top:0.5rem; text-decoration:none;">Register Now</a>` : ''}
        `;
    } else if (post._type === 'material') {
        typeName = 'Material Sharing';
        dotClass = 'material';
        title = post.title || 'Untitled Material';
        
        let typeStr = 'Material';
        let linkUrl = '#';
        if (post.files && post.files.length > 0) {
            typeStr = post.files[0].fileType || 'Material';
            linkUrl = post.files[0].fileUrl || '#';
        }

        contentHTML = `
            <div class="material-body" style="display:flex; gap:1.5rem; align-items:flex-start;">
                <div class="material-icon-box" style="width: 60px; height: 60px; background-color: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #6366f1; flex-shrink: 0;">
                    <i class="far fa-file-alt"></i>
                </div>
                <div style="flex:1;">
                    <p class="material-context" style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.75rem 0;">${post.courseName || 'Course'} &middot; ${post.departmentName || 'Dept'} &middot; ${post.trimesterName || 'Trimester'}</p>
                    <div class="material-stats" style="display: flex; align-items: center; gap: 1rem; font-size: 0.85rem;">
                        <span class="type-pill" style="background-color: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">${typeStr}</span>
                        <span class="visit-count" style="color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-eye"></i> ${post.visits || 0} visits</span>
                    </div>
                    ${post.description ? `<p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">${post.description}</p>` : ''}
                </div>
                <a href="${linkUrl}" target="_blank" class="material-visit-btn" onclick="incrementVisits(${post.id})" style="margin-top: auto; background-color: #6366f1; border: none; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                    <i class="fas fa-external-link-alt"></i> Visit
                </a>
            </div>
        `;
    } else if (post._type === 'lost-found') {
        const isLost = post.postKind === 'lost';
        const badgeHtml = isLost ? 
            `<span class="badge-kind lost"><i class="fa-solid fa-magnifying-glass"></i> LOST</span>` : 
            `<span class="badge-kind found"><i class="fa-solid fa-check"></i> FOUND</span>`;
        const displayId = `LF-${new Date(post.createdAt).getFullYear()}-${String(post.id).padStart(4, '0')}`;
        
        let statusPillClass = '';
        let statusText = '';
        if (post.status === 'not_found') {
            statusPillClass = 'missing';
            statusText = 'Still Missing';
        } else if (post.status === 'unclaimed') {
            statusPillClass = 'unclaimed';
            statusText = 'Unclaimed';
        } else if (post.status === 'found' || post.status === 'returned' || post.status === 'resolved') {
            statusPillClass = 'resolved';
            statusText = 'Resolved';
        } else {
            statusPillClass = 'missing';
            statusText = post.status || 'Unknown';
        }

        // Determine if user can edit
        let canEdit = false;
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.sub ? parseInt(payload.sub, 10) : null;
                const accountType = payload.accountType;
                if ((userId && userId === post.ownerId) || accountType === 'AUTHORITY') { // Using ownerId as standard
                    canEdit = true;
                }
            } catch (e) {}
        }

        let statusHtml = '';
        if (canEdit) {
            statusHtml = `
                <select class="status-select ${statusPillClass}" onchange="updateLostFoundStatus(${post.id}, this.value)" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-full); border: 1px solid var(--border-color); font-size: 0.85rem; font-weight: 600; cursor: pointer; outline: none;">
                    <option value="not_found" ${post.status === 'not_found' ? 'selected' : ''}>Status: Still Missing</option>
                    <option value="unclaimed" ${post.status === 'unclaimed' ? 'selected' : ''}>Status: Unclaimed</option>
                    <option value="found" ${post.status === 'found' ? 'selected' : ''}>Status: Resolved</option>
                </select>
            `;
        } else {
            statusHtml = `
                <div class="status-pill ${statusPillClass}">
                    Status: ${statusText}
                </div>
            `;
        }

        const colors = ['bg-blue', 'bg-purple', 'bg-teal', 'bg-pink'];
        const avatarClass = colors[(post.ownerId || 0) % colors.length];
        const initials = post.ownerName ? post.ownerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

        let imageHtml = '';
        if (post.imageUrls && post.imageUrls.length > 0) {
            imageHtml = `
                <div class="lf-image-container">
                    <img src="${post.imageUrls[0]}" alt="Item image">
                </div>
            `;
        }
        
        // Custom timeAgo helper inline for dashboard since we don't share utils yet
        const now = new Date();
        const past = new Date(post.createdAt);
        const diffMins = Math.round((now - past) / 60000);
        let timeStr = '';
        if (diffMins < 60) timeStr = `${diffMins} minutes ago`;
        else {
            const diffHrs = Math.round(diffMins / 60);
            if (diffHrs < 24) timeStr = `${diffHrs} hours ago`;
            else {
                const diffDays = Math.round(diffHrs / 24);
                timeStr = diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
            }
        }

        return `
        <div class="lf-card">
            <div class="lf-card-header">
                <div class="lf-user-info">
                    <div class="lf-avatar ${avatarClass}">${initials}</div>
                    <div class="lf-meta">
                        <h4>${post.ownerName || 'Unknown User'}</h4>
                        <p>Student — ${timeStr}</p>
                    </div>
                </div>
                <div class="lf-badges">
                    ${badgeHtml}
                    <span class="badge-id">${displayId}</span>
                </div>
            </div>
            
            <div class="lf-content-layout">
                <div class="lf-text">
                    <h3>${post.title || 'Untitled Item'}</h3>
                    <p>${post.description}</p>
                    ${post.lastKnownLocation ? `<div class="lf-location"><i class="fa-solid fa-location-dot"></i> ${post.lastKnownLocation}</div>` : ''}
                </div>
                ${imageHtml}
            </div>
            
            <div class="lf-footer">
                ${statusHtml}
                
                <div class="post-actions" style="border:none; padding:0; gap:1rem;">
                    <button class="action-btn"><i class="fa-regular fa-thumbs-up"></i></button>
                    <button class="action-btn"><i class="fa-regular fa-comment"></i></button>
                    <button class="action-btn" style="margin-left: auto;"><i class="fa-regular fa-bookmark"></i></button>
                    ${window.currentUser && (post.ownerId == window.currentUser.id || window.currentUser.role === 'ROLE_ADMIN' || window.currentUser.role === 'ROLE_SUPER_ADMIN') && post._type === 'lost-found' ? 
                    `<div style="position:relative; display:inline-block;">
                        <button class="action-btn" onclick="toggleDropdown(event, 'dash-dropdown-${post.id}')"><i class="fa-solid fa-ellipsis"></i></button>
                        <div id="dash-dropdown-${post.id}" class="profile-dropdown-menu" style="display:none; position:absolute; bottom:100%; right:0; background:white; border:1px solid var(--border-color); border-radius:8px; box-shadow:var(--shadow-sm); min-width:120px; z-index:100; padding:0.5rem 0;">
                            <a href="#" onclick="deleteLostFoundPost(${post.id}, this); return false;" style="display:block; padding:0.5rem 1rem; color:#ef4444; text-decoration:none;"><i class="fas fa-trash"></i> Delete</a>
                        </div>
                    </div>` : 
                    (post._type === 'lost-found' ? `<button class="action-btn" onclick="alert('You do not have permission to delete this post.')"><i class="fa-solid fa-ellipsis"></i></button>` : `<button class="action-btn"><i class="fa-solid fa-ellipsis"></i></button>`)
                    }
                </div>
            </div>
        </div>
        `;
    }
    
    return `
    <div class="post-card">
        <div class="post-header">
            <div class="post-avatar">U</div>
            <div class="post-meta">
                <h4>User <span class="tag-pill" style="color: var(--text-main); background: transparent;">● <span class="dot ${dotClass}" style="display:inline-block; margin-right:4px;"></span>${typeName}</span></h4>
                <p>${new Date(post.createdAt).toLocaleString()}</p>
            </div>
        </div>
        
        <div class="post-content">
            <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">${title}</h3>
            ${contentHTML}
        </div>
        
        <div class="post-actions">
            <button class="action-btn"><i class="fa-regular fa-heart"></i> 0</button>
            <button class="action-btn"><i class="fa-regular fa-comment"></i> 0</button>
        </div>
    </div>
    `;
}

// Setup Filter Tabs
document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        // Update active class
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const filterText = e.currentTarget.textContent.trim().toLowerCase();
        
        let filtered = [];
        if (filterText === 'all posts') {
            filtered = globalFeedData;
        } else if (filterText === 'announcements') {
            filtered = globalFeedData.filter(p => p._type === 'announcement');
        } else if (filterText === 'events') {
            filtered = globalFeedData.filter(p => p._type === 'event');
        } else if (filterText === 'material sharing') {
            filtered = globalFeedData.filter(p => p._type === 'material');
        } else if (filterText === 'lost & found' || filterText === 'lost and found') {
            filtered = globalFeedData.filter(p => p._type === 'lost-found');
        } else {
            // Other modules not implemented yet
            filtered = []; 
        }
        
        renderFeed(filtered);
    });
});

async function updateLostFoundStatus(postId, newStatus) {
    try {
        const res = await apiFetch(`/lost-found/${postId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            // Update global feed data
            const post = globalFeedData.find(p => p.id === postId && p._type === 'lost-found');
            if (post) {
                post.status = newStatus;
            }
            // Re-render based on active tab
            const activeTab = document.querySelector('.filter-pill.active').textContent.trim().toLowerCase();
            let filtered = [];
            if (activeTab === 'all posts') {
                filtered = globalFeedData;
            } else if (activeTab === 'lost & found' || activeTab === 'lost and found') {
                filtered = globalFeedData.filter(p => p._type === 'lost-found');
            } else {
                filtered = globalFeedData.filter(p => p._type === activeTab.replace('s', ''));
            }
            renderFeed(filtered);
        } else {
            alert('Failed to update status');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred');
    }
}

// Logout logic
document.addEventListener('DOMContentLoaded', () => {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userProfileBtn && profileDropdown) {
        

        // Close dropdown when clicking outside
        
    }

    if (logoutBtn) {
        
    }
});
