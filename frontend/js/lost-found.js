document.addEventListener('DOMContentLoaded', async () => {
    // 1. Top Nav Integration & Profile
    await fetchUserProfile();

    // 2. Fetch Lost & Found Items
    await fetchLostFoundData('all', 'all');

    // 3. Filter Logic
    setupFilters();

    // 4. Report Modal Setup
    setupReportModal();
});

window.currentLoadedItems = [];

// ==========================================================================
// Local Storage Image Management for Lost & Found Posts
// ==========================================================================
const LF_LOCAL_IMAGES_KEY = 'campus360_lf_post_images';

function getLocalPostImages(postId) {
    if (!postId) return [];
    try {
        const map = JSON.parse(localStorage.getItem(LF_LOCAL_IMAGES_KEY) || '{}');
        const list = map[String(postId)];
        if (!list) return [];
        return Array.isArray(list) ? list : [list];
    } catch (e) {
        return [];
    }
}

function saveLocalPostImage(postId, imageUrl) {
    if (!postId || !imageUrl) return;
    try {
        const map = JSON.parse(localStorage.getItem(LF_LOCAL_IMAGES_KEY) || '{}');
        map[String(postId)] = [imageUrl];
        localStorage.setItem(LF_LOCAL_IMAGES_KEY, JSON.stringify(map));
    } catch (e) {
        console.warn('Could not save post image to localStorage:', e);
    }
}

function removeLocalPostImage(postId) {
    if (!postId) return;
    try {
        const map = JSON.parse(localStorage.getItem(LF_LOCAL_IMAGES_KEY) || '{}');
        delete map[String(postId)];
        localStorage.setItem(LF_LOCAL_IMAGES_KEY, JSON.stringify(map));
    } catch (e) {}
}

function processImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('Please select a valid image file (PNG, JPG, WEBP).'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize to max dimension of 800px to keep storage compact and ultra-fast
                const maxDim = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const compressedDataUrl = canvas.toDataURL(mimeType, 0.85);
                resolve({
                    dataUrl: compressedDataUrl,
                    fileName: file.name
                });
            };
            img.onerror = () => reject(new Error('Failed to process image.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
}

function getCurrentUserId() {
    if (window.currentUser && window.currentUser.id) {
        return Number(window.currentUser.id);
    }
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.sub) return Number(payload.sub);
        } catch (e) { }
    }
    return null;
}

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
            window.currentUser = user;
            const nameEl = document.getElementById('navName');
            if (nameEl) nameEl.textContent = user.fullName;
            const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const avatarEl = document.getElementById('navAvatar');
            if (avatarEl) avatarEl.textContent = initials;
        }
    } catch (err) {
        console.error('Failed to load user profile', err);
    }
}

async function fetchLostFoundData(kind, status) {
    const container = document.getElementById('lfFeedContainer');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>Loading items...</p></div>';

    let url = '/lost-found?size=25';
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
            window.currentLoadedItems = items;

            // Update stats
            updateStats(items);

            const countEl = document.getElementById('itemCount');
            if (countEl) countEl.textContent = page.totalElements || items.length;

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
    let resolvedCount = items.filter(i => i.status === 'found_and_returned' || i.status === 'returned_to_owner' || i.status === 'found' || i.status === 'resolved').length;

    const subEl = document.getElementById('statsSubtitle');
    if (subEl) subEl.textContent = `${lostCount} lost · ${foundCount} found · ${resolvedCount} resolved this month`;

    const pulseGrid = document.getElementById('lfPulseGrid');
    if (pulseGrid) {
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
    const currentUserId = getCurrentUserId();
    // Only the person who created the lost post can use the AI match feature
    const isOwner = Boolean(currentUserId && item.ownerId && Number(currentUserId) === Number(item.ownerId));

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
    } else if (item.status === 'found' || item.status === 'returned' || item.status === 'resolved' || item.status === 'found_and_returned') {
        statusPillClass = 'resolved';
        statusText = 'Resolved';
    } else {
        statusPillClass = 'missing';
        statusText = item.status || 'Unknown';
    }

    // Determine if user can edit
    let canEdit = isOwner;
    const token = localStorage.getItem('token');
    if (token && !canEdit) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const accountType = payload.accountType;
            if (accountType === 'AUTHORITY') {
                canEdit = true;
            }
        } catch (e) { }
    }

    let statusHtml = '';
    if (canEdit) {
        statusHtml = `
            <select class="status-select ${statusPillClass}" onchange="updateLostFoundStatus(${item.id}, this.value)" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-full); border: 1px solid var(--border-color); font-size: 0.85rem; font-weight: 600; cursor: pointer; outline: none;">
                <option value="not_found" ${item.status === 'not_found' ? 'selected' : ''}>Status: Still Missing</option>
                <option value="unclaimed" ${item.status === 'unclaimed' ? 'selected' : ''}>Status: Unclaimed</option>
                <option value="found" ${item.status === 'found' || item.status === 'resolved' ? 'selected' : ''}>Status: Resolved</option>
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

    // Image block: Resolve from localStorage first, fallback to item.imageUrls
    const localImgs = getLocalPostImages(item.id);
    let resolvedImage = null;
    if (localImgs && localImgs.length > 0) {
        resolvedImage = localImgs[0];
    } else if (item.imageUrls && item.imageUrls.length > 0) {
        resolvedImage = item.imageUrls[0];
        saveLocalPostImage(item.id, resolvedImage);
    }

    let imageHtml = '';
    if (resolvedImage) {
        imageHtml = `
            <div class="lf-image-container">
                <img src="${resolvedImage}" alt="${escapeHtml(item.title || 'Item image')}" onclick="openImageLightbox('${resolvedImage}')" style="cursor: pointer;" title="Click to view full image">
            </div>
        `;
    }

    // Small AI button: rendered ONLY for Lost posts AND ONLY for the author of that post
    const aiMatchButtonHtml = (isLost && isOwner) ? `
        <div class="lf-ai-action-wrapper">
            <button class="btn-ai-match" onclick="findPossibleMatches(${item.id})" id="aiMatchBtn-${item.id}">
                <i class="fa-solid fa-robot"></i> Find Possible Matches
            </button>
        </div>
    ` : '';

    return `
    <div class="lf-card" id="lf-post-${item.id}">
        <div class="lf-card-header">
            <div class="lf-user-info">
                <div class="lf-avatar ${avatarClass}">${initials}</div>
                <div class="lf-meta">
                    <h4>${escapeHtml(item.ownerName || 'Unknown User')}</h4>
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
                <h3>${escapeHtml(item.title || 'Untitled Item')}</h3>
                <p>${escapeHtml(item.description || '')}</p>
                ${item.lastKnownLocation ? `<div class="lf-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.lastKnownLocation)}</div>` : ''}
                ${aiMatchButtonHtml}
            </div>
            ${imageHtml}
        </div>
        
        <div class="lf-footer">
            ${statusHtml}
            
            <div class="post-actions" style="border:none; padding:0; gap:0.5rem; display:flex; align-items:center;">
                <button class="action-btn action-like-btn ${item.userReaction === 'like' ? 'active-like' : ''}" 
                        id="like-btn-${item.id}" 
                        onclick="toggleReaction(${item.id}, 'like')" 
                        title="Like">
                    <i class="${item.userReaction === 'like' ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
                    <span class="reaction-count" id="like-count-${item.id}">${item.likeCount || 0}</span>
                </button>
                <button class="action-btn action-dislike-btn ${item.userReaction === 'dislike' ? 'active-dislike' : ''}" 
                        id="dislike-btn-${item.id}" 
                        onclick="toggleReaction(${item.id}, 'dislike')" 
                        title="Dislike">
                    <i class="${item.userReaction === 'dislike' ? 'fa-solid' : 'fa-regular'} fa-thumbs-down"></i>
                    <span class="reaction-count" id="dislike-count-${item.id}">${item.dislikeCount || 0}</span>
                </button>
                <button class="action-btn action-comment-btn" 
                        id="comment-btn-${item.id}" 
                        onclick="toggleCommentsSection(${item.id})" 
                        title="Comments">
                    <i class="fa-regular fa-comment"></i>
                    <span class="comment-count" id="comment-count-${item.id}">${item.commentCount || 0}</span>
                </button>
                ${window.currentUser && (item.ownerId == window.currentUser.id || window.currentUser.role === 'ROLE_ADMIN' || window.currentUser.role === 'ROLE_SUPER_ADMIN') ?
            `<div style="position:relative; display:inline-block; margin-left:auto;">
                    <button class="action-btn" onclick="toggleDropdown(event, 'lf-dropdown-${item.id}')"><i class="fa-solid fa-ellipsis"></i></button>
                    <div id="lf-dropdown-${item.id}" class="profile-dropdown-menu" style="display:none; position:absolute; bottom:100%; right:0; background:white; border:1px solid var(--border-color); border-radius:8px; box-shadow:var(--shadow-sm); min-width:120px; z-index:100; padding:0.5rem 0;">
                        <a href="#" onclick="deleteLostFoundPost(${item.id}, this); return false;" style="display:block; padding:0.5rem 1rem; color:#ef4444; text-decoration:none;"><i class="fas fa-trash"></i> Delete</a>
                    </div>
                </div>` :
            `<button class="action-btn" style="margin-left:auto;" onclick="alert('You do not have permission to delete this post.')"><i class="fa-solid fa-ellipsis"></i></button>`
        }
            </div>
        </div>

        <!-- Inline Comments Section -->
        <div class="lf-comments-section" id="comments-section-${item.id}" style="display: none;">
            <div class="lf-comments-header">
                <h5><i class="fa-regular fa-comments" style="color: #6366f1;"></i> Comments (<span id="comments-header-count-${item.id}">${item.commentCount || 0}</span>)</h5>
            </div>
            <div class="lf-comments-list" id="comments-list-${item.id}">
                <div class="comments-loading" style="text-align: center; color: #94a3b8; font-size: 0.8rem; padding: 0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>
            </div>
            <form class="lf-comment-form" onsubmit="submitComment(event, ${item.id})">
                <input type="text" id="comment-input-${item.id}" placeholder="Write a comment or helpful info..." required autocomplete="off">
                <button type="submit" class="btn-send-comment"><i class="fa-solid fa-paper-plane"></i> Post</button>
            </form>
        </div>
    </div>
    `;
}

// ==========================================================================
// AI-Powered Lost & Found Matching
// ==========================================================================

async function findPossibleMatches(postId) {
    const modal = document.getElementById('aiMatchesModal');
    const banner = document.getElementById('aiMatchesTargetBanner');
    const loading = document.getElementById('aiMatchesLoading');
    const empty = document.getElementById('aiMatchesEmpty');
    const emptyMsg = document.getElementById('aiMatchesEmptyMsg');
    const list = document.getElementById('aiMatchesList');
    const engineLabel = document.getElementById('aiEngineLabel');

    if (!modal) return;

    // Verify authorship on client side
    const targetItem = (window.currentLoadedItems || []).find(i => i.id === postId);
    const currentUserId = getCurrentUserId();
    if (targetItem && targetItem.ownerId && currentUserId && Number(targetItem.ownerId) !== Number(currentUserId)) {
        alert("Only the person who posted this Lost item can use the AI match feature.");
        return;
    }

    modal.classList.add('active');

    // Display target item header banner
    if (targetItem && banner) {
        banner.style.display = 'block';
        banner.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-weight: 700; color: #4338ca;"><i class="fa-solid fa-crosshairs"></i> Your Lost Item:</span>
                    <strong>${escapeHtml(targetItem.title)}</strong>
                </div>
                <div style="font-size: 0.8rem; color: #64748b;">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(targetItem.lastKnownLocation || 'Campus')}
                </div>
            </div>
        `;
    } else if (banner) {
        banner.style.display = 'none';
    }

    loading.style.display = 'block';
    empty.style.display = 'none';
    list.innerHTML = '';
    if (engineLabel) engineLabel.textContent = 'Comparing reports with Gemini AI...';

    try {
        const res = await apiFetch(`/lost-found/${postId}/matches`);
        if (!res || !res.ok) {
            if (res && res.status === 403) {
                throw new Error("Only the author of this Lost post can use the AI match feature.");
            }
            throw new Error(`Server returned status: ${res ? res.status : 'error'}`);
        }

        const data = await res.json();
        loading.style.display = 'none';

        if (engineLabel) {
            engineLabel.textContent = data.poweredBy ? `Powered by ${data.poweredBy}` : 'Powered by Gemini AI';
        }

        const matches = data.matches || [];
        if (matches.length === 0) {
            empty.style.display = 'block';
            if (emptyMsg) {
                emptyMsg.textContent = data.message || 'We examined all active Found posts, but found no items with strong overlapping characteristics at this time.';
            }
            return;
        }

        // Render ranked matches
        list.innerHTML = matches.map(m => renderMatchCard(m)).join('');

    } catch (err) {
        console.error('AI matching error:', err);
        loading.style.display = 'none';
        empty.style.display = 'block';
        if (emptyMsg) {
            emptyMsg.textContent = err.message || 'Unable to evaluate matches at this moment. Please try again shortly.';
        }
    }
}

function renderMatchCard(m) {
    const found = m.foundPost || {};
    const percent = Math.round((m.confidence || 0.5) * 100);
    const level = (m.matchLevel || 'POSSIBLE').toUpperCase();

    let badgeClass = 'possible';
    let levelText = 'Possible Match';
    let cardBorderClass = 'possible-match';

    if (level === 'STRONG' || percent >= 80) {
        badgeClass = 'strong';
        levelText = 'Strong Match';
        cardBorderClass = 'strong-match';
    } else if (level === 'WEAK' || percent < 50) {
        badgeClass = 'weak';
        levelText = 'Low Match';
        cardBorderClass = 'weak-match';
    }

    const title = found.title || `Found Item #${m.postId}`;
    const location = found.lastKnownLocation ? `Found near ${escapeHtml(found.lastKnownLocation)}` : 'Found on campus';
    const foundLocalImgs = getLocalPostImages(found.id || m.postId);
    const foundImgs = (foundLocalImgs && foundLocalImgs.length > 0) ? foundLocalImgs : (found.imageUrls || []);
    const hasThumb = foundImgs && foundImgs.length > 0;
    const thumbHtml = hasThumb ? `<img src="${foundImgs[0]}" alt="${escapeHtml(title)}" class="match-card-thumb" onclick="openImageLightbox('${foundImgs[0]}')" style="cursor: pointer;" title="Click to view full image">` : '';

    const matchingTagsHtml = (m.matchingPoints || []).map(pt => 
        `<span class="tag-point tag-match"><i class="fa-solid fa-check"></i> ${escapeHtml(pt)}</span>`
    ).join('');

    const conflictingTagsHtml = (m.conflictingPoints || []).map(pt => 
        `<span class="tag-point tag-conflict"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(pt)}</span>`
    ).join('');

    return `
    <div class="ai-match-card ${cardBorderClass}">
        <div class="match-header-row">
            <span class="match-badge ${badgeClass}">
                <i class="fa-solid fa-${badgeClass === 'strong' ? 'sparkles' : 'circle-check'}"></i> ${percent}% — ${levelText}
            </span>
            <span style="font-size: 0.78rem; color: #94a3b8; font-weight: 500;">
                #LF-${m.postId}
            </span>
        </div>

        <div class="match-card-main">
            <div class="match-card-content">
                <h4 class="match-card-title">${escapeHtml(title)}</h4>
                <div class="match-card-loc">
                    <i class="fa-solid fa-location-dot"></i> ${location}
                </div>
            </div>
            ${thumbHtml}
        </div>

        ${matchingTagsHtml || conflictingTagsHtml ? `
        <div class="match-points-grid">
            ${matchingTagsHtml}
            ${conflictingTagsHtml}
        </div>
        ` : ''}

        ${m.explanation ? `
        <p class="match-explanation">${escapeHtml(m.explanation)}</p>
        ` : ''}

        <div class="match-action-row">
            <button class="btn-view-post" onclick="goToPost(${m.postId})" title="Navigate to this post in feed">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> View Post
            </button>
        </div>
    </div>
    `;
}

// Navigates directly to the found post in the feed with smooth scrolling and highlight animation
async function goToPost(foundId) {
    // 1. Close the AI matches modal
    closeAiMatchesModal();

    let targetEl = document.getElementById(`lf-post-${foundId}`);

    // If the post is not currently visible in the DOM (e.g. user was filtering by 'Lost' only)
    if (!targetEl) {
        // Reset filter toggles to 'all' so found items become visible
        document.querySelectorAll('#kindFilterGroup .lf-toggle').forEach(b => {
            if (b.dataset.kind === 'all') b.classList.add('active');
            else b.classList.remove('active');
        });
        document.querySelectorAll('#statusFilterGroup .lf-toggle').forEach(b => {
            if (b.dataset.status === 'all') b.classList.add('active');
            else b.classList.remove('active');
        });

        // Re-fetch all items
        await fetchLostFoundData('all', 'all');
        targetEl = document.getElementById(`lf-post-${foundId}`);
    }

    // If still not in feed (e.g. beyond current page limit), fetch post individually and inject
    if (!targetEl) {
        try {
            const res = await apiFetch(`/lost-found/${foundId}`);
            if (res && res.ok) {
                const singlePost = await res.json();
                const container = document.getElementById('lfFeedContainer');
                if (container) {
                    const cardHtml = createLFCard(singlePost);
                    container.insertAdjacentHTML('afterbegin', cardHtml);
                    targetEl = document.getElementById(`lf-post-${foundId}`);
                }
            }
        } catch (e) {
            console.error('Could not fetch post to navigate to:', e);
        }
    }

    if (targetEl) {
        // Smoothly scroll the page right to the found post card
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Trigger distinct visual glow animation
        targetEl.classList.remove('lf-card-highlighted');
        void targetEl.offsetWidth; // force browser layout reflow
        targetEl.classList.add('lf-card-highlighted');
        setTimeout(() => {
            targetEl.classList.remove('lf-card-highlighted');
        }, 3000);
    } else {
        alert(`Found Post #${foundId} could not be located.`);
    }
}

async function viewFoundPostDetails(foundId) {
    const detailModal = document.getElementById('postDetailModal');
    const detailBody = document.getElementById('postDetailBody');
    const detailTitle = document.getElementById('detailPostTitle');
    const detailSubtitle = document.getElementById('detailPostSubtitle');

    if (!detailModal || !detailBody) return;

    detailTitle.textContent = 'Loading...';
    detailSubtitle.textContent = `Found Post #${foundId}`;
    detailBody.innerHTML = '<div style="text-align:center; padding:1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading details...</div>';
    detailModal.classList.add('active');

    try {
        const res = await apiFetch(`/lost-found/${foundId}`);
        if (!res || !res.ok) throw new Error('Failed to fetch post details');

        const post = await res.json();
        detailTitle.textContent = post.title || 'Found Item';
        detailSubtitle.textContent = `Reported by ${post.ownerName || 'Student'} · ${timeAgo(post.createdAt)}`;

        let imgHtml = '';
        const localImgs = getLocalPostImages(foundId);
        const resolvedImgs = (localImgs && localImgs.length > 0) ? localImgs : (post.imageUrls || []);
        if (resolvedImgs.length > 0) {
            imgHtml = `
            <div style="margin: 0.8rem 0; text-align: center;">
                <img src="${resolvedImgs[0]}" alt="${escapeHtml(post.title)}" onclick="openImageLightbox('${resolvedImgs[0]}')" style="max-width: 100%; max-height: 240px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; cursor: pointer;" title="Click to view full image">
            </div>`;
        }

        detailBody.innerHTML = `
            ${imgHtml}
            <div style="background: #f8fafc; padding: 0.85rem; border-radius: 8px; margin-bottom: 0.9rem; border: 1px solid #e2e8f0;">
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 0.25rem;"><i class="fa-solid fa-align-left" style="color: #6366f1;"></i> Description</div>
                <div style="color: #475569;">${escapeHtml(post.description || 'No description provided')}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.9rem;">
                <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 8px;">
                    <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Location Found</div>
                    <div style="font-weight: 600; color: #1e293b; margin-top: 0.2rem;"><i class="fa-solid fa-location-dot" style="color: #f59e0b;"></i> ${escapeHtml(post.lastKnownLocation || 'Campus')}</div>
                </div>
                <div style="background: #f1f5f9; padding: 0.65rem 0.85rem; border-radius: 8px;">
                    <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Status</div>
                    <div style="font-weight: 600; color: #10b981; margin-top: 0.2rem;"><i class="fa-solid fa-circle-check"></i> ${post.status === 'not_found' ? 'Available / Unclaimed' : post.status}</div>
                </div>
            </div>
            <div style="font-size: 0.82rem; color: #64748b; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 0.6rem 0.8rem;">
                <i class="fa-solid fa-shield-halved" style="color: #059669;"></i> <strong>Safety Note:</strong> Please arrange to meet in a public campus location (such as the campus library or student desk) to verify and collect your item.
            </div>
        `;
    } catch (e) {
        detailBody.innerHTML = '<p style="color:#ef4444; padding:1rem;">Failed to load post details.</p>';
    }
}

function closeAiMatchesModal() {
    const modal = document.getElementById('aiMatchesModal');
    if (modal) modal.classList.remove('active');
}

function closePostDetailModal() {
    const modal = document.getElementById('postDetailModal');
    if (modal) modal.classList.remove('active');
}

// ==========================================================================
// Report Modal & Post Management
// ==========================================================================

function setupReportModal() {
    const openBtn = document.getElementById('openReportModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelReportBtn');
    const modal = document.getElementById('reportModal');
    const form = document.getElementById('reportForm');
    const addImageBtn = document.getElementById('addImageBtn');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('imagePreviewContainer');

    let selectedImage = null; // { dataUrl, fileName }

    function renderImagePreview() {
        if (!previewContainer) return;
        if (!selectedImage) {
            previewContainer.innerHTML = '';
            return;
        }

        previewContainer.innerHTML = `
            <div class="image-preview-item">
                <img src="${selectedImage.dataUrl}" alt="Selected picture" class="image-preview" onclick="openImageLightbox('${selectedImage.dataUrl}')" style="cursor: pointer;" title="Click to view full preview">
                <button type="button" class="btn-remove-img" id="removeSelectedImgBtn" title="Remove picture">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <span class="preview-filename" title="${escapeHtml(selectedImage.fileName)}">${escapeHtml(selectedImage.fileName)}</span>
            </div>
        `;

        const removeBtn = document.getElementById('removeSelectedImgBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedImage = null;
                if (imageInput) imageInput.value = '';
                renderImagePreview();
            });
        }
    }

    function resetModalForm() {
        selectedImage = null;
        if (imageInput) imageInput.value = '';
        renderImagePreview();
        if (form) form.reset();
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        const defaultTypeBtn = document.querySelector('.type-btn[data-type="lost"]');
        if (defaultTypeBtn) defaultTypeBtn.classList.add('active');
        selectedType = 'lost';
    }

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            resetModalForm();
            modal.classList.add('active');
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            resetModalForm();
        });
    }
    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            resetModalForm();
        });
    }

    if (addImageBtn && imageInput) {
        addImageBtn.addEventListener('click', () => {
            imageInput.click();
        });

        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            try {
                selectedImage = await processImageFile(file);
                renderImagePreview();
            } catch (err) {
                alert(err.message || 'Error processing selected image.');
            }
        });
    }

    // Item Type Toggle in modal
    let selectedType = 'lost';
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedType = e.currentTarget.dataset.type;
        });
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('reportItemName').value.trim();
            const description = document.getElementById('reportDescription').value.trim();
            const location = document.getElementById('reportLocation').value.trim();

            if (!title || !description || !location) {
                alert('Please fill in all required fields.');
                return;
            }

            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn ? submitBtn.innerHTML : 'Submit Report';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            }

            try {
                const payload = {
                    postKind: selectedType,
                    title: title,
                    description: description,
                    lastKnownLocation: location,
                    imageUrls: selectedImage ? [selectedImage.dataUrl] : []
                };

                const res = await apiFetch('/lost-found', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                if (res && res.ok) {
                    const savedPost = await res.json();
                    if (selectedImage && savedPost && savedPost.id) {
                        saveLocalPostImage(savedPost.id, selectedImage.dataUrl);
                    }
                    modal.classList.remove('active');
                    resetModalForm();
                    fetchLostFoundData('all', 'all');
                } else {
                    const err = await res.json();
                    alert(err.message || 'Failed to submit report.');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while submitting the report.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }
}

async function updateLostFoundStatus(postId, newStatus) {
    try {
        const res = await apiFetch(`/lost-found/${postId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        if (res && res.ok) {
            fetchLostFoundData('all', 'all');
        } else {
            alert('Failed to update post status.');
        }
    } catch (e) {
        console.error(e);
        alert('Network error updating post status.');
    }
}

async function deleteLostFoundPost(postId, el) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
        const res = await apiFetch(`/lost-found/${postId}`, {
            method: 'DELETE'
        });
        if (res && res.ok) {
            removeLocalPostImage(postId);
            const card = document.getElementById(`lf-post-${postId}`);
            if (card) card.remove();
            else fetchLostFoundData('all', 'all');
        } else {
            alert('Failed to delete post.');
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting post.');
    }
}

// Utility
function timeAgo(dateString) {
    if (!dateString) return 'Recently';
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================================================
// Post Reactions (Like / Dislike)
// ==========================================================================

async function toggleReaction(postId, reactionType) {
    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const dislikeBtn = document.getElementById(`dislike-btn-${postId}`);
    const likeCountEl = document.getElementById(`like-count-${postId}`);
    const dislikeCountEl = document.getElementById(`dislike-count-${postId}`);

    try {
        const res = await apiFetch(`/lost-found/${postId}/reaction`, {
            method: 'PUT',
            body: JSON.stringify({ reaction: reactionType })
        });

        if (res && res.ok) {
            const data = await res.json();
            if (likeCountEl) likeCountEl.textContent = data.likeCount;
            if (dislikeCountEl) dislikeCountEl.textContent = data.dislikeCount;

            // Update like button state
            if (likeBtn) {
                if (data.userReaction === 'like') {
                    likeBtn.classList.add('active-like');
                    const icon = likeBtn.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-thumbs-up';
                } else {
                    likeBtn.classList.remove('active-like');
                    const icon = likeBtn.querySelector('i');
                    if (icon) icon.className = 'fa-regular fa-thumbs-up';
                }
            }

            // Update dislike button state
            if (dislikeBtn) {
                if (data.userReaction === 'dislike') {
                    dislikeBtn.classList.add('active-dislike');
                    const icon = dislikeBtn.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-thumbs-down';
                } else {
                    dislikeBtn.classList.remove('active-dislike');
                    const icon = dislikeBtn.querySelector('i');
                    if (icon) icon.className = 'fa-regular fa-thumbs-down';
                }
            }
        }
    } catch (err) {
        console.error('Failed to update reaction:', err);
    }
}

// ==========================================================================
// Post Comments
// ==========================================================================

async function toggleCommentsSection(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    if (!section) return;

    if (section.style.display === 'none' || !section.style.display) {
        section.style.display = 'block';
        await loadComments(postId);
    } else {
        section.style.display = 'none';
    }
}

async function loadComments(postId) {
    const listEl = document.getElementById(`comments-list-${postId}`);
    const countEl = document.getElementById(`comments-header-count-${postId}`);
    const btnCountEl = document.getElementById(`comment-count-${postId}`);
    if (!listEl) return;

    try {
        const res = await apiFetch(`/lost-found/${postId}/comments`);
        if (res && res.ok) {
            const comments = await res.json();
            if (countEl) countEl.textContent = comments.length;
            if (btnCountEl) btnCountEl.textContent = comments.length;

            if (comments.length === 0) {
                listEl.innerHTML = '<div class="comments-empty">No comments yet. Be the first to help out!</div>';
                return;
            }

            listEl.innerHTML = comments.map(c => {
                const initials = c.commenterName ? c.commenterName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                return `
                <div class="comment-bubble">
                    <div class="comment-avatar">${initials}</div>
                    <div class="comment-body">
                        <div class="comment-author-row">
                            <span class="comment-author-name">${escapeHtml(c.commenterName || 'Student')}</span>
                            <span class="comment-time">${timeAgo(c.createdAt)}</span>
                        </div>
                        <div class="comment-text">${escapeHtml(c.commentText)}</div>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            listEl.innerHTML = '<div class="comments-empty" style="color: #ef4444;">Failed to load comments.</div>';
        }
    } catch (e) {
        console.error('Error loading comments:', e);
        listEl.innerHTML = '<div class="comments-empty" style="color: #ef4444;">Error loading comments.</div>';
    }
}

async function submitComment(e, postId) {
    e.preventDefault();
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = '';

    try {
        const res = await apiFetch(`/lost-found/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ commentText: text })
        });

        if (res && res.ok) {
            await loadComments(postId);
        } else {
            alert('Failed to post comment.');
        }
    } catch (err) {
        console.error('Failed to add comment:', err);
        alert('Error posting comment.');
    }
}

function openImageLightbox(imgSrc) {
    if (!imgSrc) return;
    const modal = document.getElementById('lfImageLightboxModal');
    const img = document.getElementById('lfLightboxImg');
    if (modal && img) {
        img.src = imgSrc;
        modal.style.display = 'flex';
    }
}

function closeImageLightboxModal() {
    const modal = document.getElementById('lfImageLightboxModal');
    if (modal) modal.style.display = 'none';
}

window.toggleDropdown = function (event, id) {
    if (event) event.stopPropagation();
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.findPossibleMatches = findPossibleMatches;
window.goToPost = goToPost;
window.closeAiMatchesModal = closeAiMatchesModal;
window.viewFoundPostDetails = viewFoundPostDetails;
window.closePostDetailModal = closePostDetailModal;
window.updateLostFoundStatus = updateLostFoundStatus;
window.deleteLostFoundPost = deleteLostFoundPost;
window.getCurrentUserId = getCurrentUserId;
window.toggleReaction = toggleReaction;
window.toggleCommentsSection = toggleCommentsSection;
window.submitComment = submitComment;
window.openImageLightbox = openImageLightbox;
window.closeImageLightboxModal = closeImageLightboxModal;
window.getLocalPostImages = getLocalPostImages;
window.saveLocalPostImage = saveLocalPostImage;
window.removeLocalPostImage = removeLocalPostImage;

