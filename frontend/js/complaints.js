let currentUserId = 1;
let currentUserRole = 'STUDENT';
let complaintsList = [];
let activeStatusFilter = 'ALL';
let showOnlyMyComplaints = false;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Maintain mock token if not present to avoid redirects during offline development
    if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'mock.eyJzdWIiOiIxIiwibmFtZSI6IlNhcmFoIFJhaG1hbiIsInJvbGUiOiJTVFVERU5UIn0.mock');
    }

    try {
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.sub ? parseInt(payload.sub, 10) : 1;
        currentUserRole = payload.role || (payload.accountType === 'AUTHORITY' ? 'AUTHORITY' : 'STUDENT');
    } catch (e) {
        console.warn('Token decoding skipped, default student role applied.');
    }

    // Removed dummy authorityViewBtn references

    await loadUserProfile();
    setupEventListeners();
    await fetchComplaints();
});

/* ==========================================================================
   1. USER PROFILE INTEGRATION
   ========================================================================== */
async function loadUserProfile() {
    try {
        if (currentUserRole !== 'STUDENT' && currentUserRole !== 'ROLE_STUDENT') {
            document.getElementById('navName').textContent = 'Authority / Admin';
            document.getElementById('navAvatar').textContent = 'AU';
            return;
        }

        // BACKEND API INTEGRATION:
        // GET /api/v1/students/me
        const res = await apiFetch('/students/me');
        if (res && res.ok) {
            const user = await res.json();
            document.getElementById('navName').textContent = user.fullName || 'User';
            const initials = (user.fullName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById('navAvatar').textContent = initials;
        }
    } catch (err) {
        console.warn('Profile fetch skipped (backend not active).');
    }
}

/* ==========================================================================
   2. DOM LISTENERS & MODAL SETUP
   ========================================================================== */
function setupEventListeners() {
    // User profile dropdown toggle
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userProfileBtn && profileDropdown) {
        
        
    }

    if (logoutBtn) {
        
    }

    // Status filter tabs
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeStatusFilter = e.currentTarget.getAttribute('data-status');
            applyClientSideFilters();
        });
    });

    // My complaints toggle checkbox
    const myComplaintsToggle = document.getElementById('myComplaintsToggle');
    if (myComplaintsToggle) {
        myComplaintsToggle.addEventListener('change', (e) => {
            showOnlyMyComplaints = e.target.checked;
            applyClientSideFilters();
        });
    }

    // Search bar filter
    const searchInput = document.getElementById('complaintSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => applyClientSideFilters());
    }

    // Sort order select
    const sortSelect = document.getElementById('sortOrderSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => applyClientSideFilters());
    }

    // Modal controls
    const modal = document.getElementById('complaintModal');
    const openModalBtn = document.getElementById('openComplaintModalBtn');
    const closeModalBtn = document.getElementById('closeComplaintModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');

    if (openModalBtn) openModalBtn.addEventListener('click', () => modal.style.display = 'flex');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => modal.style.display = 'none');

    // Complaint submission form
    const form = document.getElementById('fileComplaintForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitNewComplaint();
        });
    }
}

/* ==========================================================================
   3. DATA FETCHING (API WITH SAFE DYNAMIC FALLBACK)
   ========================================================================== */
async function fetchComplaints() {
    let apiSuccess = false;
    try {
        // BACKEND API INTEGRATION:
        // GET /api/v1/complaints?page=0&size=50
        const res = await apiFetch('/complaints');
        if (res && res.ok) {
            const data = await res.json();
            complaintsList = data.content || [];
            apiSuccess = true;
        }
    } catch (err) {
        console.warn('Backend currently offline, initializing dynamic mock state.');
    }

    // Backend is fully responsible for complaints data

    computeStatsFromList();
    applyClientSideFilters();
}

/* ==========================================================================
   4. STATS & CATEGORY COMPUTATION
   ========================================================================== */
function computeStatsFromList() {
    const counts = {
        ALL: complaintsList.length,
        not_approved: 0,
        pending: 0,
        processing: 0,
        handled: 0,
        denied: 0
    };

    complaintsList.forEach(item => {
        if (counts[item.status] !== undefined) counts[item.status]++;
    });

    ['ALL', 'not_approved', 'pending', 'processing', 'handled', 'denied'].forEach(st => {
        const el = document.getElementById(`count-${st}`);
        if (el) el.textContent = counts[st] || 0;
    });

    // Update Overview Card
    document.getElementById('overviewNotApproved').textContent = counts.not_approved || 0;
    document.getElementById('overviewPending').textContent = counts.pending || 0;
    document.getElementById('overviewProcessing').textContent = counts.processing || 0;
    document.getElementById('overviewHandled').textContent = counts.handled || 0;
    document.getElementById('overviewDenied').textContent = counts.denied || 0;

    // Update Top Categories list
    const catMap = {};
    complaintsList.forEach(c => {
        const cat = c.category || 'General';
        catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const catList = document.getElementById('categoriesList');
    if (catList) {
        catList.innerHTML = Object.keys(catMap).map(cat => `
            <div class="category-row">
                <span>${cat}</span>
                <strong>${catMap[cat]}</strong>
            </div>
        `).join('');
    }
}

/* ==========================================================================
   5. FILTERING & RENDERING
   ========================================================================== */
function applyClientSideFilters() {
    let filtered = [...complaintsList];

    if (activeStatusFilter !== 'ALL') {
        filtered = filtered.filter(item => item.status === activeStatusFilter);
    }

    if (showOnlyMyComplaints && currentUserId) {
        filtered = filtered.filter(item => item.ownerId === currentUserId);
    }

    const query = (document.getElementById('complaintSearchInput')?.value || '').toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(item => 
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query))
        );
    }

    const sortVal = document.getElementById('sortOrderSelect')?.value;
    if (sortVal === 'most_voted') {
        filtered.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderComplaintFeed(filtered);
}

function renderComplaintFeed(items) {
    const feedContainer = document.getElementById('complaintsFeedContainer');
    
    if (items.length === 0) {
        feedContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: white; border-radius: 16px; border: 1px solid #e2e8f0; color: #94a3b8;">
                <i class="fa-solid fa-flag" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
                <p>No complaints found matching this criteria.</p>
            </div>
        `;
        return;
    }

    feedContainer.innerHTML = items.map(c => createComplaintCardHTML(c)).join('');
}

function createComplaintCardHTML(item) {
    const displayId = `#CPL-${new Date(item.createdAt).getFullYear()}-${String(item.id).padStart(4, '0')}`;
    const authorName = item.isAnonymous ? 'Anonymous Student' : (item.ownerName || 'Student');
    const initials = item.isAnonymous ? 'AN' : authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Auto-escalated check: 1+ upvotes (agree)[cite: 1]
    const isEscalated = (item.upvoteCount || 0) >= 1;

    let statusPillClass = `status-${item.status}`;
    let statusLabel = item.status ? item.status.replace('_', ' ').toUpperCase() : 'UNKNOWN';

    // Authority control: from 'pending' onwards authority can move status[cite: 1]
    const isAuthority = currentUserRole === 'AUTHORITY' || currentUserRole === 'AUTHORITY_ADMIN' || currentUserRole === 'ROLE_ADMIN';
    let statusRenderHTML = '';

    if (isAuthority && item.status !== 'not_approved') {
        let optionsHtml = '';
        if (item.status === 'pending') {
            optionsHtml = `
                <option value="pending" selected>Pending</option>
                <option value="processing">Processing</option>
                <option value="handled">Handled</option>
                <option value="denied">Denied</option>
            `;
        } else if (item.status === 'processing') {
            optionsHtml = `
                <option value="processing" selected>Processing</option>
                <option value="handled">Handled</option>
                <option value="denied">Denied</option>
            `;
        } else if (item.status === 'handled') {
            optionsHtml = `<option value="handled" selected>Handled</option>`;
        } else if (item.status === 'denied') {
            optionsHtml = `<option value="denied" selected>Denied</option>`;
        }

        const selectDisabled = (item.status === 'handled' || item.status === 'denied') ? 'disabled' : '';

        statusRenderHTML = `
            <select class="authority-status-select ${statusPillClass}" onchange="updateComplaintStatus(${item.id}, this.value)" ${selectDisabled}>
                ${optionsHtml}
            </select>
        `;
    } else {
        statusRenderHTML = `<span class="complaint-status-pill ${statusPillClass}">${statusLabel}</span>`;
    }

    let mediaHtml = '';
    if (item.imageUrls && item.imageUrls.length > 0) {
        mediaHtml = `
            <div class="complaint-media-box">
                <img src="${item.imageUrls[0]}" alt="Evidence">
            </div>
        `;
    }

    let officialResponseHtml = '';
    if (item.officialResponse) {
        officialResponseHtml = `
            <div class="official-response-box">
                <i class="fa-solid fa-circle-check"></i>
                <span>${item.officialResponse}</span>
            </div>
        `;
    }

    const isAgree = item.userReaction === 'like';
    const isDisagree = item.userReaction === 'dislike';

    const isTerminal = item.status === 'handled' || item.status === 'denied';
    const disableVoteClass = isTerminal ? 'disabled' : '';
    const clickEventLike = isTerminal ? '' : `onclick="castVote(${item.id}, 'like')"`;
    const clickEventDislike = isTerminal ? '' : `onclick="castVote(${item.id}, 'dislike')"`;

    return `
        <div class="complaint-card" id="complaint-card-${item.id}">
            <div class="complaint-card-header">
                <div class="user-info-area">
                    <div class="user-avatar-tag">${initials}</div>
                    <div class="user-meta-lines">
                        <h4>
                            ${authorName}
                            <span class="tag-badge complaint">Complaint</span>
                            ${item.isAnonymous ? '<span class="tag-badge anonymous">Anonymous</span>' : ''}
                        </h4>
                        <p>${item.department || 'CSE'} &middot; ${new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                ${statusRenderHTML}
            </div>

            <div class="complaint-badges-line">
                <span class="badge-tag badge-category">${item.category || 'General'}</span>
                ${isEscalated ? '<span class="badge-tag badge-escalated">&bull; Auto-escalated (1+ upvote)</span>' : ''}
            </div>

            <h3 class="complaint-title">${item.title || 'Untitled Issue'}</h3>
            <p class="complaint-desc">${item.description}</p>
            ${item.location ? `<div class="complaint-location"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>` : ''}

            ${mediaHtml}
            ${officialResponseHtml}

            <div class="complaint-footer">
                <div class="voting-group">
                    <!-- Agree (Upvote) Button -->
                    <button class="vote-action-pill agree ${isAgree ? 'active' : ''} ${disableVoteClass}" ${clickEventLike} title="Agree with this issue">
                        <i class="fa-${isAgree ? 'solid' : 'regular'} fa-circle-check"></i>
                        <span>Agree</span>
                        <span class="vote-count">${item.upvoteCount || 0}</span>
                    </button>

                    <!-- Disagree (Downvote) Button -->
                    <button class="vote-action-pill disagree ${isDisagree ? 'active' : ''} ${disableVoteClass}" ${clickEventDislike} title="Disagree with this issue">
                        <i class="fa-${isDisagree ? 'solid' : 'regular'} fa-circle-xmark"></i>
                        <span>Disagree</span>
                        <span class="vote-count">${item.downvoteCount || 0}</span>
                    </button>

                    <!-- Comments count button -->
                    <button class="comment-btn">
                        <i class="fa-regular fa-comment"></i>
                        <span>${item.commentCount || 0}</span>
                    </button>
                </div>
                <div class="complaint-reference-id">${displayId}</div>
            </div>
        </div>
    `;
}

/* ==========================================================================
   6. VOTING (AGREE / DISAGREE) WITH 50+ ESCALATION LOGIC
   ========================================================================== */
async function castVote(complaintId, reactionType) {
    const item = complaintsList.find(c => c.id === complaintId);
    if (!item) return;

    if (item.userReaction === reactionType) {
        item.userReaction = null;
        if (reactionType === 'like') item.upvoteCount = Math.max(0, item.upvoteCount - 1);
        if (reactionType === 'dislike') item.downvoteCount = Math.max(0, item.downvoteCount - 1);
    } else {
        if (item.userReaction === 'like') item.upvoteCount = Math.max(0, item.upvoteCount - 1);
        if (item.userReaction === 'dislike') item.downvoteCount = Math.max(0, item.downvoteCount - 1);

        item.userReaction = reactionType;
        if (reactionType === 'like') {
            item.upvoteCount++;
        } else if (reactionType === 'dislike') {
            item.downvoteCount++;
        }
    }

    if (item.upvoteCount >= 1 && item.status === 'not_approved') {
        item.status = 'pending';
    } else if (item.upvoteCount < 1 && item.status === 'pending') {
        item.status = 'not_approved';
    }

    // BACKEND API INTEGRATION:
    // PUT /api/v1/complaints/{id}/reaction
    // Request Body: { "reaction": "like" | "dislike" | null }[cite: 1]
    try {
        if (typeof apiFetch === 'function') {
            await apiFetch(`/complaints/${complaintId}/reaction`, {
                method: 'PUT',
                body: JSON.stringify({ reaction: item.userReaction })
            });
        }
    } catch (e) {
        console.warn('Backend offline, reaction stored in client memory.');
    }

    computeStatsFromList();
    applyClientSideFilters();
}

/* ==========================================================================
   7. AUTHORITY STATUS UPDATE
   ========================================================================== */
async function updateComplaintStatus(complaintId, newStatus) {
    const target = complaintsList.find(c => c.id === complaintId);
    if (target) {
        target.status = newStatus;
        computeStatsFromList();
        applyClientSideFilters();
    }

    // BACKEND API INTEGRATION:
    // PATCH /api/v1/complaints/{id}/status
    // Request Body: { "status": "processing" | "handled" | "denied" }[cite: 1]
    try {
        if (typeof apiFetch === 'function') {
            await apiFetch(`/complaints/${complaintId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
        }
    } catch (e) {
        console.warn('Backend offline, status modified in client memory.');
    }
}

/* ==========================================================================
   8. SUBMIT NEW COMPLAINT
   ========================================================================== */
async function submitNewComplaint() {
    const title = document.getElementById('complaintTitle').value;
    const category = document.getElementById('complaintCategory').value;
    const location = document.getElementById('complaintLocation').value;
    const description = document.getElementById('complaintDescription').value;
    const isAnonymous = document.getElementById('isAnonymous').checked;
    const imgUrl = document.getElementById('complaintImage').value;

    const payload = {
        title,
        category: category || null,
        location: location || null,
        description,
        isAnonymous,
        imageUrls: imgUrl ? [imgUrl] : []
    };

    // BACKEND API INTEGRATION:
    // POST /api/v1/complaints
    try {
        if (typeof apiFetch === 'function') {
            const res = await apiFetch('/complaints', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res && res.ok) {
                const newComplaint = await res.json();
                complaintsList.unshift(newComplaint);
            }
        }
    } catch (err) {
        console.warn('Backend offline, could not submit complaint.');
    }

    document.getElementById('complaintModal').style.display = 'none';
    document.getElementById('fileComplaintForm').reset();
    computeStatsFromList();
    applyClientSideFilters();
}