document.addEventListener('DOMContentLoaded', async () => {
    
    // Auth & UI Check
    let currentUser = null;
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = {
            id: payload.sub ? parseInt(payload.sub, 10) : null,
            accountType: payload.accountType
        };
    } catch(e) {}

    const openCreateModalBtn = document.getElementById('openCreateModalBtn');
    if (currentUser && (currentUser.accountType === 'AUTHORITY' || currentUser.accountType === 'CLUB')) {
        openCreateModalBtn.style.display = 'flex';
    }

    // Modal logic
    const createModal = document.getElementById('createModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelCreateBtn = document.getElementById('cancelCreateBtn');

    openCreateModalBtn.addEventListener('click', () => {
        createModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => createModal.classList.remove('active'));
    cancelCreateBtn.addEventListener('click', () => createModal.classList.remove('active'));

    // Image Dummy Upload
    const addImageBtn = document.getElementById('addImageBtn');
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    let uploadedImages = [];

    addImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const dummyUrl = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop';
            uploadedImages.push(dummyUrl);
            
            const img = document.createElement('img');
            img.src = dummyUrl;
            img.className = 'image-preview';
            imagePreviewContainer.appendChild(img);
        }
    });

    // Form Submit
    const createAnnForm = document.getElementById('createAnnForm');
    createAnnForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            title: document.getElementById('annTitle').value,
            category: document.getElementById('annCategory').value,
            description: document.getElementById('annDescription').value,
            imageUrls: uploadedImages
        };

        try {
            const res = await apiFetch('/announcements', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                createModal.classList.remove('active');
                createAnnForm.reset();
                imagePreviewContainer.innerHTML = '';
                uploadedImages = [];
                // Refresh feed
                fetchAnnouncements();
            } else {
                alert('Failed to post announcement.');
            }
        } catch (error) {
            console.error('Error posting announcement:', error);
            alert('An error occurred.');
        }
    });

    // Fetch and render Feed
    const annFeedContainer = document.getElementById('annFeedContainer');
    
    async function fetchAnnouncements(category = '') {
        try {
            annFeedContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #94a3b8;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Loading announcements...</p>
                </div>
            `;

            let url = '/announcements?size=50';
            if (category) {
                url += `&category=${category}`;
            }

            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                renderAnnouncements(data.content);
            } else {
                annFeedContainer.innerHTML = `<p style="color: red; text-align: center;">Failed to load announcements.</p>`;
            }
        } catch (error) {
            console.error(error);
            annFeedContainer.innerHTML = `<p style="color: red; text-align: center;">Error loading announcements.</p>`;
        }
    }

    function renderAnnouncements(posts) {
        if (!posts || posts.length === 0) {
            annFeedContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #94a3b8; background: white; border-radius: 12px; border: 1px solid var(--border-color);">
                    <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                    <p style="font-size: 1.1rem;">No announcements found.</p>
                </div>
            `;
            return;
        }

        annFeedContainer.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'ann-card';

            const authorName = post.postedBy?.name || 'Unknown';
            const authorType = post.postedBy?.type ? post.postedBy.type.charAt(0).toUpperCase() + post.postedBy.type.slice(1) : 'User';
            
            // Category badge
            let badgeClass = 'bg-blue';
            if (post.category === 'administrative') badgeClass = 'bg-purple';
            if (post.category === 'club') badgeClass = 'bg-teal';
            
            const badgeLabel = post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : 'Announcement';

            // Time
            const date = new Date(post.createdAt);
            const timeAgo = date.toLocaleDateString(); // simple

            let imagesHtml = '';
            if (post.imageUrls && post.imageUrls.length > 0) {
                imagesHtml = `<img src="${post.imageUrls[0]}" class="ann-images" alt="Announcement Image">`;
            }

            card.innerHTML = `
                <div class="ann-card-header">
                    <div class="avatar ${badgeClass}">${authorName.charAt(0).toUpperCase()}</div>
                    <div class="ann-author-info">
                        <div class="ann-author-name">
                            ${authorName}
                            <span class="badge ${badgeClass}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${badgeLabel}</span>
                        </div>
                        <div class="ann-author-meta">${authorType} · ${timeAgo}</div>
                    </div>
                </div>
                <div class="ann-card-title">${post.title || 'Untitled'}</div>
                <div class="ann-card-desc">${post.description}</div>
                ${imagesHtml}
                <div class="post-actions" style="border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; gap: 1rem;">
                    <button class="action-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fa-regular fa-thumbs-up"></i> Like</button>
                    <button class="action-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer;"><i class="fa-regular fa-comment"></i> Comment</button>
                </div>
            `;
            annFeedContainer.appendChild(card);
        });
    }

    // Filters
    const filterBtns = document.querySelectorAll('.ann-toggle');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const category = e.currentTarget.dataset.category;
            fetchAnnouncements(category);
        });
    });

    // Initial fetch
    fetchAnnouncements();

    // User profile loading for nav
    async function loadUserProfile() {
        if(currentUser && currentUser.accountType !== 'STUDENT') {
            document.getElementById('navName').textContent = currentUser.accountType;
            document.getElementById('navAvatar').textContent = currentUser.accountType.charAt(0).toUpperCase();
            return;
        }
        try {
            const res = await apiFetch('/students/me');
            if (res.ok) {
                const user = await res.json();
                document.getElementById('navName').textContent = user.fullName;
                document.getElementById('navAvatar').textContent = user.fullName.charAt(0).toUpperCase();
            }
        } catch (e) {}
    }
    loadUserProfile();

    // Logout logic
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userProfileBtn && profileDropdown) {
        

        // Close dropdown when clicking outside
        
    }

    if (logoutBtn) {
        
    }
});
