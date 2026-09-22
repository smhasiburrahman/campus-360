const API_BASE_URL = 'http://localhost:8080/api/v1';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    // If sending FormData, remove Content-Type so browser can set boundary
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Handle 401 Unauthorized (token expired)
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return null;
        }

        return response;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
// Initialize currentUser globally by decoding JWT
(function () {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            window.currentUser = {
                id: payload.userId || payload.sub,
                accountType: payload.accountType || payload.role,
                role: payload.role || 'ROLE_STUDENT'
            };

            // Wait for DOM to load to inject admin menu
            document.addEventListener('DOMContentLoaded', () => {
                if (window.currentUser.role === 'ROLE_ADMIN') {
                    const sidebarNav = document.querySelector('.sidebar-nav');
                    if (sidebarNav && !document.getElementById('adminSidebarSection')) {
                        const adminHtml = `
                            <div class="nav-section" id="adminSidebarSection" style="margin-top: 2rem;">
                                <div class="nav-section-title" style="color: var(--danger);">Admin Panel</div>
                                <a href="admin-shuttles.html" class="nav-item">
                                    <i class="fa-solid fa-route"></i> Manage Shuttles
                                </a>
                            </div>
                        `;
                        sidebarNav.insertAdjacentHTML('beforeend', adminHtml);

                        // If we are currently on the admin-shuttles page, mark it active
                        if (window.location.pathname.includes('admin-shuttles.html')) {
                            const link = sidebarNav.querySelector('a[href="admin-shuttles.html"]');
                            if (link) link.classList.add('active');
                        }
                    }
                }

                // 2. Setup Topbar Dropdown
                const userProfileBtn = document.getElementById('userProfileBtn');
                let profileDropdown = document.getElementById('profileDropdown');

                if (userProfileBtn) {
                    // Inject dropdown if it doesn't exist
                    if (!profileDropdown) {
                        const dropdownHtml = `
                            <div class="profile-dropdown" id="profileDropdown" style="display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-md); padding: 0.5rem 0; min-width: 150px; z-index: 100; margin-top: 0.5rem;">
                                <button id="logoutBtn" style="width: 100%; text-align: left; padding: 0.75rem 1rem; background: none; border: none; cursor: pointer; color: #ef4444; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out
                                </button>
                            </div>
                        `;
                        userProfileBtn.insertAdjacentHTML('beforeend', dropdownHtml);
                        profileDropdown = document.getElementById('profileDropdown');
                    }

                    userProfileBtn.addEventListener('click', (e) => {
                        // Toggle dropdown
                        profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'block' : 'none';
                        e.stopPropagation(); // prevent document click from immediately closing it
                    });

                    // Close dropdown when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!userProfileBtn.contains(e.target)) {
                            profileDropdown.style.display = 'none';
                        }
                    });
                }

                // 3. Setup Logout Logic (re-query to get the one we just injected)
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        localStorage.removeItem('token');
                        window.location.href = 'index.html';
                    });
                }
            });

        } catch (e) {
            console.error('Failed to parse token payload', e);
        }
    }
})();
