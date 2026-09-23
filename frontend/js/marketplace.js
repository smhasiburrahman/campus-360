let currentUserId = 1;
let currentUserRole = 'STUDENT';
let currentVendorId = null;
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
        currentUserRole = payload.role || 'STUDENT';
    } catch (e) {
        console.warn('Token decoding skipped, default student user applied.');
    }

    // Attempt to fetch current user's vendor profile on load
    try {
        const res = await apiFetch('/marketplace/vendors/me');
        if (res && res.ok) {
            const vendor = await res.json();
            currentVendorId = vendor.id;
        }
    } catch (e) {
        // user has no vendor profile yet
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
        
        
    }

    if (logoutBtn) {
        
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
    
    const vendorModal = document.getElementById('createVendorModal');
    const closeVendorBtn = document.getElementById('closeVendorModalBtn');
    const cancelVendorBtn = document.getElementById('cancelVendorModalBtn');
    const vendorForm = document.getElementById('createVendorForm');

    if (openModalBtn) {
        openModalBtn.addEventListener('click', async () => {
            if (currentUserRole !== 'STUDENT' && currentUserRole !== 'ROLE_STUDENT') {
                alert("Only students can create marketplace listings.");
                return;
            }
            
            try {
                const res = await apiFetch('/marketplace/vendors/me');
                if (res && res.ok) {
                    // Vendor profile exists
                    modal.style.display = 'flex';
                } else if (res && res.status === 404) {
                    // Needs to create a vendor profile
                    vendorModal.style.display = 'flex';
                } else {
                    alert("Could not verify vendor status.");
                }
            } catch (err) {
                console.warn("Backend offline, mocking vendor profile.");
                modal.style.display = 'flex';
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => modal.style.display = 'none');
    
    if (closeVendorBtn) closeVendorBtn.addEventListener('click', () => vendorModal.style.display = 'none');
    if (cancelVendorBtn) cancelVendorBtn.addEventListener('click', () => vendorModal.style.display = 'none');

    const detailsModal = document.getElementById('listingDetailsModal');
    const closeDetailsBtn = document.getElementById('closeDetailsModalBtn');
    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => detailsModal.style.display = 'none');
    
    // Create Vendor Form Submit
    if (vendorForm) {
        vendorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const vendorName = document.getElementById('vendorNameInput').value;
            
            try {
                const res = await apiFetch('/marketplace/vendors/me', {
                    method: 'PUT',
                    body: JSON.stringify({ vendorName: vendorName, bio: '' })
                });
                if (res && res.ok) {
                    vendorModal.style.display = 'none';
                    modal.style.display = 'flex'; // Proceed to list item
                }
            } catch (err) {
                alert("Error creating vendor profile.");
            }
        });
    }

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
        // GET /api/v1/marketplace/listings?page=0&size=50
        const res = await apiFetch('/marketplace/listings');
        if (res && res.ok) {
            const data = await res.json();
            marketplaceListings = data.content || [];
            apiSuccess = true;
        }
    } catch (err) {
        console.warn('Backend offline, using fallback dynamic mock marketplace data.');
    }

    // Backend is fully responsible for marketplace listings data

    updateStatsRow();
    applyFiltersAndRender();
}

/* ==========================================================================
   4. STATS COMPUTATION
   ========================================================================== */
function updateStatsRow() {
    const total = marketplaceListings.length;
    const active = marketplaceListings.filter(item => !(item.status && item.status.toLowerCase() === 'sold')).length;
    const saved = marketplaceListings.filter(item => item.isBookmarked).length;

    // Distinct verified vendors count
    const verifiedVendors = new Set(
        marketplaceListings.filter(item => item.vendor).map(item => item.vendor.vendorName)
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

    // Category Filter (Extract from description tag e.g. [Textbooks - Good])
    if (activeCategory !== 'ALL') {
        list = list.filter(item => {
            if (!item.description) return false;
            const descLower = item.description.toLowerCase();
            return descLower.includes(`[${activeCategory.toLowerCase()} -`);
        });
    }

    // Available Only Toggle
    if (showAvailableOnly) {
        list = list.filter(item => !(item.status && item.status.toLowerCase() === 'sold'));
    }

    // Search Query Filter
    const query = (document.getElementById('marketSearchInput')?.value || '').toLowerCase().trim();
    if (query) {
        list = list.filter(item => 
            (item.description && item.description.toLowerCase().includes(query)) ||
            (item.vendor && item.vendor.vendorName && item.vendor.vendorName.toLowerCase().includes(query))
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
    const vendorName = item.vendor ? item.vendor.vendorName : 'Unknown Vendor';
    const vendorInitial = vendorName[0].toUpperCase();

    // Time Ago calculation
    const daysAgo = Math.max(1, Math.round((new Date() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)));
    const timeStr = daysAgo >= 7 ? `${Math.floor(daysAgo / 7)} week ago` : `${daysAgo} days ago`;

    // Status check (backend returns lowercase)
    const currentStatus = item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()) : 'Available';

    // Sold overlay
    const soldOverlayHtml = (currentStatus === 'Sold') ? `
        <div class="sold-overlay">
            <div class="sold-badge">SOLD</div>
        </div>
    ` : '';
    
    const imageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';

    return `
        <div class="market-card" id="listing-card-${item.id}" onclick="showListingDetails(${item.id})" style="cursor: pointer;">
            <div class="card-media-wrap">
                <img src="${imageUrl}" alt="Product Image">
                
                <!-- Bookmark Button: Generic polymorphic bookmark endpoint -->
                <button class="bookmark-btn" onclick="event.stopPropagation(); toggleBookmark(${item.id})" title="Save to bookmarks">
                    <i class="fa-regular fa-bookmark"></i>
                </button>

                ${soldOverlayHtml}
            </div>

            <div class="card-details">
                <p style="font-size: 0.95rem; color: #1e293b; font-weight: 500; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${item.description}">
                    ${item.description}
                </p>

                <div class="card-pricing">
                    <span class="card-price">BDT ${item.price.toLocaleString()}</span>
                </div>

                <div class="card-vendor-footer">
                    <!-- Vendor Profile Affordance -->
                    <a href="vendor-profile.html?id=${item.vendor ? item.vendor.id : ''}" onclick="event.stopPropagation();" class="vendor-profile-link" title="${vendorName}">
                        <span class="vendor-avatar" style="background: #2563eb">${vendorInitial}</span>
                        <span>${vendorName}</span>
                    </a>
                    <span class="listing-post-time">${timeStr}</span>
                </div>
            </div>
        </div>
    `;
}

function showListingDetails(id) {
    const item = marketplaceListings.find(i => i.id === id);
    if (!item) return;

    const vendorName = item.vendor ? item.vendor.vendorName : 'Unknown Vendor';
    const vendorInitial = vendorName[0].toUpperCase();
    const daysAgo = Math.max(1, Math.round((new Date() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)));
    const timeStr = daysAgo >= 7 ? `${Math.floor(daysAgo / 7)} week ago` : `${daysAgo} days ago`;
    const imageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';

    document.getElementById('detailsImage').src = imageUrl;
    document.getElementById('detailsPrice').textContent = `BDT ${item.price.toLocaleString()}`;
    document.getElementById('detailsDescription').textContent = item.description;
    
    document.getElementById('detailsVendorAvatar').textContent = vendorInitial;
    document.getElementById('detailsVendorName').textContent = vendorName;
    document.getElementById('detailsTime').textContent = timeStr;
    
    const currentStatus = item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()) : 'Available';

    const msgBtn = document.getElementById('detailsMessageBtn');
    if (!item.contactEnabled || currentStatus === 'Sold') {
        msgBtn.style.display = 'none';
    } else {
        msgBtn.style.display = 'inline-block';
        msgBtn.onclick = (e) => {
            e.stopPropagation();
            alert("Messaging system is not implemented in this demo.");
        };
    }

    const isOwner = (currentVendorId !== null && item.vendor && item.vendor.id === currentVendorId);
    const statusDisplay = document.getElementById('detailsStatusDisplay');
    const statusControl = document.getElementById('detailsStatusControl');
    const statusSelect = document.getElementById('detailsStatusSelect');

    if (isOwner) {
        statusDisplay.style.display = 'none';
        statusControl.style.display = 'block';
        statusSelect.value = currentStatus;
        statusSelect.onchange = (e) => updateListingStatus(item.id, e.target.value);
    } else {
        statusControl.style.display = 'none';
        statusDisplay.style.display = 'inline-block';
        statusDisplay.textContent = currentStatus;
        // Give it a color based on status
        if (currentStatus === 'Sold') {
            statusDisplay.style.backgroundColor = '#fecdd3';
            statusDisplay.style.color = '#e11d48';
        } else {
            statusDisplay.style.backgroundColor = '#dcfce7';
            statusDisplay.style.color = '#16a34a';
        }
    }

    document.getElementById('listingDetailsModal').style.display = 'flex';
}

async function updateListingStatus(id, newStatus) {
    try {
        if (typeof apiFetch === 'function') {
            const res = await apiFetch(`/marketplace/listings/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus, showStatus: true })
            });
            if (res && res.ok) {
                // Update local memory and re-render grid to show "SOLD" overlay
                const updatedListing = await res.json();
                const index = marketplaceListings.findIndex(i => i.id === id);
                if (index !== -1) {
                    marketplaceListings[index].status = updatedListing.status;
                    applyFiltersAndRender();
                }
            } else {
                alert("Failed to update status.");
            }
        }
    } catch (e) {
        console.warn("Backend offline, updating status locally.");
        const index = marketplaceListings.findIndex(i => i.id === id);
        if (index !== -1) {
            marketplaceListings[index].status = newStatus;
            applyFiltersAndRender();
        }
    }
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
    const rawDescription = document.getElementById('listingDescription').value;
    const imageUrl = document.getElementById('listingImageUrl').value;

    // Combine into a single description since backend only stores description
    const fullDescription = `[${category} - ${condition}] ${title}\n\n${rawDescription}`;

    const payload = {
        description: fullDescription,
        price: price,
        imageUrls: imageUrl ? [imageUrl] : [],
        showStatus: true,
        contactEnabled: true
    };

    // BACKEND API INTEGRATION:
    // POST /api/v1/marketplace/listings
    try {
        if (typeof apiFetch === 'function') {
            const res = await apiFetch('/marketplace/listings', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res && res.ok) {
                const newListing = await res.json();
                marketplaceListings.unshift(newListing);
                
                document.getElementById('createListingModal').style.display = 'none';
                document.getElementById('createListingForm').reset();
                updateStatsRow();
                applyFiltersAndRender();
            } else {
                const errData = await res.json();
                alert('Failed to publish listing: ' + (errData.message || 'Unknown error'));
            }
        }
    } catch (err) {
        console.warn('Backend offline, listing added to client memory.');
        payload.id = Date.now();
        payload.vendor = { id: 1, vendorName: "Mock Vendor", avgRating: 5.0, reviewCount: 1 };
        payload.status = "Available";
        payload.createdAt = new Date().toISOString();
        marketplaceListings.unshift(payload);
        
        document.getElementById('createListingModal').style.display = 'none';
        document.getElementById('createListingForm').reset();
        updateStatsRow();
        applyFiltersAndRender();
    }
}