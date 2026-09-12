document.addEventListener('DOMContentLoaded', async () => {
    // Top Nav Integration
    fetchUserProfile();

    // Fetch Lost & Found Items
    fetchLostFoundData('all', 'all');

    // Filter Logic
    setupFilters();
});

async function fetchUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
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

async function fetchLostFoundData(kind, status) {
    const container = document.getElementById('lfFeedContainer');
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>Loading items...</p></div>';
    
    let url = '/lost-found?size=10';
    if (kind !== 'all') url += `&kind=${kind}`;
    if (status !== 'all') {
        const statusMap = { 'active': 'not_found', 'resolved': 'found_and_returned' };
        url += `&status=${statusMap[status] || status}`;
    }

    try {
        const res = await apiFetch(url);
        if (res && res.ok) {
            const page = await res.json();
            const items = page.content || [];
            
            // Update stats
            updateStats(items); // Note: Using the current page to approximate stats for now
            
            document.getElementById('itemCount').textContent = page.totalElements || items.length;
            
            if (items.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding: 3rem; color: #94a3b8;"><i class="fa-solid fa-inbox fa-3x"></i><p style="margin-top:1rem;">No items found matching these filters.</p></div>';
                return;
            }
            
            container.innerHTML = items.map(item => createLFCard(item)).join('');
            
        } else {
            throw new Error("Failed to fetch");
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color: red; padding: 2rem;">Error loading items.</p>';
    }
}

function updateStats(items) {
    let lostCount = items.filter(i => i.postKind === 'lost').length;
    let foundCount = items.filter(i => i.postKind === 'found').length;
    let resolvedCount = items.filter(i => i.status === 'found_and_returned' || i.status === 'returned_to_owner').length;
    
    document.getElementById('statsSubtitle').textContent = `${lostCount} lost · ${foundCount} found · ${resolvedCount} resolved this month`;

    const pulseGrid = document.getElementById('lfPulseGrid');
    pulseGrid.innerHTML = `
        <div class="pulse-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <i class="fa-solid fa-clipboard-list" style="color: #64748b;"></i>
            <h2 style="color: #334155;">${items.length}</h2>
            <p>Total Reports</p>
        </div>
        <div class="pulse-card" style="background-color: #fffbeb; border: 1px solid #fef3c7;">
            <i class="fa-solid fa-magnifying-glass" style="color: #f59e0b;"></i>
            <h2 style="color: #b45309;">${lostCount}</h2>
            <p>Lost Items</p>
        </div>
        <div class="pulse-card" style="background-color: #ecfdf5; border: 1px solid #d1fae5;">
            <i class="fa-solid fa-check" style="color: #10b981;"></i>
            <h2 style="color: #047857;">${foundCount}</h2>
            <p>Found Items</p>
        </div>
        <div class="pulse-card" style="background-color: #f5f3ff; border: 1px solid #ede9fe;">
            <i class="fa-solid fa-trophy" style="color: #8b5cf6;"></i>
            <h2 style="color: #6d28d9;">${resolvedCount}</h2>
            <p>Resolved</p>
        </div>
    `;
}

function setupFilters() {
    let currentKind = 'all';
    let currentStatus = 'all';

    document.querySelectorAll('#kindFilterGroup .lf-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#kindFilterGroup .lf-toggle').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentKind = e.currentTarget.dataset.kind;
            fetchLostFoundData(currentKind, currentStatus);
        });
    });

    document.querySelectorAll('#statusFilterGroup .lf-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#statusFilterGroup .lf-toggle').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentStatus = e.currentTarget.dataset.status;
            fetchLostFoundData(currentKind, currentStatus);
        });
    });
}

function createLFCard(item) {
    const isLost = item.postKind === 'lost';
    
    // Header tags
    const badgeHtml = isLost ? 
        `<span class="badge-kind lost"><i class="fa-solid fa-magnifying-glass"></i> LOST</span>` : 
        `<span class="badge-kind found"><i class="fa-solid fa-check"></i> FOUND</span>`;
    
    // Formatted ID
    const displayId = `LF-${new Date(item.createdAt).getFullYear()}-${String(item.id).padStart(4, '0')}`;
    
    // Status Pill
    let statusPillClass = '';
    let statusText = '';
    if (item.status === 'not_found') {
        statusPillClass = 'missing';
        statusText = 'Still Missing';
    } else if (item.status === 'unclaimed') {
        statusPillClass = 'unclaimed';
        statusText = 'Unclaimed';
    } else if (item.status === 'found' || item.status === 'returned' || item.status === 'resolved') {
        statusPillClass = 'resolved';
        statusText = 'Resolved';
    } else {
        statusPillClass = 'missing';
        statusText = item.status || 'Unknown';
    }

    // Determine if user can edit
    let canEdit = false;
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.sub ? parseInt(payload.sub, 10) : null;
            const accountType = payload.accountType;
            if ((userId && userId === item.ownerId) || accountType === 'AUTHORITY') {
                canEdit = true;
            }
        } catch (e) {}
    }

    let statusHtml = '';
    if (canEdit) {
        statusHtml = `
            <select class="status-select ${statusPillClass}" onchange="updateLostFoundStatus(${item.id}, this.value)" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-full); border: 1px solid var(--border-color); font-size: 0.85rem; font-weight: 600; cursor: pointer; outline: none;">
                <option value="not_found" ${item.status === 'not_found' ? 'selected' : ''}>Status: Still Missing</option>
                <option value="unclaimed" ${item.status === 'unclaimed' ? 'selected' : ''}>Status: Unclaimed</option>
                <option value="found" ${item.status === 'found' ? 'selected' : ''}>Status: Resolved</option>
            </select>
        `;
    } else {
        statusHtml = `
            <div class="status-pill ${statusPillClass}">
                Status: ${statusText}
            </div>
        `;
    }

    // Colors for avatar
    const colors = ['bg-blue', 'bg-purple', 'bg-teal', 'bg-pink'];
    const avatarClass = colors[(item.ownerId || 0) % colors.length];
    const initials = item.ownerName ? item.ownerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    // Image block (only show if imageUrls exist and is not empty)
    let imageHtml = '';
    if (item.imageUrls && item.imageUrls.length > 0) {
        imageHtml = `
            <div class="lf-image-container">
                <img src="${item.imageUrls[0]}" alt="Item image">
            </div>
        `;
    }

    return `
    <div class="lf-card">
        <div class="lf-card-header">
            <div class="lf-user-info">
                <div class="lf-avatar ${avatarClass}">${initials}</div>
                <div class="lf-meta">
                    <h4>${item.ownerName || 'Unknown User'}</h4>
                    <p>Student — ${timeAgo(item.createdAt)}</p>
                </div>
            </div>
            <div class="lf-badges">
                ${badgeHtml}
                <span class="badge-id">${displayId}</span>
            </div>
        </div>
        
        <div class="lf-content-layout">
            <div class="lf-text">
                <h3>${item.title || 'Untitled Item'}</h3>
                <p>${item.description}</p>
                ${item.lastKnownLocation ? `<div class="lf-location"><i class="fa-solid fa-location-dot"></i> ${item.lastKnownLocation}</div>` : ''}
            </div>
            ${imageHtml}
        </div>
        
        <div class="lf-footer">
            ${statusHtml}
            
            <div class="post-actions" style="border:none; padding:0; gap:1rem;">
                <button class="action-btn"><i class="fa-regular fa-thumbs-up"></i></button>
                <button class="action-btn"><i class="fa-regular fa-thumbs-down"></i></button>
                <button class="action-btn"><i class="fa-regular fa-comment"></i></button>
                <button class="action-btn" style="margin-left: 0.5rem;"><i class="fa-regular fa-bookmark"></i></button>
                <button class="action-btn"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
        </div>
    </div>
    `;
}

// Utility
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    const diffDays = Math.round(diffHrs / 24);
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
}

// Modal Logic
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('reportModal');
    const openBtn = document.getElementById('openReportModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelReportBtn');
    const form = document.getElementById('reportForm');
    
    let currentReportType = 'lost';
    let uploadedImageUrls = [];

    // Open/Close Modal
    openBtn.addEventListener('click', () => modal.classList.add('active'));
    
    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
        uploadedImageUrls = [];
        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.type-btn[data-type="lost"]').classList.add('active');
        currentReportType = 'lost';
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Type Toggle
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentReportType = e.currentTarget.dataset.type;
        });
    });

    // Dummy Image Upload
    const addImageBtn = document.getElementById('addImageBtn');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('imagePreviewContainer');

    addImageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            // For now, just generate a dummy placeholder URL since we don't have an S3 upload endpoint setup
            const dummyUrl = 'https://via.placeholder.com/150?text=Uploaded+Image';
            uploadedImageUrls.push(dummyUrl);
            
            const img = document.createElement('img');
            img.src = dummyUrl;
            img.className = 'image-preview';
            previewContainer.appendChild(img);
        }
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            postKind: currentReportType,
            title: document.getElementById('reportItemName').value,
            description: document.getElementById('reportDescription').value,
            lastKnownLocation: document.getElementById('reportLocation').value,
            imageUrls: uploadedImageUrls
        };

        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const res = await apiFetch('/lost-found', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                closeModal();
                // Refresh data
                fetchLostFoundData(
                    document.querySelector('#kindFilterGroup .active').dataset.kind,
                    document.querySelector('#statusFilterGroup .active').dataset.status
                );
            } else {
                alert('Failed to submit report');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    });
});

async function updateLostFoundStatus(postId, newStatus) {
    try {
        const res = await apiFetch(`/lost-found/${postId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            const activeKind = document.querySelector('#kindFilterGroup .active').dataset.kind;
            const activeStatus = document.querySelector('#statusFilterGroup .active').dataset.status;
            fetchLostFoundData(activeKind, activeStatus);
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
        userProfileBtn.addEventListener('click', (e) => {
            // Toggle dropdown
            if (profileDropdown.style.display === 'none' || profileDropdown.style.display === '') {
                profileDropdown.style.display = 'block';
            } else {
                profileDropdown.style.display = 'none';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfileBtn.contains(e.target)) {
                profileDropdown.style.display = 'none';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }
});
