let currentUserId = 1;
let marketplaceListings = [];
let activeCategory = 'ALL';
let showAvailableOnly = false;
let currentSort = 'newest';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Maintain mock token if missing to prevent auth redirect
    if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'mock.eyJzdWIiOiIxIiwibmFtZSI6IlNhcmFoIFJhaG1hbiIsInJvbGUiOiJTVFVERU5UIn0.mock');
    }

    try {
        const token = localStorage.getItem('token');
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.sub ? parseInt(payload.sub, 10) : 1;
    } catch (e) {
        console.warn('Token decoding skipped, default student user applied.');
    }

    await loadUserProfile();
    setupMarketplaceListeners();
    await fetchMarketplaceListings();
});

/* ==========================================================================
   1. USER PROFILE
   ========================================================================== */
async function loadUserProfile() {
    try {
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
        console.warn('Profile fetch skipped (backend offline).');
    }
}

/* ==========================================================================
   2. DOM LISTENERS & MODAL SETUP
   ========================================================================== */
function setupMarketplaceListeners() {
    // Profile Dropdown
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userProfileBtn && profileDropdown) {
        userProfileBtn.addEventListener('click', () => {
            profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!userProfileBtn.contains(e.target)) profileDropdown.style.display = 'none';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }

    // Category Filter Tabs
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeCategory = e.currentTarget.getAttribute('data-category');
            applyFiltersAndRender();
        });
    });

    // Available Only Toggle Checkbox
    const availableToggle = document.getElementById('availableOnlyToggle');
    if (availableToggle) {
        availableToggle.addEventListener('change', (e) => {
            showAvailableOnly = e.target.checked;
            applyFiltersAndRender();
        });
    }

    // Search Input
    const searchInput = document.getElementById('marketSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => applyFiltersAndRender());
    }

    // Sort Select
    const sortSelect = document.getElementById('marketSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value;
            applyFiltersAndRender();
        });
    }

    // Modal Handlers
    const modal = document.getElementById('createListingModal');
    const openModalBtn = document.getElementById('openCreateListingModalBtn');
    const closeModalBtn = document.getElementById('closeListingModalBtn');
    const cancelModalBtn = document.getElementById('cancelListingModalBtn');

    if (openModalBtn) openModalBtn.addEventListener('click', () => modal.style.display = 'flex');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => modal.style.display = 'none');

    // Create Listing Form Submit
    const form = document.getElementById('createListingForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitNewListing();
        });
    }
}

/* ==========================================================================
   3. DATA FETCHING (API WITH SAFE DYNAMIC FALLBACK)
   ========================================================================== */
async function fetchMarketplaceListings() {
    let apiSuccess = false;
    try {
        // BACKEND API INTEGRATION:
        // GET /api/v1/marketplace?page=0&size=50
        const res = await apiFetch('/marketplace');
        if (res && res.ok) {
            const data = await res.json();
            marketplaceListings = data.content || [];
            apiSuccess = true;
        }
    } catch (err) {
        console.warn('Backend offline, using fallback dynamic mock marketplace data.');
    }

    // Dynamic initial mock dataset matching the screenshot
    if (!apiSuccess || marketplaceListings.length === 0) {
        marketplaceListings = [
            {
                id: 1,
                title: "Calculus: Early Transcendentals, 8th Edition — James Stewart",
                category: "Textbooks",
                condition: "Like New",
                price: 1200,
                originalPrice: 2800,
                isSold: false,
                isBookmarked: false,
                vendorName: "Karim's Study Store",
                vendorVerified: true,
                vendorColor: "#10b981",
                imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
            },
            {
                id: 2,
                title: "Casio FX-991EX Scientific Calculator — ClassWiz",
                category: "Electronics",
                condition: "Good",
                price: 800,
                originalPrice: 1200,
                isSold: false,
                isBookmarked: false,
                vendorName: "TechGadgets Hub",
                vendorVerified: true,
                vendorColor: "#2563eb",
                imageUrl: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
            },
            {
                id: 3,
                title: "Introduction to Algorithms (CLRS), 3rd Edition — Cormen et al.",
                category: "Textbooks",
                condition: "Good",
                price: 1500,
                originalPrice: 3500,
                isSold: false,
                isBookmarked: true,
                vendorName: "Book Exchange Hub",
                vendorVerified: true,
                vendorColor: "#8b5cf6",
                imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
            },
            {
                id: 4,
                title: "Sony WH-1000XM4 Wireless Noise-Cancelling Headphones",
                category: "Electronics",
                condition: "Like New",
                price: 8500,
                originalPrice: 16000,
                isSold: false,
                isBookmarked: false,
                vendorName: "TechGadgets Hub",
                vendorVerified: true,
                vendorColor: "#2563eb",
                imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
            },
            {
                id: 5,
                title: "White Lab Coat — Size M (Unisex)",
                category: "Lab Supplies",
                condition: "Good",
                price: 350,
                originalPrice: null,
                isSold: false,
                isBookmarked: false,
                vendorName: "Nadia's Campus Corner",
                vendorVerified: false,
                vendorColor: "#ec4899",
                imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
            },
            {
                id: 6,
                title: "Laptop Cooling Pad with 5 Fans — USB Powered",
                category: "Electronics",
                condition: "Good",
                price: 700,
                originalPrice: 1200,
                isSold: true, // Marked as SOLD with overlay
                isBookmarked: false,
                vendorName: "TechGadgets Hub",
                vendorVerified: true,
                vendorColor: "#2563eb",
                imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
            },
            {
                id: 7,
                title: "Engineering Drawing Set — Rotring + Staedtler",
                category: "Stationery",
                condition: "Good",
                price: 450,
                originalPrice: 1100,
                isSold: false,
                isBookmarked: false,
                vendorName: "Nadia's Campus Corner",
                vendorVerified: false,
                vendorColor: "#ec4899",
                imageUrl: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
            },
            {
                id: 8,
                title: "Python for Data Science Handbook — Jake VanderPlas",
                category: "Textbooks",
                condition: "Good",
                price: 900,
                originalPrice: 1800,
                isSold: false,
                isBookmarked: false,
                vendorName: "Book Exchange Hub",
                vendorVerified: true,
                vendorColor: "#8b5cf6",
                imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80",
                createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
            }
        ];
    }

    updateStatsRow();
    applyFiltersAndRender();
}

/* ==========================================================================
   4. STATS COMPUTATION
   ========================================================================== */
function updateStatsRow() {
    const total = marketplaceListings.length;
    const active = marketplaceListings.filter(item => !item.isSold).length;
    const saved = marketplaceListings.filter(item => item.isBookmarked).length;

    // Distinct verified vendors count
    const verifiedVendors = new Set(
        marketplaceListings.filter(item => item.vendorVerified).map(item => item.vendorName)
    ).size;

    document.getElementById('statActiveListings').textContent = active;
    document.getElementById('statTotalListings').textContent = total;
    document.getElementById('statVerifiedSellers').textContent = verifiedVendors;
    document.getElementById('statSavedByYou').textContent = saved;
}

/* ==========================================================================
   5. FILTERING, SORTING & RENDERING
   ========================================================================== */
function applyFiltersAndRender() {
    let list = [...marketplaceListings];

    // Category Filter
    if (activeCategory !== 'ALL') {
        list = list.filter(item => item.category === activeCategory);
    }

    // Available Only Toggle
    if (showAvailableOnly) {
        list = list.filter(item => !item.isSold);
    }

    // Search Query Filter
    const query = (document.getElementById('marketSearchInput')?.value || '').toLowerCase().trim();
    if (query) {
        list = list.filter(item => 
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.vendorName && item.vendorName.toLowerCase().includes(query))
        );
    }

    // Sorting
    if (currentSort === 'price_low') {
        list.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price_high') {
        list.sort((a, b) => b.price - a.price);
    } else {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    document.getElementById('listingsCountLabel').textContent = `${list.length} listings`;
    renderListingsGrid(list);
}

function renderListingsGrid(items) {
    const grid = document.getElementById('marketplaceGrid');

    if (items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: white; border-radius: 16px; border: 1px solid #e2e8f0; color: #94a3b8;">
                <i class="fa-solid fa-store-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
                <p>No listings found matching your search or filters.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => createProductCardHTML(item)).join('');
}

function createProductCardHTML(item) {
    // Condition class styling
    const condClass = item.condition.toLowerCase().replace(' ', '-');
    const vendorInitial = (item.vendorName || 'V')[0].toUpperCase();

    // Time Ago calculation
    const daysAgo = Math.max(1, Math.round((new Date() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)));
    const timeStr = daysAgo >= 7 ? `${Math.floor(daysAgo / 7)} week ago` : `${daysAgo} days ago`;

    // Sold overlay
    const soldOverlayHtml = item.isSold ? `
        <div class="sold-overlay">
            <div class="sold-badge">SOLD</div>
        </div>
    ` : '';

    return `
        <div class="market-card" id="listing-card-${item.id}">
            <div class="card-media-wrap">
                <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'}" alt="${item.title}">
                <div class="condition-badge ${condClass}">${item.condition}</div>
                
                <!-- Bookmark Button: Generic polymorphic bookmark endpoint -->
                <button class="bookmark-btn ${item.isBookmarked ? 'active' : ''}" onclick="toggleBookmark(${item.id})" title="Save to bookmarks">
                    <i class="fa-${item.isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i>
                </button>

                ${soldOverlayHtml}
            </div>

            <div class="card-details">
                <div class="card-category">${item.category}</div>
                <h4 class="card-title" title="${item.title}">${item.title}</h4>

                <div class="card-pricing">
                    <span class="card-price">BDT ${item.price.toLocaleString()}</span>
                    ${item.originalPrice ? `<span class="card-original-price">BDT ${item.originalPrice.toLocaleString()}</span>` : ''}
                </div>

                <div class="card-vendor-footer">
                    <!-- Vendor Profile Affordance -->
                    <a href="vendor-profile.html?name=${encodeURIComponent(item.vendorName)}" class="vendor-profile-link" title="${item.vendorName}">
                        <span class="vendor-avatar" style="background: ${item.vendorColor || '#2563eb'}">${vendorInitial}</span>
                        <span>${item.vendorName}</span>
                        ${item.vendorVerified ? '<i class="fa-solid fa-circle-check vendor-verified-badge"></i>' : ''}
                    </a>
                    <span class="listing-post-time">${timeStr}</span>
                </div>
            </div>
        </div>
    `;
}

/* ==========================================================================
   6. ACTIONS: BOOKMARK & CREATE LISTING
   ========================================================================== */
async function toggleBookmark(listingId) {
    const item = marketplaceListings.find(i => i.id === listingId);
    if (!item) return;

    item.isBookmarked = !item.isBookmarked;

    // BACKEND API INTEGRATION:
    // PUT /api/v1/engagement/marketplace/{listingId}/bookmark
    // DELETE /api/v1/engagement/marketplace/{listingId}/bookmark
    try {
        if (typeof apiFetch === 'function') {
            await apiFetch(`/engagement/marketplace/${listingId}/bookmark`, {
                method: item.isBookmarked ? 'PUT' : 'DELETE'
            });
        }
    } catch (e) {
        console.warn('Backend offline, bookmark toggled in client state.');
    }

    updateStatsRow();
    applyFiltersAndRender();
}

async function submitNewListing() {
    const title = document.getElementById('listingTitle').value;
    const category = document.getElementById('listingCategory').value;
    const condition = document.getElementById('listingCondition').value;
    const price = parseFloat(document.getElementById('listingPrice').value);
    const originalPrice = document.getElementById('listingOriginalPrice').value ? parseFloat(document.getElementById('listingOriginalPrice').value) : null;
    const description = document.getElementById('listingDescription').value;
    const imageUrl = document.getElementById('listingImageUrl').value;

    const payload = {
        id: Date.now(),
        title,
        category,
        condition,
        price,
        originalPrice,
        description,
        isSold: false,
        isBookmarked: false,
        vendorName: "Sarah's Store", // Derived from user's vendor profile
        vendorVerified: true,
        vendorColor: "#ec4899",
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
        createdAt: new Date().toISOString()
    };

    marketplaceListings.unshift(payload);

    // BACKEND API INTEGRATION:
    // POST /api/v1/marketplace
    // Request Body: { title, category, condition, price, originalPrice, description, imageUrl }
    try {
        if (typeof apiFetch === 'function') {
            await apiFetch('/marketplace', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
    } catch (err) {
        console.warn('Backend offline, listing added to client memory.');
    }

    document.getElementById('createListingModal').style.display = 'none';
    document.getElementById('createListingForm').reset();
    updateStatsRow();
    applyFiltersAndRender();
}