document.addEventListener('DOMContentLoaded', async () => {
    // 1. Maintain mock token if missing
    if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'mock.eyJzdWIiOiIxIiwibmFtZSI6IlNhcmFoIFJhaG1hbiIsInJvbGUiOiJTVFVERU5UIn0.mock');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const vendorId = urlParams.get('id');

    if (!vendorId) {
        document.getElementById('vendorTitle').textContent = "Vendor not found";
        return;
    }

    await loadVendorData(vendorId);
    await loadVendorListings(vendorId);
    await loadVendorReviews(vendorId);
    setupReviewForm(vendorId);
});

async function loadVendorData(vendorId) {
    try {
        const res = await apiFetch(`/marketplace/vendors/${vendorId}`);
        if (res && res.ok) {
            const vendor = await res.json();
            document.getElementById('vendorTitle').textContent = vendor.vendorName;
            document.getElementById('vendorAvatar').textContent = vendor.vendorName[0].toUpperCase();
            document.getElementById('vendorRating').textContent = (vendor.avgRating || 0).toFixed(1);
            document.getElementById('vendorReviewCount').textContent = vendor.reviewCount || 0;
        } else {
            document.getElementById('vendorTitle').textContent = "Vendor not found";
        }
    } catch (err) {
        console.error(err);
        document.getElementById('vendorTitle').textContent = "Failed to load vendor profile";
    }
}

async function loadVendorListings(vendorId) {
    const grid = document.getElementById('vendorGrid');
    try {
        const res = await apiFetch(`/marketplace/listings?vendorId=${vendorId}`);
        if (res && res.ok) {
            const data = await res.json();
            const items = data.content || [];
            
            if (items.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1;">No listings available for this vendor.</p>';
            } else {
                grid.innerHTML = items.map(createProductCardHTML).join('');
            }
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p>Error loading listings.</p>';
    }
}

async function loadVendorReviews(vendorId) {
    const list = document.getElementById('reviewsList');
    try {
        const res = await apiFetch(`/marketplace/vendors/${vendorId}/reviews`);
        if (res && res.ok) {
            const data = await res.json();
            const reviews = data.content || [];

            if (reviews.length === 0) {
                list.innerHTML = '<p style="color: #64748b;">No reviews yet. Be the first to review!</p>';
            } else {
                list.innerHTML = reviews.map(r => `
                    <div class="review-item">
                        <div style="display: flex; gap: 0.5rem; color: #fbbf24; margin-bottom: 0.5rem;">
                            ${Array(5).fill(0).map((_, i) => `<i class="fa-${i < r.rating ? 'solid' : 'regular'} fa-star"></i>`).join('')}
                        </div>
                        <p style="color: #1e293b; font-size: 0.95rem; margin-bottom: 0.25rem;">${r.comment}</p>
                        <small style="color: #64748b;">${new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        list.innerHTML = '<p>Error loading reviews.</p>';
    }
}

function setupReviewForm(vendorId) {
    const form = document.getElementById('reviewForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(document.getElementById('reviewRating').value);
        const comment = document.getElementById('reviewComment').value;

        try {
            const res = await apiFetch(`/marketplace/vendors/${vendorId}/reviews`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
            });

            if (res && res.ok) {
                form.reset();
                await loadVendorData(vendorId); // Refresh stats
                await loadVendorReviews(vendorId); // Refresh list
                alert("Review submitted successfully!");
            } else {
                alert("Failed to submit review. You may have already reviewed this vendor.");
            }
        } catch (err) {
            alert("An error occurred.");
        }
    });
}

function createProductCardHTML(item) {
    const vendorName = item.vendor ? item.vendor.vendorName : 'Unknown Vendor';
    const vendorInitial = vendorName[0].toUpperCase();
    const daysAgo = Math.max(1, Math.round((new Date() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)));
    const timeStr = daysAgo >= 7 ? `${Math.floor(daysAgo / 7)} week ago` : `${daysAgo} days ago`;
    const soldOverlayHtml = (item.status === 'Sold') ? `<div class="sold-overlay"><div class="sold-badge">SOLD</div></div>` : '';
    const imageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500';

    return `
        <div class="market-card">
            <div class="card-media-wrap">
                <img src="${imageUrl}" alt="Product">
                ${soldOverlayHtml}
            </div>
            <div class="card-details">
                <p style="font-size: 0.95rem; color: #1e293b; font-weight: 500; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${item.description}
                </p>
                <div class="card-pricing">
                    <span class="card-price">BDT ${item.price.toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
}
