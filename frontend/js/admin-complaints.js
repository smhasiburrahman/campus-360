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

    let uploadedComplaintImage = null;

    if (openModalBtn) openModalBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        uploadedComplaintImage = null;
        document.getElementById('complaintImagePreview').innerHTML = '';
    });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => modal.style.display = 'none');

    const dupModal = document.getElementById('duplicateModal');
    if (document.getElementById('closeDuplicateModalBtn')) {
        document.getElementById('closeDuplicateModalBtn').addEventListener('click', () => dupModal.style.display = 'none');
    }
    if (document.getElementById('cancelDuplicateBtn')) {
        document.getElementById('cancelDuplicateBtn').addEventListener('click', () => dupModal.style.display = 'none');
    }
    if (document.getElementById('overrideDuplicateBtn')) {
        document.getElementById('overrideDuplicateBtn').addEventListener('click', async () => {
            dupModal.style.display = 'none';
            await proceedWithSubmission();
        });
    }

    // Image Upload Logic
    const imageUploadInput = document.getElementById('complaintImageUpload');
    const imagePreviewContainer = document.getElementById('complaintImagePreview');
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];

                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.opacity = '0.5';
                imagePreviewContainer.innerHTML = '';
                imagePreviewContainer.appendChild(img);

                const formData = new FormData();
                formData.append('file', file);

                try {
                    const res = await apiFetch('/materials/upload', {
                        method: 'POST',
                        body: formData
                    });

                    if (res.ok) {
                        const data = await res.json();
                        uploadedComplaintImage = 'http://localhost:8080' + data.fileUrl;
                        img.src = uploadedComplaintImage;
                        img.style.opacity = '1';
                    } else {
                        alert('Failed to upload image.');
                        img.remove();
                        uploadedComplaintImage = null;
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                    alert('An error occurred during image upload.');
                    img.remove();
                    uploadedComplaintImage = null;
                }
            }
        });
    }

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

    // Update Top Departments list
    const deptMap = {};
    complaintsList.forEach(c => {
        if (c.department) {
            deptMap[c.department] = (deptMap[c.department] || 0) + 1;
        }
    });

    const deptList = document.getElementById('departmentsList');
    if (deptList) {
        deptList.innerHTML = Object.keys(deptMap).map(dept => `
            <div class="category-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>🤖 ${dept}</span>
                <strong>${deptMap[dept]}</strong>
            </div>
        `).join('');
    }
    
    // Populate Department Select Dropdown
    const deptSelect = document.getElementById('departmentSelect');
    if (deptSelect) {
        const currentVal = deptSelect.value;
        deptSelect.innerHTML = '<option value="ALL">All Departments</option>' + Object.keys(deptMap).map(dept => `<option value="${dept}">${dept}</option>`).join('');
        deptSelect.value = currentVal;
        
        if (!deptSelect.hasAttribute('data-bound')) {
            deptSelect.setAttribute('data-bound', 'true');
            deptSelect.addEventListener('change', () => {
                applyClientSideFilters();
            });
        }
    }
}

/* ==========================================================================
   5. FILTERING & RENDERING
   ========================================================================== */
function applyClientSideFilters() {
    // Only show escalated complaints to admin
    let filtered = complaintsList.filter(item => item.status !== 'not_approved');

    if (activeStatusFilter !== 'ALL') {
        filtered = filtered.filter(item => item.status === activeStatusFilter);
    }
    
    const deptSelect = document.getElementById('departmentSelect');
    if (deptSelect && deptSelect.value !== 'ALL') {
        filtered = filtered.filter(item => item.department === deptSelect.value);
    }

    const query = (document.getElementById('complaintSearchInput')?.value || '').toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(item =>
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query))
        );
    }

    const sortVal = document.getElementById('sortOrderSelect')?.value;
    const priorityOrder = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortVal === 'most_voted') {
        filtered.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
    } else {
        // default to priority
        filtered.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
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
                ${item.department ? `<span class="badge-tag" style="background: var(--bg-tertiary); color: var(--primary); border: 1px solid var(--primary-light);">🤖 Dept: ${item.department}</span>` : ''}
                ${item.priority ? `<span class="badge-tag" style="background: var(--bg-tertiary); color: var(--danger); border: 1px solid var(--danger-light);">⚡ Priority: ${item.priority}</span>` : ''}
            </div>

            <h3 class="complaint-title">${item.title || 'Untitled Issue'}</h3>
            <p class="complaint-desc">${item.description}</p>
            ${item.location ? `<div class="complaint-location"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>` : ''}

            ${mediaHtml}
            ${officialResponseHtml}

            <div class="complaint-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <div class="voting-group">
                    <span style="font-weight: bold; color: var(--text-color); margin-right: 15px;"><i class="fa-solid fa-arrow-up"></i> ${item.upvoteCount || 0} Upvotes</span>
                    <!-- Comments count button -->
                    <button class="comment-btn" id="comment-btn-${item.id}" onclick="toggleComments(${item.id})">
                        <i class="fa-regular fa-comment"></i>
                        <span id="comment-count-${item.id}">${item.commentCount || 0}</span>
                    </button>
                </div>
                
                <div class="admin-reply-box" style="display: flex; gap: 10px;">
                    <input type="text" id="adminReply-${item.id}" placeholder="Type official response..." style="padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.8rem;" value="${item.officialResponse || ''}">
                    <button onclick="submitOfficialResponse(${item.id})" style="padding: 6px 12px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">Post Reply</button>
                </div>
                <div class="complaint-reference-id">${displayId}</div>
            </div>
            
            <!-- Comments Section (Hidden by default) -->
            <div class="comments-section" id="comments-section-${item.id}" style="display: none; border-top: 1px solid var(--border-color); padding: 15px; background: var(--bg-secondary); border-radius: 0 0 12px 12px; margin-top: 15px;">
                <div class="comments-header" style="margin-bottom: 15px; font-weight: bold; color: var(--text-color);">
                    <h5><i class="fa-regular fa-comments" style="color: var(--primary-color);"></i> Comments (<span id="comments-header-count-${item.id}">${item.commentCount || 0}</span>)</h5>
                </div>
                
                <div class="comments-list" id="comments-list-${item.id}" style="display: flex; flex-direction: column; gap: 10px; max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                    <div class="comments-loading" style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>
                </div>
                
                <form class="comment-form" onsubmit="submitComment(event, ${item.id})" style="display: flex; gap: 10px;">
                    <input type="text" id="comment-input-${item.id}" placeholder="Write a comment..." required autocomplete="off" style="flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.9rem; background: var(--bg-tertiary); color: var(--text-color);">
                    <button type="submit" style="background: var(--primary-color); color: white; border: none; border-radius: 20px; padding: 0 15px; font-weight: bold; cursor: pointer;"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
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

window.submitOfficialResponse = async function(complaintId) {
    const inputEl = document.getElementById(`adminReply-${complaintId}`);
    if (!inputEl) return;
    
    const replyText = inputEl.value.trim();
    if (!replyText) {
        alert("Please enter a response.");
        return;
    }
    
    const target = complaintsList.find(c => c.id === complaintId);
    if (!target) return;
    
    // Default to handling the complaint if they reply, unless it's already denied/handled
    let newStatus = target.status;
    if (newStatus === 'pending' || newStatus === 'processing') {
        newStatus = 'handled';
    }

    try {
        if (typeof apiFetch === 'function') {
            const res = await apiFetch(`/complaints/${complaintId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    status: newStatus,
                    officialResponse: replyText 
                })
            });
            if (res && res.ok) {
                alert("Official response posted successfully!");
                inputEl.value = "";
                // Refresh list so they see the updated status/comments
                await fetchComplaints();
            } else {
                alert("Failed to post official response.");
            }
        }
    } catch (e) {
        console.error("Error submitting response", e);
        alert("Error posting official response.");
    }
}

/* ==========================================================================
   8. SUBMIT NEW COMPLAINT & DEDUPLICATION
   ========================================================================== */
let pendingComplaintPayload = null;

async function submitNewComplaint() {
    const title = document.getElementById('complaintTitle').value;
    const category = document.getElementById('complaintCategory').value;
    const location = document.getElementById('complaintLocation').value;
    const description = document.getElementById('complaintDescription').value;
    const isAnonymous = document.getElementById('isAnonymous').checked;

    const previewImg = document.querySelector('#complaintImagePreview img');
    let imgUrl = null;
    if (previewImg && previewImg.style.opacity === '1') {
        imgUrl = previewImg.src;
    }

    pendingComplaintPayload = {
        title,
        category: category || null,
        location: location || null,
        description,
        isAnonymous,
        imageUrls: imgUrl ? [imgUrl] : []
    };

    // 1. Check for duplicates
    try {
        if (typeof apiFetch === 'function') {
            const checkRes = await apiFetch('/complaints/check-duplicate', {
                method: 'POST',
                body: JSON.stringify({ text: title + " " + description })
            });
            if (checkRes && checkRes.ok) {
                const data = await checkRes.json();
                if (data.hasDuplicates && data.duplicates && data.duplicates.length > 0) {
                    showDuplicateModal(data.duplicates);
                    return; // Stop flow here
                }
            }
        }
    } catch (e) {
        console.warn('Duplicate check failed, proceeding with submission', e);
    }

    // 2. If no duplicates, proceed
    await proceedWithSubmission();
}

function showDuplicateModal(duplicates) {
    const listContainer = document.getElementById('duplicateList');
    
    listContainer.innerHTML = duplicates.map(d => `
        <div style="border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="margin: 0; color: var(--text-color);">${d.title}</h4>
                <p style="margin: 5px 0 0; font-size: 0.9rem; color: var(--text-muted);">${d.description.substring(0, 100)}...</p>
                <small style="color: var(--primary-color); font-weight: bold;">${d.upvoteCount || 0} Upvotes</small>
            </div>
            <button type="button" class="btn-submit" onclick="upvoteAndDiscard(${d.id})" style="padding: 5px 15px; font-size: 0.9rem; background: var(--primary-color);">
                Upvote Instead
            </button>
        </div>
    `).join('');

    document.getElementById('duplicateModal').style.display = 'flex';
}

window.upvoteAndDiscard = async function(existingComplaintId) {
    document.getElementById('duplicateModal').style.display = 'none';
    document.getElementById('complaintModal').style.display = 'none';
    document.getElementById('fileComplaintForm').reset();
    
    // Trigger upvote directly
    await castVote(existingComplaintId, 'like');
    alert("Thanks! You've upvoted the existing complaint.");
};

async function proceedWithSubmission() {
    if (!pendingComplaintPayload) return;

    // BACKEND API INTEGRATION:
    // POST /api/v1/complaints
    try {
        if (typeof apiFetch === 'function') {
            const res = await apiFetch('/complaints', {
                method: 'POST',
                body: JSON.stringify(pendingComplaintPayload)
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
    pendingComplaintPayload = null;
    computeStatsFromList();
    applyClientSideFilters();
}

/* ==========================================================================
   9. COMMENTS LOGIC
   ========================================================================== */
window.toggleComments = function(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    if (!section) return;

    if (section.style.display === 'none') {
        section.style.display = 'block';
        fetchComments(postId);
    } else {
        section.style.display = 'none';
    }
}

window.fetchComments = async function(postId) {
    const listEl = document.getElementById(`comments-list-${postId}`);
    const countEl = document.getElementById(`comments-header-count-${postId}`);
    const btnCountEl = document.getElementById(`comment-count-${postId}`);
    if (!listEl) return;

    listEl.innerHTML = '<div class="comments-loading" style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>';

    try {
        const res = await apiFetch(`/complaints/${postId}/comments`);
        if (res && res.ok) {
            const comments = await res.json();
            if (countEl) countEl.textContent = comments.length;
            if (btnCountEl) btnCountEl.textContent = comments.length;

            if (comments.length === 0) {
                listEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 10px;">No comments yet.</div>';
                return;
            }

            listEl.innerHTML = comments.map(c => {
                const initials = c.commenterName ? c.commenterName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                const isAuthority = c.commenterType === 'authority';
                
                const bubbleStyle = isAuthority 
                    ? 'background: var(--primary-light, #e0e7ff); border: 1px solid var(--primary-color); border-left: 4px solid var(--primary-color); padding: 10px; border-radius: 8px;' 
                    : 'background: var(--bg-primary); border: 1px solid var(--border-color); padding: 10px; border-radius: 8px;';
                
                const titleBadge = isAuthority ? '<span style="background: var(--primary-color); color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px; font-weight: bold;">OFFICIAL RESPONSE</span>' : '';

                return `
                <div style="display: flex; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; flex-shrink: 0;">${initials}</div>
                    <div style="${bubbleStyle} flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-weight: bold; font-size: 0.85rem;">${escapeHtml(c.commenterName || 'Unknown')} ${titleBadge}</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted);">${timeAgo(c.createdAt)}</span>
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-color);">${escapeHtml(c.commentText)}</div>
                    </div>
                </div>
                `;
            }).join('');
            
            listEl.scrollTop = listEl.scrollHeight;
        } else {
            listEl.innerHTML = '<div style="color: var(--danger);">Failed to load comments.</div>';
        }
    } catch (e) {
        console.error('Error loading comments:', e);
        listEl.innerHTML = '<div style="color: var(--danger);">Error loading comments.</div>';
    }
}

window.submitComment = async function(event, postId) {
    event.preventDefault();
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await apiFetch(`/complaints/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ commentText: text })
        });

        if (res && res.ok) {
            input.value = '';
            await fetchComments(postId);
        } else {
            alert('Failed to post comment.');
        }
    } catch (err) {
        console.error('Failed to add comment:', err);
        alert('Error posting comment.');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + 'm ago';
    if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + 'h ago';
    if (diffInSeconds < 604800) return Math.floor(diffInSeconds / 86400) + 'd ago';
    return date.toLocaleDateString();
}