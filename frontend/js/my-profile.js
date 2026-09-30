/**
 * my-profile.js - Fully functional Student Profile Management for Campus 360
 * Handles:
 * 1. Fetching & rendering student profile details, stats, and real post/bookmark counts
 * 2. Editing profile via dedicated Modal Dialog (#editProfileModal) with PUT /api/v1/students/me
 * 3. Avatar photo upload (local file reader -> base64) & URL input with real-time modal preview
 * 4. Balanced Tab navigation (My Posts, Bookmarks, About) with equal width & height consistency
 * 5. Fetching real user posts across modules (Lost & Found, Marketplace, Materials, Complaints, Study Zone)
 * 6. Dual Filter chips for My Posts & Bookmarks + in-page search
 * 7. Managing posts (View shortcut, Delete own post)
 * 8. Managing bookmarks (View shortcut, Unbookmark with instant UI sync)
 * 9. Blood Hero donor integration & Topbar sync
 */

let currentStudent = null;
let allDepartments = [];
let currentFilterType = 'all';
let currentBookmarkFilterType = 'all';
let myPostsList = [];
let myBookmarksList = [];
let pendingAvatarDataUrl = null;

function initProfileApp() {
    // 1. Ensure authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Setup UI listeners
    initTabs();
    initFilterChips();
    initProfileModal();
    initSearch();

    // 3. Load initial data independently
    loadProfile();
    loadDepartments();
    loadMyPosts('all');
    loadMyBookmarks();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileApp);
} else {
    initProfileApp();
}

/* --------------------------------------------------------------------
   1. API: Load Departments
   -------------------------------------------------------------------- */
async function loadDepartments() {
    try {
        const res = await apiFetch('/departments');
        if (res && res.ok) {
            allDepartments = await res.json();
            populateDepartmentSelect();
        }
    } catch (err) {
        console.error('Failed to load departments', err);
    }
}

function populateDepartmentSelect() {
    const selects = [
        document.getElementById('modalInputDepartment'),
        document.getElementById('inputDepartment')
    ].filter(Boolean);

    if (selects.length === 0) return;

    selects.forEach(select => {
        const previousVal = select.value;
        select.innerHTML = '<option value="">Select Department...</option>';
        allDepartments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept.id;
            opt.textContent = dept.name + (dept.code ? ` (${dept.code})` : '');
            select.appendChild(opt);
        });

        if (currentStudent && currentStudent.departmentId) {
            select.value = currentStudent.departmentId;
        } else if (previousVal) {
            select.value = previousVal;
        }
    });
}

/* --------------------------------------------------------------------
   2. API: Load Student Profile
   -------------------------------------------------------------------- */
async function loadProfile() {
    try {
        const res = await apiFetch('/students/me');
        if (!res || !res.ok) {
            if (res && res.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
            }
            return;
        }

        currentStudent = await res.json();
        renderProfileView(currentStudent);
        renderAboutTab(currentStudent);

        // Pre-fill department dropdown if already loaded
        if (allDepartments.length > 0) {
            populateDepartmentSelect();
        }
    } catch (err) {
        console.error('Failed to fetch student profile', err);
        showToast('Could not load profile. Please refresh.', 'error');
    }
}

function renderProfileView(student) {
    if (!student) return;

    // Names & text fields
    const fullName = student.fullName || 'Student';
    const viewFullName = document.getElementById('viewFullName');
    if (viewFullName) viewFullName.textContent = fullName;

    const topbarName = document.getElementById('topbarName');
    if (topbarName) topbarName.textContent = fullName.split(' ')[0] || fullName;

    const navName = document.getElementById('navName');
    if (navName) navName.textContent = fullName;

    // Study Year
    const yearEl = document.getElementById('viewYear');
    if (yearEl) {
        yearEl.textContent = student.studyYear || 'Year 1';
    }

    // Department
    const deptEl = document.getElementById('viewDepartment');
    if (deptEl) {
        const deptName = student.departmentName || (student.department ? student.department.name : null) || 'General Curriculum';
        deptEl.textContent = deptName;
    }

    // University ID
    const uniIdEl = document.getElementById('viewUniversityId');
    if (uniIdEl) uniIdEl.textContent = student.universityId || '-';

    // Email
    const emailEl = document.getElementById('viewEmail');
    if (emailEl) emailEl.textContent = student.email || '-';

    // Phone
    const phoneWrap = document.getElementById('viewPhoneWrap');
    const phoneEl = document.getElementById('viewPhone');
    if (phoneWrap && phoneEl) {
        if (student.phone) {
            phoneEl.textContent = student.phone;
            phoneWrap.style.display = 'inline-flex';
        } else {
            phoneWrap.style.display = 'none';
        }
    }

    // Gender
    const genderWrap = document.getElementById('viewGenderWrap');
    const genderEl = document.getElementById('viewGender');
    if (genderWrap && genderEl) {
        if (student.gender) {
            genderEl.textContent = student.gender;
            genderWrap.style.display = 'inline-flex';
        } else {
            genderWrap.style.display = 'none';
        }
    }

    // Bio
    const bioEl = document.getElementById('viewBio');
    if (bioEl) {
        bioEl.textContent = student.bio || 'No bio provided yet. Click "Edit Profile" to share your academic interests, courses, and skills.';
    }

    // Blood Hero Badge
    const donorBadge = document.getElementById('viewBloodDonorBadge');
    const bloodGroupSpan = document.getElementById('viewBloodGroup');
    const donorText = document.getElementById('statDonorText');
    if (student.isBloodDonor) {
        if (donorBadge) donorBadge.style.display = 'inline-flex';
        if (bloodGroupSpan) bloodGroupSpan.textContent = student.bloodGroup || 'Blood';
        if (donorText) {
            donorText.innerHTML = `<i class="fa-solid fa-droplet" style="color:#ef4444;"></i> ${escapeHtml(student.bloodGroup || '')} Hero`;
        }
    } else {
        if (donorBadge) donorBadge.style.display = 'none';
        if (donorText) {
            donorText.innerHTML = `<i class="fa-solid fa-graduation-cap" style="color:var(--primary-color);"></i> Student`;
        }
    }

    // Avatar & Initials
    updateAvatarDisplay(student.profilePictureUrl, fullName);

    // Stats
    const postCount = student.postsCount != null ? student.postsCount : myPostsList.length;
    const statPosts = document.getElementById('statPosts');
    if (statPosts) statPosts.textContent = postCount;
    const tabCountPosts = document.getElementById('tabCountPosts');
    if (tabCountPosts) tabCountPosts.textContent = postCount;

    const bmCount = student.bookmarksCount != null ? student.bookmarksCount : myBookmarksList.length;
    const statBookmarks = document.getElementById('statBookmarks');
    if (statBookmarks) statBookmarks.textContent = bmCount;
    const tabCountBookmarks = document.getElementById('tabCountBookmarks');
    if (tabCountBookmarks) tabCountBookmarks.textContent = bmCount;

    const statJoined = document.getElementById('statJoined');
    if (statJoined && student.createdAt) {
        const d = new Date(student.createdAt);
        statJoined.textContent = d.getFullYear() || '2026';
    }
}

function updateAvatarDisplay(imageUrl, fullName) {
    const initials = (fullName || 'Student')
        .split(' ')
        .filter(Boolean)
        .map(p => p[0].toUpperCase())
        .slice(0, 2)
        .join('') || 'ST';

    const avatarEl = document.getElementById('profileAvatar');
    const initialsEl = document.getElementById('profileInitials');
    const topbarAvatar = document.getElementById('topbarAvatar');

    if (topbarAvatar) topbarAvatar.textContent = initials;

    if (imageUrl) {
        if (avatarEl) {
            avatarEl.style.backgroundImage = `url("${imageUrl}")`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
            avatarEl.style.backgroundRepeat = 'no-repeat';
        }
        if (initialsEl) initialsEl.style.display = 'none';

        if (topbarAvatar) {
            topbarAvatar.style.backgroundImage = `url("${imageUrl}")`;
            topbarAvatar.style.backgroundSize = 'cover';
            topbarAvatar.style.backgroundPosition = 'center';
            topbarAvatar.textContent = '';
        }
    } else {
        if (avatarEl) {
            avatarEl.style.backgroundImage = 'none';
        }
        if (initialsEl) {
            initialsEl.style.display = 'block';
            initialsEl.textContent = initials;
        }
        if (topbarAvatar) {
            topbarAvatar.style.backgroundImage = 'none';
            topbarAvatar.textContent = initials;
        }
    }
}

function renderAboutTab(student) {
    const container = document.getElementById('aboutCardContainer');
    if (!container || !student) return;

    const deptName = student.departmentName || (student.department ? student.department.name : 'Computer Science and Engineering');
    const studyYear = student.studyYear || 'Year 1';
    const joinedDate = student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Recent';

    container.innerHTML = `
        <h3>About ${escapeHtml(student.fullName || 'Student')}</h3>
        <ul class="about-list">
            <li>
                <i class="fa-solid fa-graduation-cap"></i>
                <span><strong>Program:</strong> ${escapeHtml(deptName)} &bull; ${escapeHtml(studyYear)}</span>
            </li>
            <li>
                <i class="fa-solid fa-id-card"></i>
                <span><strong>Student ID:</strong> ${escapeHtml(student.universityId || 'N/A')}</span>
            </li>
            <li>
                <i class="fa-regular fa-envelope"></i>
                <span><strong>Email:</strong> ${escapeHtml(student.email || 'N/A')}</span>
            </li>
            ${student.phone ? `
            <li>
                <i class="fa-solid fa-phone"></i>
                <span><strong>Phone:</strong> ${escapeHtml(student.phone)}</span>
            </li>` : ''}
            ${student.gender ? `
            <li>
                <i class="fa-solid fa-user"></i>
                <span><strong>Gender:</strong> ${escapeHtml(student.gender)}</span>
            </li>` : ''}
            <li>
                <i class="fa-solid fa-heart-pulse" style="color: ${student.isBloodDonor ? '#ef4444' : 'var(--primary-color)'};"></i>
                <span><strong>Blood Hero Donor:</strong> ${student.isBloodDonor ? `<span class="badge-donor"><i class="fa-solid fa-droplet"></i> ${escapeHtml(student.bloodGroup || 'Hero')} Active</span>` : 'Not registered yet &mdash; <a href="blood-hero.html" style="color:var(--primary-color); font-weight:600;">Join BloodHero</a>'}</span>
            </li>
            <li>
                <i class="fa-regular fa-calendar-check"></i>
                <span><strong>Member Since:</strong> ${escapeHtml(joinedDate)}</span>
            </li>
        </ul>
        <div class="about-bio-full">
            <strong>About Me & Academic Goals:</strong>
            <p style="margin-top: 0.35rem; line-height: 1.6;">${escapeHtml(student.bio || 'No detailed bio provided yet. Click "Edit Profile" above to share your academic interests, favorite courses, and collaboration goals with peers.')}</p>
        </div>
    `;
}

/* --------------------------------------------------------------------
   3. Edit Profile Modal Management
   -------------------------------------------------------------------- */
function initProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const editBtn = document.getElementById('editProfileBtn');
    const avatarEditBtn = document.getElementById('avatarEditBtn');
    const closeBtn = document.getElementById('closeProfileModalBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const form = document.getElementById('profileEditModalForm');
    const saveBtn = document.getElementById('modalSaveBtn');

    // Inputs
    const inputName = document.getElementById('modalInputName');
    const inputYear = document.getElementById('modalInputYear');
    const inputDept = document.getElementById('modalInputDepartment');
    const inputGender = document.getElementById('modalInputGender');
    const inputPhone = document.getElementById('modalInputPhone');
    const inputAvatarUrl = document.getElementById('modalInputAvatarUrl');
    const inputBio = document.getElementById('modalInputBio');
    const viewUniId = document.getElementById('modalViewUniId');
    const viewEmail = document.getElementById('modalViewEmail');

    // Avatar picker in modal
    const uploadPhotoBtn = document.getElementById('modalUploadPhotoBtn');
    const fileInput = document.getElementById('modalAvatarFileInput');
    const avatarPreview = document.getElementById('modalAvatarPreview');
    const avatarInitials = document.getElementById('modalAvatarInitials');

    if (!modal) return;

    window.openEditProfileModal = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        openModal();
    };

    window.closeEditProfileModal = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        closeModal();
    };

    function openModal() {
        pendingAvatarDataUrl = null;

        // Prepopulate with currentStudent data or fallback to DOM values
        const currentName = currentStudent?.fullName || document.getElementById('viewFullName')?.textContent || '';
        if (inputName) inputName.value = currentName === 'Loading Profile...' ? '' : currentName;

        const currentYear = currentStudent?.studyYear || document.getElementById('viewYear')?.textContent || 'Year 1';
        if (inputYear) inputYear.value = currentYear;

        if (inputDept) {
            populateDepartmentSelect();
            if (currentStudent?.departmentId) {
                inputDept.value = currentStudent.departmentId;
            }
        }

        if (inputGender) inputGender.value = currentStudent?.gender || '';
        if (inputPhone) inputPhone.value = currentStudent?.phone || '';
        if (inputAvatarUrl) inputAvatarUrl.value = (currentStudent?.profilePictureUrl && !currentStudent.profilePictureUrl.startsWith('data:')) ? currentStudent.profilePictureUrl : '';
        if (inputBio) inputBio.value = currentStudent?.bio || '';

        if (viewUniId) viewUniId.textContent = currentStudent?.universityId || document.getElementById('viewUniversityId')?.textContent || '-';
        if (viewEmail) viewEmail.textContent = currentStudent?.email || document.getElementById('viewEmail')?.textContent || '-';

        // Set avatar preview in modal
        updateModalPreview(currentStudent?.profilePictureUrl, currentName);

        // Open modal
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        if (inputName) {
            setTimeout(() => inputName.focus(), 100);
        }
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        pendingAvatarDataUrl = null;
        if (fileInput) fileInput.value = '';
    }

    function updateModalPreview(imageUrl, name) {
        if (!avatarPreview || !avatarInitials) return;

        const initials = (name || 'Student')
            .split(' ')
            .filter(Boolean)
            .map(p => p[0].toUpperCase())
            .slice(0, 2)
            .join('') || 'ST';

        if (imageUrl) {
            avatarPreview.style.backgroundImage = `url("${imageUrl}")`;
            avatarPreview.style.backgroundSize = 'cover';
            avatarPreview.style.backgroundPosition = 'center';
            avatarInitials.style.display = 'none';
        } else {
            avatarPreview.style.backgroundImage = 'none';
            avatarInitials.style.display = 'block';
            avatarInitials.textContent = initials;
        }
    }

    // Modal Trigger Buttons
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    if (avatarEditBtn) {
        avatarEditBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // File picker click
    if (uploadPhotoBtn && fileInput) {
        uploadPhotoBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;

            // Validation: Max 3MB
            if (file.size > 3 * 1024 * 1024) {
                showToast('Image size exceeds 3MB limit', 'error');
                fileInput.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            uploadPhotoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
            uploadPhotoBtn.disabled = true;

            try {
                const res = await apiFetch('/materials/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    pendingAvatarDataUrl = 'http://localhost:8080' + data.fileUrl;
                    updateModalPreview(pendingAvatarDataUrl, inputName ? inputName.value : 'Student');
                    showToast('Photo uploaded successfully! Click "Save Changes" to apply.', 'success');
                } else {
                    showToast('Failed to upload image.', 'error');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                showToast('An error occurred during image upload.', 'error');
            } finally {
                uploadPhotoBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Change Photo';
                uploadPhotoBtn.disabled = false;
                fileInput.value = '';
            }
        });
    }

    // URL preview logic removed as URL input was removed

    // Form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = inputName ? inputName.value.trim() : '';
            if (!fullName) {
                showToast('Full name is required', 'error');
                if (inputName) inputName.focus();
                return;
            }

            const originalBtnHtml = saveBtn ? saveBtn.innerHTML : 'Save Changes';
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            }

            try {
                const studyYear = inputYear ? inputYear.value : 'Year 1';
                const departmentId = inputDept && inputDept.value ? parseInt(inputDept.value, 10) : null;
                const gender = inputGender ? inputGender.value || null : null;
                const phone = inputPhone ? inputPhone.value.trim() || null : null;
                const profilePictureUrl = pendingAvatarDataUrl || (currentStudent ? currentStudent.profilePictureUrl : null);
                const bio = inputBio ? inputBio.value.trim() || null : null;

                const payload = {
                    fullName,
                    studyYear,
                    departmentId,
                    gender,
                    phone,
                    profilePictureUrl,
                    bio
                };

                const res = await apiFetch('/students/me', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });

                if (res && res.ok) {
                    const updated = await res.json();
                    currentStudent = updated;
                    pendingAvatarDataUrl = null;

                    renderProfileView(updated);
                    renderAboutTab(updated);

                    // Sync cached user in localStorage if present
                    try {
                        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
                        if (cachedUser) {
                            cachedUser.fullName = updated.fullName;
                            cachedUser.name = updated.fullName;
                            if (updated.profilePictureUrl) {
                                cachedUser.profilePictureUrl = updated.profilePictureUrl;
                            }
                            localStorage.setItem('user', JSON.stringify(cachedUser));
                        }
                    } catch (err) {}

                    closeModal();
                    showToast('Profile updated successfully!', 'success');
                } else {
                    const errorText = res ? await res.text() : 'Server error';
                    showToast('Failed to save profile: ' + errorText, 'error');
                }
            } catch (err) {
                console.error('Error saving profile', err);
                showToast('An unexpected error occurred while saving.', 'error');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHtml;
                }
            }
        });
    }
}

/* --------------------------------------------------------------------
   4. Load & Render Student's Own Posts
   -------------------------------------------------------------------- */
async function loadMyPosts(typeFilter = 'all') {
    const container = document.getElementById('postsListContainer');
    if (!container) return;

    renderSkeleton(container, 2);

    try {
        let endpoint = '/students/me/posts?size=50';
        if (typeFilter && typeFilter !== 'all') {
            endpoint += `&type=${encodeURIComponent(typeFilter)}`;
        }

        const res = await apiFetch(endpoint);
        if (res && res.ok) {
            const pageData = await res.json();
            myPostsList = (pageData && pageData.content) ? pageData.content : [];

            if (typeFilter === 'all') {
                const total = pageData.totalElements != null ? pageData.totalElements : myPostsList.length;
                const statPosts = document.getElementById('statPosts');
                if (statPosts) statPosts.textContent = total;
                const tabCountPosts = document.getElementById('tabCountPosts');
                if (tabCountPosts) tabCountPosts.textContent = total;
            }

            renderPostsList(myPostsList, container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Could not load posts at this time.</p></div>`;
        }
    } catch (err) {
        console.error('Failed to load my posts', err);
        container.innerHTML = `<div class="empty-state"><p>Error connecting to server.</p></div>`;
    }
}

function renderPostsList(posts, container) {
    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-regular fa-folder-open"></i></div>
                <h3>No Posts Yet</h3>
                <p>You haven't posted any materials, lost items, listings, or complaints in this category.</p>
                <div class="empty-actions">
                    <a href="lost-found.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Post in Lost &amp; Found</a>
                    <a href="materials.html" class="btn btn-outline btn-sm"><i class="fa-solid fa-upload"></i> Share Material</a>
                    <a href="complaints.html" class="btn btn-outline btn-sm"><i class="fa-solid fa-flag"></i> Submit Complaint</a>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const badge = getPostTypeBadge(post.postType);
        const statusBadge = getStatusBadge(post.status);
        const timeAgo = formatTimeAgo(post.createdAt);
        const viewUrl = getPostViewUrl(post.postType, post.id);

        const imagesHtml = (post.imageUrls && post.imageUrls.length > 0)
            ? `<div class="post-thumb-grid">
                ${post.imageUrls.map(img => `<img src="${escapeHtml(img)}" class="post-thumb" alt="Post media" onclick="window.open('${escapeHtml(img)}', '_blank')">`).join('')}
               </div>`
            : '';

        return `
            <article class="post-card" data-post-id="${post.id}" data-post-type="${post.postType}">
                <div class="post-header">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <span class="tag-pill ${badge.cssClass}">
                            <i class="${badge.icon}"></i> ${badge.label}
                        </span>
                        ${statusBadge}
                    </div>
                    <span class="post-time">${timeAgo}</span>
                </div>
                <div class="post-content">
                    <h3 style="margin-top: 0.5rem;">${escapeHtml(post.title || 'Campus Post')}</h3>
                    <p style="color: var(--text-main); font-size: 0.88rem; line-height: 1.5; margin: 0.35rem 0 0.5rem 0;">
                        ${escapeHtml(post.description || '')}
                    </p>
                    ${imagesHtml}
                </div>
                <div class="post-actions">
                    <div class="action-left">
                        <a href="${viewUrl}" class="action-link">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> View in ${badge.label}
                        </a>
                    </div>
                    <div class="action-right">
                        <button class="btn-delete-post" onclick="deleteOwnPost('${post.postType}', ${post.id})" title="Delete post">
                            <i class="fa-regular fa-trash-can"></i> Delete
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

/* --------------------------------------------------------------------
   5. Load & Render Bookmarks
   -------------------------------------------------------------------- */
async function loadMyBookmarks() {
    const container = document.getElementById('bookmarksListContainer');
    if (!container) return;

    renderSkeleton(container, 2);

    try {
        const res = await apiFetch('/students/me/bookmarks?size=50');
        if (res && res.ok) {
            const pageData = await res.json();
            myBookmarksList = (pageData && pageData.content) ? pageData.content : [];

            const total = pageData.totalElements != null ? pageData.totalElements : myBookmarksList.length;
            const statBookmarks = document.getElementById('statBookmarks');
            if (statBookmarks) statBookmarks.textContent = total;
            const tabCountBookmarks = document.getElementById('tabCountBookmarks');
            if (tabCountBookmarks) tabCountBookmarks.textContent = total;

            filterBookmarks(currentBookmarkFilterType);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Could not load bookmarks.</p></div>`;
        }
    } catch (err) {
        console.error('Failed to load bookmarks', err);
        container.innerHTML = `<div class="empty-state"><p>Error connecting to server.</p></div>`;
    }
}

function filterBookmarks(type) {
    currentBookmarkFilterType = type || 'all';
    const container = document.getElementById('bookmarksListContainer');
    if (!container) return;

    const filtered = (currentBookmarkFilterType === 'all')
        ? myBookmarksList
        : myBookmarksList.filter(b => b.postType === currentBookmarkFilterType);

    renderBookmarksList(filtered, container);
}

function renderBookmarksList(bookmarks, container) {
    if (!bookmarks || bookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-regular fa-bookmark"></i></div>
                <h3>No Bookmarks Saved Yet</h3>
                <p>Bookmark study sessions, notes, marketplace items, and announcements across the portal to easily access them here.</p>
                <div class="empty-actions">
                    <a href="dashboard.html" class="btn btn-outline btn-sm"><i class="fa-solid fa-compass"></i> Explore Campus Feed</a>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = bookmarks.map(item => {
        const badge = getPostTypeBadge(item.postType);
        const timeAgo = formatTimeAgo(item.createdAt);
        const viewUrl = getPostViewUrl(item.postType, item.id);

        const imagesHtml = (item.imageUrls && item.imageUrls.length > 0)
            ? `<div class="post-thumb-grid">
                ${item.imageUrls.map(img => `<img src="${escapeHtml(img)}" class="post-thumb" alt="Attachment" onclick="window.open('${escapeHtml(img)}', '_blank')">`).join('')}
               </div>`
            : '';

        return `
            <article class="post-card" id="bookmark-card-${item.postType}-${item.id}">
                <div class="post-header">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="tag-pill ${badge.cssClass}">
                            <i class="${badge.icon}"></i> ${badge.label}
                        </span>
                        ${item.ownerName ? `<span style="font-size:0.75rem; color:var(--text-muted);">by <strong>${escapeHtml(item.ownerName)}</strong></span>` : ''}
                    </div>
                    <span class="post-time">${timeAgo}</span>
                </div>
                <div class="post-content">
                    <h3 style="margin-top: 0.5rem;">${escapeHtml(item.title || 'Saved Item')}</h3>
                    <p style="color: var(--text-main); font-size: 0.88rem; line-height: 1.5; margin: 0.35rem 0 0.5rem 0;">
                        ${escapeHtml(item.description || '')}
                    </p>
                    ${imagesHtml}
                </div>
                <div class="post-actions">
                    <div class="action-left">
                        <a href="${viewUrl}" class="action-link">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in ${badge.label}
                        </a>
                    </div>
                    <div class="action-right">
                        <button class="action-btn active" style="color: var(--primary-color);" onclick="removeBookmark('${item.postType}', ${item.id})" title="Remove bookmark">
                            <i class="fa-solid fa-bookmark"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

/* --------------------------------------------------------------------
   6. Bookmark & Post Action Handlers
   -------------------------------------------------------------------- */
window.removeBookmark = async function(postType, postId) {
    try {
        const card = document.getElementById(`bookmark-card-${postType}-${postId}`);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        const res = await apiFetch(`/students/me/bookmarks/${postType}/${postId}`, {
            method: 'DELETE'
        });

        if (res && (res.ok || res.status === 204)) {
            showToast('Bookmark removed', 'success');
            myBookmarksList = myBookmarksList.filter(b => !(b.postType === postType && b.id === postId));
            const count = myBookmarksList.length;
            const statBookmarks = document.getElementById('statBookmarks');
            if (statBookmarks) statBookmarks.textContent = count;
            const tabCountBookmarks = document.getElementById('tabCountBookmarks');
            if (tabCountBookmarks) tabCountBookmarks.textContent = count;

            filterBookmarks(currentBookmarkFilterType);
        } else {
            if (card) {
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            }
            showToast('Failed to remove bookmark', 'error');
        }
    } catch (e) {
        console.error('Error removing bookmark', e);
        showToast('Network error removing bookmark', 'error');
    }
};

window.deleteOwnPost = async function(postType, postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }

    try {
        let endpoint = '';
        switch (postType) {
            case 'lost_found':
                endpoint = `/lost-found/${postId}`;
                break;
            case 'marketplace':
                endpoint = `/marketplace/listings/${postId}`;
                break;
            case 'material_share':
                endpoint = `/materials/${postId}`;
                break;
            case 'complaint':
                endpoint = `/complaints/${postId}`;
                break;
            case 'study_session':
                endpoint = `/study-sessions/${postId}`;
                break;
            default:
                endpoint = `/posts/${postId}`;
        }

        const res = await apiFetch(endpoint, { method: 'DELETE' });
        if (res && (res.ok || res.status === 204)) {
            showToast('Post deleted successfully', 'success');
            myPostsList = myPostsList.filter(p => p.id !== postId);
            const total = myPostsList.length;
            const statPosts = document.getElementById('statPosts');
            if (statPosts) statPosts.textContent = total;
            const tabCountPosts = document.getElementById('tabCountPosts');
            if (tabCountPosts) tabCountPosts.textContent = total;

            const container = document.getElementById('postsListContainer');
            renderPostsList(myPostsList, container);
        } else {
            showToast('Failed to delete post.', 'error');
        }
    } catch (e) {
        console.error('Delete post error', e);
        showToast('Error deleting post.', 'error');
    }
};

/* --------------------------------------------------------------------
   7. Filter Chips & In-page Search
   -------------------------------------------------------------------- */
function initFilterChips() {
    // Posts chips
    const postChips = document.querySelectorAll('#postsFilterChips .filter-chip');
    postChips.forEach(chip => {
        chip.addEventListener('click', () => {
            postChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilterType = chip.dataset.type;
            loadMyPosts(currentFilterType);
        });
    });

    // Bookmarks chips
    const bookmarkChips = document.querySelectorAll('#bookmarksFilterChips .filter-chip');
    bookmarkChips.forEach(chip => {
        chip.addEventListener('click', () => {
            bookmarkChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentBookmarkFilterType = chip.dataset.type;
            filterBookmarks(currentBookmarkFilterType);
        });
    });
}

function initSearch() {
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const activeTab = document.querySelector('.profile-tab.active')?.dataset.tab;

        if (activeTab === 'posts') {
            const filtered = myPostsList.filter(p => 
                (p.title && p.title.toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
            renderPostsList(filtered, document.getElementById('postsListContainer'));
        } else if (activeTab === 'bookmarks') {
            const filtered = myBookmarksList.filter(b => 
                (b.title && b.title.toLowerCase().includes(query)) ||
                (b.description && b.description.toLowerCase().includes(query))
            );
            renderBookmarksList(filtered, document.getElementById('bookmarksListContainer'));
        }
    });
}

/* --------------------------------------------------------------------
   8. Tabs (Strict Equal Width and Sizing)
   -------------------------------------------------------------------- */
function initTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const statButtons = document.querySelectorAll('.stat-item[data-target-tab]');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });

    statButtons.forEach(btn => {
        btn.addEventListener('click', () => activateTab(btn.dataset.targetTab));
    });

    function activateTab(tabName) {
        document.querySelectorAll('.profile-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tabName}`);
        });

        // Trigger reload if switching to tab
        if (tabName === 'posts' && myPostsList.length === 0) {
            loadMyPosts(currentFilterType);
        } else if (tabName === 'bookmarks') {
            if (myBookmarksList.length === 0) {
                loadMyBookmarks();
            } else {
                filterBookmarks(currentBookmarkFilterType);
            }
        } else if (tabName === 'about' && currentStudent) {
            renderAboutTab(currentStudent);
        }
    }
}

/* --------------------------------------------------------------------
   9. Helper Utilities
   -------------------------------------------------------------------- */
function getPostTypeBadge(postType) {
    switch (postType) {
        case 'lost_found':
        case 'lostfound':
            return { label: 'Lost & Found', cssClass: 'tag-lostfound', icon: 'fa-solid fa-magnifying-glass' };
        case 'marketplace':
            return { label: 'Marketplace', cssClass: 'tag-marketplace', icon: 'fa-solid fa-store' };
        case 'material_share':
        case 'materials':
            return { label: 'Material Sharing', cssClass: 'tag-material', icon: 'fa-solid fa-folder-open' };
        case 'complaint':
            return { label: 'Complaint', cssClass: 'tag-complaint', icon: 'fa-solid fa-flag' };
        case 'study_session':
        case 'study_zone':
            return { label: 'Study Zone', cssClass: 'tag-study', icon: 'fa-solid fa-book-open' };
        case 'event':
            return { label: 'Event', cssClass: 'tag-event', icon: 'fa-regular fa-calendar' };
        case 'announcement':
            return { label: 'Announcement', cssClass: 'tag-study', icon: 'fa-solid fa-bullhorn' };
        default:
            return { label: 'Post', cssClass: 'tag-study', icon: 'fa-solid fa-layer-group' };
    }
}

function getStatusBadge(status) {
    if (!status) return '';
    const cleanStatus = status.toLowerCase();
    return `<span class="badge-status ${cleanStatus}">${escapeHtml(status)}</span>`;
}

function getPostViewUrl(postType, postId) {
    switch (postType) {
        case 'lost_found':
            return `lost-found.html?id=${postId}`;
        case 'marketplace':
            return `marketplace.html?id=${postId}`;
        case 'material_share':
            return `materials.html`;
        case 'complaint':
            return `complaints.html`;
        case 'study_session':
            return `study-zone.html`;
        case 'event':
            return `events.html`;
        case 'announcement':
            return `announcements.html`;
        default:
            return `dashboard.html`;
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderSkeleton(container, count = 2) {
    container.innerHTML = Array(count).fill(`
        <div class="skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line mid"></div>
            <div class="skeleton-line long"></div>
        </div>
    `).join('');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('profileToast');
    const msg = document.getElementById('toastMessage');
    if (!toast || !msg) return;

    msg.textContent = message;
    toast.className = `profile-toast ${type} show`;

    const icon = toast.querySelector('i');
    if (icon) {
        icon.className = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    }

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
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