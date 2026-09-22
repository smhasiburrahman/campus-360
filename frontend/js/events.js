let globalFeedData = [];
let userRole = '';
let userId = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Basic Profile Dropdown & Logout Logic
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userProfileBtn && profileDropdown) {
        
        
    }

    if (logoutBtn) {
        
    }

    // Determine user role to conditionally show "Add Event"
    function loadUserProfile() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.accountType) userRole = payload.accountType.toUpperCase();
                if (payload.sub) userId = payload.sub;
                
                // Show Add Event button if CLUB or AUTHORITY
                if (userRole === 'CLUB' || userRole === 'AUTHORITY') {
                    const btnContainer = document.getElementById('addEventBtnContainer');
                    btnContainer.innerHTML = `
                        <button class="btn btn-primary" id="openEventModalBtn">
                            <i class="fa-solid fa-plus"></i> Add Event
                        </button>
                    `;
                    setupModal();
                }

                // Fetch Me for basic profile data
                if (userRole === 'STUDENT') {
                    apiFetch('/students/me').then(r => r.json()).then(data => {
                        document.getElementById('navName').textContent = data.fullName;
                        document.getElementById('navAvatar').textContent = data.fullName.charAt(0).toUpperCase();
                    }).catch(e => console.error(e));
                } else if (userRole === 'AUTHORITY') {
                    apiFetch('/authority/me').then(r => r.json()).then(data => {
                        document.getElementById('navName').textContent = data.fullName;
                        document.getElementById('navAvatar').textContent = data.fullName.charAt(0).toUpperCase();
                    }).catch(e => console.error(e));
                }
            } catch (e) {
                console.error("Token parse error", e);
            }
        }
    }
    loadUserProfile();

    // Fetch Events
    await fetchEvents();
    
    // Fetch Upcoming Events for Widget
    await fetchUpcomingEvents();

    // Setup filter buttons
    const filterBtns = document.querySelectorAll('.events-toggle');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            applyFilter(filter);
        });
    });
});

async function fetchEvents() {
    try {
        const res = await apiFetch('/events?size=100');
        if (res && res.ok) {
            const data = await res.json();
            globalFeedData = data.content;
            document.getElementById('pulseEventsCount').textContent = globalFeedData.length;
            renderFeed(globalFeedData);
        }
    } catch (e) {
        console.error("Failed to load events", e);
        document.getElementById('eventsFeed').innerHTML = '<p style="text-align: center; color: var(--text-muted);">Failed to load events.</p>';
    }
}

async function fetchUpcomingEvents() {
    try {
        // Use the upcoming parameter handled by EventRepository
        const res = await apiFetch('/events?upcoming=true&size=3');
        if (res && res.ok) {
            const data = await res.json();
            renderUpcomingWidget(data.content);
        }
    } catch (e) {
        console.error("Failed to load upcoming events", e);
        document.getElementById('upcomingEventsWidget').innerHTML = '<p style="text-align: center; color: var(--text-muted);">Failed to load upcoming events.</p>';
    }
}

function renderFeed(events) {
    const feed = document.getElementById('eventsFeed');
    feed.innerHTML = '';
    
    if (events.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: var(--bg-light); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                <i class="fa-regular fa-folder-open fa-3x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">No Events Found</h3>
                <p style="color: var(--text-muted);">There are no events matching this criteria.</p>
            </div>
        `;
        return;
    }

    events.forEach(evt => {
        feed.innerHTML += createEventCardHTML(evt);
    });
}

function renderUpcomingWidget(events) {
    const widget = document.getElementById('upcomingEventsWidget');
    widget.innerHTML = '';
    
    if (events.length === 0) {
        widget.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">No upcoming events.</p>';
        return;
    }

    events.forEach(evt => {
        // Parse date for the widget
        let dateObj = new Date();
        if (evt.eventDate) {
            dateObj = new Date(evt.eventDate);
        }
        const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
        const day = dateObj.getDate();

        widget.innerHTML += `
            <div class="event-item">
                <div class="event-date">
                    <span>${month}</span>
                    ${day}
                </div>
                <div class="event-details">
                    <h4>${evt.title || 'Untitled Event'}</h4>
                    <p>${evt.postedBy ? evt.postedBy.name : 'Unknown'}</p>
                </div>
            </div>
        `;
    });
}

function applyFilter(filter) {
    let filtered = [];
    const now = new Date();
    
    if (filter === 'all') {
        filtered = globalFeedData;
    } else if (filter === 'upcoming') {
        filtered = globalFeedData.filter(evt => {
            if (!evt.eventDate) return false;
            return new Date(evt.eventDate) >= now;
        });
    } else if (filter === 'past') {
        filtered = globalFeedData.filter(evt => {
            if (!evt.eventDate) return false;
            return new Date(evt.eventDate) < now;
        });
    }
    
    renderFeed(filtered);
}

function createEventCardHTML(evt) {
    const authorName = evt.postedBy ? evt.postedBy.name : 'Unknown';
    const authorType = evt.postedBy && evt.postedBy.type ? evt.postedBy.type.charAt(0).toUpperCase() + evt.postedBy.type.slice(1) : 'User';
    
    // Time ago
    let timeAgo = 'Just now';
    if (evt.createdAt) {
        const diff = Math.floor((new Date() - new Date(evt.createdAt)) / 1000);
        if (diff > 86400) {
            timeAgo = Math.floor(diff / 86400) + ' days ago';
        } else if (diff > 3600) {
            timeAgo = Math.floor(diff / 3600) + ' hours ago';
        } else if (diff > 60) {
            timeAgo = Math.floor(diff / 60) + ' minutes ago';
        }
    }

    let imagesHtml = '';
    if (evt.imageUrls && evt.imageUrls.length > 0) {
        imagesHtml = `<img src="${evt.imageUrls[0]}" class="events-images" alt="Event Image">`;
    }
    
    let dateStr = 'TBD';
    if (evt.eventDate) {
        dateStr = new Date(evt.eventDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const regLinkHtml = evt.registrationLink ? 
        `<a href="${evt.registrationLink}" target="_blank" class="btn-register">Register Now <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>` 
        : '';

    return `
        <div class="events-card">
            <div class="events-card-header">
                <div class="avatar" style="background-color: #8b5cf6;">${authorName.charAt(0).toUpperCase()}</div>
                <div class="events-author-info">
                    <div class="events-author-name">
                        ${authorName}
                        <span class="tag-pill" style="background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
                            <i class="fa-solid fa-circle" style="font-size: 0.3rem; margin-right: 0.25rem; vertical-align: middle;"></i> Event
                        </span>
                    </div>
                    <div class="events-author-meta">${authorType} · ${timeAgo}</div>
                </div>
            </div>
            
            ${imagesHtml}
            
            <div class="events-card-title">${evt.title || 'Untitled Event'}</div>
            
            <div class="events-card-desc">${evt.description}</div>
            
            <div class="events-details-grid">
                <div class="events-detail-item">
                    <i class="fa-regular fa-calendar" style="width: 20px;"></i>
                    <span>${dateStr}</span>
                </div>
                <div class="events-detail-item">
                    <i class="fa-regular fa-clock" style="width: 20px;"></i>
                    <span>${evt.time || 'TBD'}</span>
                </div>
                <div class="events-detail-item" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-location-dot" style="width: 20px;"></i>
                    <span>${evt.location || 'TBD'}</span>
                </div>
            </div>
            
            <div class="events-card-footer">
                <div class="events-organizer">${evt.organizerDetails || ''}</div>
                ${regLinkHtml}
            </div>
            
            <div class="events-card-actions">
                <button class="action-btn"><i class="fa-regular fa-heart"></i> Interested</button>
                <button class="action-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
            </div>
        </div>
    `;
}

// Modal Logic
function setupModal() {
    const modal = document.getElementById('createEventModal');
    const openBtn = document.getElementById('openEventModalBtn');
    const closeBtn = document.getElementById('closeEventModalBtn');
    const cancelBtn = document.getElementById('cancelEventBtn');
    const form = document.getElementById('createEventForm');
    const uploadInput = document.getElementById('eventImageUpload');
    const previews = document.getElementById('eventImagePreviews');

    if (!modal || !openBtn) return;

    openBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
        previews.innerHTML = '';
        dummyImageUrls = [];
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Dummy Image Upload
    let dummyImageUrls = [];
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // For now, simulate upload with a random image
            const dummyUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
            dummyImageUrls.push(dummyUrl);
            previews.innerHTML += `<img src="${dummyUrl}" class="image-preview" alt="Preview">`;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('eventTitle').value;
        const dateStr = document.getElementById('eventDate').value; // YYYY-MM-DD
        const time = document.getElementById('eventTime').value;
        const location = document.getElementById('eventLocation').value;
        const registrationLink = document.getElementById('eventLink').value;
        const description = document.getElementById('eventDesc').value;
        const organizerDetails = document.getElementById('eventOrganizer').value;
        
        let eventDate = null;
        if (dateStr) {
            eventDate = `${dateStr}T00:00:00`;
        }

        const payload = {
            title,
            description,
            time,
            location,
            registrationLink,
            organizerDetails,
            eventDate,
            imageUrls: dummyImageUrls
        };

        const submitBtn = document.getElementById('submitEventBtn');
        const origText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
        submitBtn.disabled = true;

        try {
            const res = await apiFetch('/events', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                closeModal();
                await fetchEvents();
                await fetchUpcomingEvents();
            } else {
                alert('Failed to post event');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        } finally {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
        }
    });
}
