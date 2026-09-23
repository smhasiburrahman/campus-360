/* my-profile.js*/

document.addEventListener('DOMContentLoaded', () => {
    initProfileEdit();
    initAvatarEdit();
    initTabs();
    initPostCards();
});


const mockProfile = {
    name: 'Sarah Rahman',
    year: 'Year 3',
    department: 'Computer Science & Engineering',
    email: 'sarah.rahman@campus360.edu',
    bio: 'CSE student passionate about AI and web development. Always looking for study partners and happy to collaborate on projects.'
};

/* ---------------------------------------------------------
   Edit Profile: toggle between view mode and edit form,
   Save writes the edited values back into view mode,
   Cancel discards changes and restores the form to the
   last-saved values.
--------------------------------------------------------- */
function initProfileEdit() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const form = document.getElementById('profileEditForm');
    const viewMode = document.getElementById('profileViewMode');

    if (!editBtn || !form || !viewMode) return;

    editBtn.addEventListener('click', () => enterEditMode());
    cancelBtn.addEventListener('click', () => exitEditMode(false));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfileChanges();
        exitEditMode(true);
    });

    function enterEditMode() {
        // Populate the form with whatever is currently shown, so
        // reopening edit mode after a save starts from the latest data.
        document.getElementById('inputName').value = mockProfile.name;
        document.getElementById('inputYear').value = mockProfile.year;
        document.getElementById('inputDepartment').value = mockProfile.department;
        document.getElementById('inputEmail').value = mockProfile.email;
        document.getElementById('inputBio').value = mockProfile.bio;

        viewMode.hidden = true;
        form.hidden = false;
        editBtn.hidden = true;
    }

    function exitEditMode() {
        form.hidden = true;
        viewMode.hidden = false;
        editBtn.hidden = false;
    }

    function saveProfileChanges() {
        mockProfile.name = document.getElementById('inputName').value.trim() || mockProfile.name;
        mockProfile.year = document.getElementById('inputYear').value;
        mockProfile.department = document.getElementById('inputDepartment').value.trim() || mockProfile.department;
        mockProfile.email = document.getElementById('inputEmail').value.trim() || mockProfile.email;
        mockProfile.bio = document.getElementById('inputBio').value.trim() || mockProfile.bio;

        renderProfile();

        // TODO: replace with a real API call once the backend exists, e.g.
        // api.put('/users/me', mockProfile);
    }
}

function renderProfile() {
    document.querySelector('.profile-name').childNodes[0].textContent = mockProfile.name + ' ';
    document.getElementById('viewYear').textContent = mockProfile.year;
    document.getElementById('viewDepartment').textContent = mockProfile.department;
    document.getElementById('viewEmail').textContent = mockProfile.email;
    document.getElementById('viewBio').textContent = mockProfile.bio;

    // Keep the avatar initials and sidebar/topbar name in sync with the
    // edited full name, matching the "SR" initials shown in the design.
    const initials = mockProfile.name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0].toUpperCase())
        .slice(0, 2)
        .join('');

    const initialsEl = document.getElementById('profileInitials');
    if (initialsEl && initials) initialsEl.textContent = initials;
}

/* ---------------------------------------------------------
   Avatar photo change (mock only — no real upload/storage yet).
--------------------------------------------------------- */
function initAvatarEdit() {
    const avatarBtn = document.getElementById('avatarEditBtn');
    if (!avatarBtn) return;

    avatarBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const avatarEl = document.getElementById('profileAvatar');
                if (!avatarEl) return;
                avatarEl.style.backgroundImage = `url(${reader.result})`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                const initialsEl = document.getElementById('profileInitials');
                if (initialsEl) initialsEl.style.opacity = '0';
            };
            reader.readAsDataURL(file);

            // TODO: replace with a real upload once the backend exists, e.g.
            // const formData = new FormData();
            // formData.append('avatar', file);
            // api.post('/users/me/avatar', formData);
        });

        input.click();
    });
}

/* ---------------------------------------------------------
   Tabs: My Posts / Bookmarks / About.
   The Posts/Bookmarks stat buttons above the tab bar jump to
   the matching tab, same as clicking the tab itself.
--------------------------------------------------------- */
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
    }
}

/* ---------------------------------------------------------
   Post card actions (like / bookmark), same behavior pattern
   as study-zone.js so interactions feel consistent app-wide.
--------------------------------------------------------- */
function initPostCards() {
    document.querySelectorAll('.post-card').forEach(card => {
        const likeBtn = card.querySelector('[data-action="like"]');
        const bookmarkBtn = card.querySelector('[data-action="bookmark"]');

        if (likeBtn) {
            likeBtn.addEventListener('click', () => handleLike(likeBtn));
        }
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => handleBookmark(bookmarkBtn));
        }
    });
}

function handleLike(likeBtn) {
    const countEl = likeBtn.querySelector('.like-count');
    const icon = likeBtn.querySelector('i');
    if (!countEl) return;

    let count = parseInt(countEl.textContent, 10) || 0;
    const isLiked = likeBtn.classList.toggle('liked');

    count = isLiked ? count + 1 : count - 1;
    countEl.textContent = count;

    if (icon) {
        icon.classList.toggle('fa-regular', !isLiked);
        icon.classList.toggle('fa-solid', isLiked);
    }

    likeBtn.style.color = isLiked ? '#ef4444' : '';

    // TODO: replace with a real API call once the backend exists, e.g.
    // api.post(`/posts/${card.dataset.postId}/like`);
}

function handleBookmark(bookmarkBtn) {
    const icon = bookmarkBtn.querySelector('i');
    const isSaved = bookmarkBtn.classList.toggle('active');

    if (icon) {
        icon.classList.toggle('fa-regular', !isSaved);
        icon.classList.toggle('fa-solid', isSaved);
    }

    // TODO: replace with a real API call once the backend exists, e.g.
    // api.post(`/posts/${card.dataset.postId}/bookmark`);
}