/**
 * Campus 360 — BloodHero Frontend Logic
 * Real-time emergency donor network & Google Gemini AI dispatch
 */

document.addEventListener('DOMContentLoaded', () => {
    initBloodHero();
});

let currentEmergencyRequests = [];
let currentDonors = [];
let myUserRequests = [];
let selectedGroupFilter = '';
let selectedUrgencyFilter = '';
let selectedDonorGroupFilter = '';
let reqSearchQuery = '';

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function getCurrentStudentId() {
    if (window.currentUser && window.currentUser.id) {
        return window.currentUser.id;
    }
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.userId || payload.sub || 1;
        } catch (e) {}
    }
    return 1;
}

function initBloodHero() {
    setupTabs();
    setupFilters();
    setupStudioLivePreview();
    setupSlipScanner();
    setupEligibilityScreener();
    setupRequestForm();
    setupDonorProfileForm();
    setupDonationModal();
    setupOutsideResolutionModal();

    loadLiveStats();
    loadEmergencyRequests();
    loadDonors();
    loadMyProfile();
    loadMyRequests();
}

/* =====================================================================
   1. Tab Switching
   ===================================================================== */
function setupTabs() {
    const tabBtns = document.querySelectorAll('.blood-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.blood-tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(btn.dataset.tab);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

/* =====================================================================
   2. Live Stats
   ===================================================================== */
async function loadLiveStats() {
    try {
        const res = await fetch('http://localhost:8080/api/v1/blood/stats');
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById('statActiveDonors').textContent = data.activeDonors || 0;
        document.getElementById('statOpenRequests').textContent = data.openRequests || 0;
        document.getElementById('statTotalDonations').textContent = data.totalDonations || 0;
        document.getElementById('statTotalDonors').textContent = data.totalDonors || 0;
    } catch (e) {
        console.warn('Could not load live blood stats:', e);
    }
}

/* =====================================================================
   3. Emergency SOS Feed
   ===================================================================== */
async function loadEmergencyRequests() {
    const container = document.getElementById('requestsFeed');
    if (!container) return;

    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; color: #64748b;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top: 0.75rem; font-weight: 600;">Loading active emergency requests...</p></div>';

    try {
        let url = 'http://localhost:8080/api/v1/blood/requests?status=OPEN';
        if (selectedGroupFilter) url += `&bloodGroup=${encodeURIComponent(selectedGroupFilter)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch requests');
        currentEmergencyRequests = await res.json();

        applyEmergencyFilters();
    } catch (e) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p style="margin-top: 0.5rem; font-weight: 600;">Unable to load blood requests. Please check backend connection.</p></div>`;
    }
}

function applyEmergencyFilters() {
    let filtered = currentEmergencyRequests;

    if (selectedUrgencyFilter) {
        filtered = filtered.filter(r => (r.urgencyLevel || '').toUpperCase() === selectedUrgencyFilter.toUpperCase());
    }

    if (reqSearchQuery) {
        const q = reqSearchQuery.toLowerCase();
        filtered = filtered.filter(r => 
            (r.patientName && r.patientName.toLowerCase().includes(q)) ||
            (r.hospitalName && r.hospitalName.toLowerCase().includes(q)) ||
            (r.hospitalLocation && r.hospitalLocation.toLowerCase().includes(q)) ||
            (r.wardBed && r.wardBed.toLowerCase().includes(q)) ||
            (r.patientCondition && r.patientCondition.toLowerCase().includes(q)) ||
            (r.bloodGroup && r.bloodGroup.toLowerCase().includes(q))
        );
    }

    renderEmergencyRequests(filtered);
}

function renderEmergencyRequests(requests) {
    const container = document.getElementById('requestsFeed');
    if (!container) return;

    const countEl = document.getElementById('reqActiveCount');
    if (countEl) countEl.textContent = requests ? requests.length : 0;

    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 2rem; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem auto;">
                    <i class="fa-solid fa-shield-heart"></i>
                </div>
                <h3 style="color: #0f172a; margin-bottom: 0.35rem; font-size: 1.25rem; font-weight: 800;">No Active Emergencies Found</h3>
                <p style="color: #64748b; font-size: 0.92rem; max-width: 450px; margin: 0 auto 1.2rem auto;">
                    There are no open requests matching your filter criteria. All registered patients and peers are accounted for.
                </p>
                <button class="btn btn-outline" onclick="resetRequestFilters()" style="font-weight: 700;">
                    <i class="fa-solid fa-arrow-rotate-left"></i> Reset Filter
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(r => {
        const urgency = (r.urgencyLevel || 'SAME_DAY').toUpperCase();
        const urgencyClass = urgency.toLowerCase().replace('_', '-');
        const pct = Math.min(100, Math.round(((r.unitsFulfilled || 0) / (r.unitsNeeded || 1)) * 100));

        const mapsQuery = encodeURIComponent(`${r.hospitalName}, ${r.hospitalLocation}`);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        const verifiedBadge = r.isAiVerified 
            ? `<span class="badge-ai-verified"><i class="fa-solid fa-certificate"></i> AI SLIP VERIFIED</span>`
            : `<span style="font-size: 0.72rem; color: #64748b; font-weight: 600;"><i class="fa-solid fa-user-check"></i> Campus Peer Verified</span>`;

        // Compatible groups badges
        const compatPills = (r.compatibleBloodGroups && r.compatibleBloodGroups.length > 0)
            ? r.compatibleBloodGroups.map(bg => `<span class="compat-pill">${escapeHtml(bg)}</span>`).join('')
            : `<span class="compat-pill">${escapeHtml(r.bloodGroup)}</span>`;

        return `
            <div class="emergency-card ${urgencyClass}">
                <div class="emergency-card-topbar">
                    <span class="urgency-badge ${urgencyClass}">
                        <span class="pulse-dot"></span> ${escapeHtml(r.urgencyLevel || 'SAME DAY')}
                    </span>
                    ${verifiedBadge}
                </div>

                <div class="emergency-hero-row">
                    <div class="blood-hero-droplet">
                        <span class="blood-type-text">${escapeHtml(r.bloodGroup)}</span>
                        <span class="blood-sub-text">BLOOD</span>
                    </div>
                    <div class="emergency-hero-info">
                        <div class="patient-name-row">
                            <div class="emergency-patient-name">${escapeHtml(r.patientName)}</div>
                            <span class="units-needed-badge">${r.unitsNeeded || 1} Bag(s) Needed</span>
                        </div>
                        <div class="hospital-title-row">
                            <i class="fa-solid fa-hospital" style="color: #ef4444; font-size: 0.85rem;"></i>
                            <span>${escapeHtml(r.hospitalName)}</span>
                            <a href="${mapsUrl}" target="_blank" title="View Directions on Google Maps">
                                <i class="fa-solid fa-diamond-turn-right" style="color: #2563eb;"></i> Map
                            </a>
                        </div>
                        ${r.wardBed ? `
                        <div class="ward-bed-tag">
                            <i class="fa-solid fa-bed-pulse"></i> ${escapeHtml(r.wardBed)}
                        </div>` : ''}
                    </div>
                </div>

                <div class="emergency-condition-box">
                    <div style="font-weight: 700; font-size: 0.76rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 2px;">
                        <i class="fa-solid fa-notes-medical"></i> Clinical Condition / Notes
                    </div>
                    <div>${escapeHtml(r.patientCondition || 'Emergency patient recovery procedure.')}</div>
                </div>

                <div class="compat-match-strip">
                    <div class="compat-groups-list">
                        <span style="font-weight: 700; color: #475569;">Accepts:</span>
                        ${compatPills}
                    </div>
                    <span class="peer-match-chip clickable ${(r.compatibleDonorsCount || 0) === 0 ? 'zero-match' : ''}" 
                          onclick="openMatchedPeersModal(${r.id})" 
                          title="Click to view matched campus donors">
                        <i class="fa-solid fa-bolt"></i> ${r.compatibleDonorsCount || 0} Peer(s) Match
                        <i class="fa-solid fa-chevron-right" style="font-size: 0.65rem; opacity: 0.7; margin-left: 2px;"></i>
                    </span>
                </div>

                <div class="units-progress-container">
                    <div class="units-progress-header">
                        <span>Fulfillment Status</span>
                        <span><strong>${r.unitsFulfilled || 0} / ${r.unitsNeeded || 1} Arranged</strong> (${pct}%)</span>
                    </div>
                    <div class="units-progress-bar">
                        <div class="units-progress-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>

                <div class="card-actions-grid">
                    <a href="tel:${escapeHtml(r.contactNumber)}" class="btn-card-action btn-card-call">
                        <i class="fa-solid fa-phone"></i> Call (${escapeHtml(r.contactNumber || 'Contact')})
                    </a>
                    <button class="btn-card-action btn-card-whatsapp" onclick="shareToWhatsApp(${r.id})">
                        <i class="fa-brands fa-whatsapp"></i> WhatsApp SOS
                    </button>
                    <button class="btn-card-action btn-card-broadcast" onclick="openBroadcastModal(${r.id})">
                        <i class="fa-solid fa-bullhorn"></i> AI Broadcast Notices
                    </button>
                    <button class="btn-card-action btn-card-donate" onclick="openDonationModal(${r.id})">
                        <i class="fa-solid fa-hand-holding-droplet"></i> I Can Donate
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/* =====================================================================
   4. Donors Directory
   ===================================================================== */
async function loadDonors() {
    const container = document.getElementById('donorsFeed');
    if (!container) return;

    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748b;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top: 0.5rem;">Loading verified donors...</p></div>';

    try {
        let url = 'http://localhost:8080/api/v1/blood/donors';
        const params = [];
        if (selectedDonorGroupFilter) params.push(`bloodGroup=${encodeURIComponent(selectedDonorGroupFilter)}`);
        
        const availableOnlyCheckbox = document.getElementById('availableDonorsOnly');
        if (availableOnlyCheckbox && availableOnlyCheckbox.checked) params.push('availableOnly=true');

        if (params.length > 0) url += `?${params.join('&')}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load donors');
        currentDonors = await res.json();

        renderDonors(currentDonors);
    } catch (e) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p>Unable to load donors directory.</p></div>`;
    }
}

function renderDonors(donors) {
    const container = document.getElementById('donorsFeed');
    if (!container) return;

    if (!donors || donors.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <i class="fa-solid fa-users" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 0.8rem;"></i>
                <h3 style="color: #0f172a; margin-bottom: 0.25rem;">No Donors Found</h3>
                <p style="color: #64748b; font-size: 0.9rem;">Be the first campus hero to register your blood group!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = donors.map(d => {
        const initials = (d.studentName || 'Peer')
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        const isAvail = d.isAvailable && (d.isCooldownOver !== false);
        const statusText = isAvail ? 'Available Now' : `Cooldown (${d.daysUntilEligible || 0}d left)`;
        const statusClass = isAvail ? 'available' : 'cooldown';
        const statusIcon = isAvail ? 'fa-circle-check' : 'fa-hourglass-half';

        return `
            <div class="donor-card">
                <div class="donor-avatar">${initials}</div>
                <div class="donor-info">
                    <div class="donor-name-row">
                        <div class="donor-name">${escapeHtml(d.studentName)}</div>
                        <span class="donor-blood-tag">${escapeHtml(d.bloodGroup)}</span>
                    </div>
                    <div class="donor-meta">
                        ${escapeHtml(d.departmentName || 'Student')} &bull; ID: ${escapeHtml(d.universityId || 'Campus')}
                    </div>
                    <div class="donor-meta" style="color: #0f172a;">
                        <i class="fa-solid fa-location-dot" style="color: #dc2626;"></i> ${escapeHtml(d.hallOrArea || 'Campus Area')}
                    </div>
                    <div>
                        <span class="donor-status-pill ${statusClass}">
                            <i class="fa-solid ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                    <div style="margin-top: 6px;">
                        <a href="tel:${escapeHtml(d.contactNumber)}" class="donor-contact-btn">
                            <i class="fa-solid fa-phone"></i> ${escapeHtml(d.contactNumber || 'Contact')}
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* =====================================================================
   5. Filters Setup
   ===================================================================== */
function setupFilters() {
    // Request Feed Blood Group Chips
    const reqChips = document.querySelectorAll('#reqGroupFilters .group-chip');
    reqChips.forEach(chip => {
        chip.addEventListener('click', () => {
            reqChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedGroupFilter = chip.dataset.group || '';
            loadEmergencyRequests();
        });
    });

    // Request Feed Urgency Filter Chips
    const urgencyChips = document.querySelectorAll('#reqUrgencyFilters .urgency-chip');
    urgencyChips.forEach(chip => {
        chip.addEventListener('click', () => {
            urgencyChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedUrgencyFilter = chip.dataset.urgency || '';
            applyEmergencyFilters();
        });
    });

    // Live Search in Emergency Feed
    const reqSearchInput = document.getElementById('reqSearchInput');
    const clearReqBtn = document.getElementById('clearReqSearchBtn');
    if (reqSearchInput) {
        reqSearchInput.addEventListener('input', (e) => {
            reqSearchQuery = e.target.value.trim();
            if (clearReqBtn) clearReqBtn.style.display = reqSearchQuery ? 'block' : 'none';
            applyEmergencyFilters();
        });
    }
    if (clearReqBtn && reqSearchInput) {
        clearReqBtn.addEventListener('click', () => {
            reqSearchInput.value = '';
            clearReqBtn.style.display = 'none';
            reqSearchQuery = '';
            applyEmergencyFilters();
            reqSearchInput.focus();
        });
    }

    // Donor Directory Filter Chips
    const donorChips = document.querySelectorAll('#donorGroupFilters .group-chip');
    donorChips.forEach(chip => {
        chip.addEventListener('click', () => {
            donorChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedDonorGroupFilter = chip.dataset.group || '';
            loadDonors();
        });
    });

    const availCheckbox = document.getElementById('availableDonorsOnly');
    if (availCheckbox) {
        availCheckbox.addEventListener('change', () => loadDonors());
    }

    // Donor Search by text
    const searchInput = document.getElementById('donorSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderDonors(currentDonors);
                return;
            }
            const filtered = currentDonors.filter(d => 
                (d.studentName && d.studentName.toLowerCase().includes(query)) ||
                (d.hallOrArea && d.hallOrArea.toLowerCase().includes(query)) ||
                (d.bloodGroup && d.bloodGroup.toLowerCase().includes(query))
            );
            renderDonors(filtered);
        });
    }
}

function resetRequestFilters() {
    selectedGroupFilter = '';
    selectedUrgencyFilter = '';
    reqSearchQuery = '';
    document.querySelectorAll('#reqGroupFilters .group-chip').forEach((c, idx) => c.classList.toggle('active', idx === 0));
    document.querySelectorAll('#reqUrgencyFilters .urgency-chip').forEach((c, idx) => c.classList.toggle('active', idx === 0));
    const reqSearch = document.getElementById('reqSearchInput');
    if (reqSearch) reqSearch.value = '';
    const clearReqBtn = document.getElementById('clearReqSearchBtn');
    if (clearReqBtn) clearReqBtn.style.display = 'none';
    loadEmergencyRequests();
}

/* =====================================================================
   5.5 Studio Live Real-Time Card & Broadcast Preview
   ===================================================================== */
function setupStudioLivePreview() {
    // 1. Interactive Urgency Cards Selection
    const urgencyCards = document.querySelectorAll('.urgency-card-option');
    const urgencyInput = document.getElementById('reqUrgencyLevel');

    urgencyCards.forEach(card => {
        card.addEventListener('click', () => {
            urgencyCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const level = card.dataset.urgency || 'SAME_DAY';
            if (urgencyInput) urgencyInput.value = level;
            updateStudioLivePreview();
        });
    });

    // 2. Quick Dhaka Hospital Chips
    const hospitalChips = document.querySelectorAll('.hospital-chip');
    hospitalChips.forEach(chip => {
        chip.addEventListener('click', () => {
            hospitalChips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            const hName = document.getElementById('reqHospitalName');
            const hLoc = document.getElementById('reqHospitalLocation');
            if (hName) hName.value = chip.dataset.name || '';
            if (hLoc) hLoc.value = chip.dataset.loc || '';
            updateStudioLivePreview();
        });
    });

    const hospitalInput = document.getElementById('reqHospitalName');
    if (hospitalInput) {
        hospitalInput.addEventListener('input', () => {
            const val = hospitalInput.value.trim().toLowerCase();
            hospitalChips.forEach(chip => {
                if (chip.dataset.name && chip.dataset.name.toLowerCase() === val) {
                    chip.classList.add('selected');
                } else {
                    chip.classList.remove('selected');
                }
            });
        });
    }

    // 3. Form Input Listeners for Real-Time Preview
    const watchedFields = [
        'reqPatientName', 'reqBloodGroup', 'reqUnitsNeeded', 
        'reqHospitalName', 'reqHospitalLocation', 'reqWardBed', 
        'reqCondition', 'reqContactNumber'
    ];

    watchedFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateStudioLivePreview);
            el.addEventListener('change', updateStudioLivePreview);
        }
    });

    // 4. Preview Switcher Tabs (Feed Card vs WhatsApp)
    const cardTabBtn = document.getElementById('previewTabCardBtn');
    const waTabBtn = document.getElementById('previewTabWABtn');
    const cardContainer = document.getElementById('liveCardPreviewContainer');
    const waContainer = document.getElementById('liveWAPreviewContainer');

    if (cardTabBtn && waTabBtn && cardContainer && waContainer) {
        cardTabBtn.addEventListener('click', () => {
            cardTabBtn.classList.add('active');
            waTabBtn.classList.remove('active');
            cardContainer.style.display = 'block';
            waContainer.style.display = 'none';
        });

        waTabBtn.addEventListener('click', () => {
            waTabBtn.classList.add('active');
            cardTabBtn.classList.remove('active');
            cardContainer.style.display = 'none';
            waContainer.style.display = 'block';
        });
    }

    // Initial sync
    updateStudioLivePreview();
}

function updateStudioLivePreview() {
    const patientName = (document.getElementById('reqPatientName')?.value.trim()) || 'Patient Name';
    const bloodGroup = (document.getElementById('reqBloodGroup')?.value) || 'O+';
    const units = parseInt(document.getElementById('reqUnitsNeeded')?.value) || 1;
    const urgency = (document.getElementById('reqUrgencyLevel')?.value) || 'SAME_DAY';
    const hospitalName = (document.getElementById('reqHospitalName')?.value.trim()) || 'Hospital Name, Dhaka';
    const hospitalLoc = (document.getElementById('reqHospitalLocation')?.value.trim()) || '';
    const wardBed = (document.getElementById('reqWardBed')?.value.trim()) || 'ICU / Cabin Unspecified';
    const condition = (document.getElementById('reqCondition')?.value.trim()) || 'Emergency blood required for patient medical procedure.';
    const contact = (document.getElementById('reqContactNumber')?.value.trim()) || '01711XXXXXX';

    // 1. Update Card Mock Elements
    const mockCard = document.getElementById('liveMockCard');
    const mockUrgencyBadge = document.getElementById('mockUrgencyBadge');
    const mockUrgencyText = document.getElementById('mockUrgencyText');
    const mockBloodGroup = document.getElementById('mockBloodGroup');
    const mockPatientName = document.getElementById('mockPatientName');
    const mockUnitsBadge = document.getElementById('mockUnitsBadge');
    const mockHospitalName = document.getElementById('mockHospitalName');
    const mockWardText = document.getElementById('mockWardText');
    const mockConditionBox = document.getElementById('mockConditionBox');
    const mockCompatPill = document.getElementById('mockCompatPill');
    const mockProgressText = document.getElementById('mockProgressText');

    const urgencyClass = urgency.toLowerCase().replace('_', '-');

    if (mockCard) {
        mockCard.className = `emergency-card ${urgencyClass}`;
    }

    if (mockUrgencyBadge && mockUrgencyText) {
        mockUrgencyBadge.className = `urgency-badge ${urgencyClass}`;
        const labels = { 'CRITICAL': '🚨 CRITICAL', 'SAME_DAY': '⏳ SAME DAY', 'WITHIN_48H': '📅 PLANNED' };
        mockUrgencyText.textContent = labels[urgency] || urgency;
    }

    if (mockBloodGroup) mockBloodGroup.textContent = bloodGroup;
    if (mockPatientName) mockPatientName.textContent = patientName;
    if (mockUnitsBadge) mockUnitsBadge.textContent = `${units} Bag(s) Needed`;
    if (mockHospitalName) mockHospitalName.textContent = hospitalLoc ? `${hospitalName} (${hospitalLoc})` : hospitalName;
    if (mockWardText) mockWardText.textContent = wardBed;
    if (mockConditionBox) mockConditionBox.textContent = condition;
    if (mockProgressText) mockProgressText.textContent = `0 / ${units} Arranged (0%)`;

    // Compatibility pill map
    const compatMap = {
        'O-': 'O-',
        'O+': 'O-, O+',
        'A-': 'O-, A-',
        'A+': 'O-, O+, A-, A+',
        'B-': 'O-, B-',
        'B+': 'O-, O+, B-, B+',
        'AB-': 'O-, A-, B-, AB-',
        'AB+': 'Universal Recipient (All Groups)'
    };
    if (mockCompatPill) mockCompatPill.textContent = compatMap[bloodGroup] || bloodGroup;

    // 2. Update WhatsApp Mockup Text
    const mockWABubble = document.getElementById('mockWABubbleText');
    if (mockWABubble) {
        mockWABubble.textContent = 
`🚨 *URGENT BLOOD REQUIRED (${urgency})* 🚨
🩸 *Blood Group:* ${bloodGroup}
💉 *Units Needed:* ${units} Bag(s)
🏥 *Patient:* ${patientName}
📍 *Hospital:* ${hospitalName}${hospitalLoc ? ', ' + hospitalLoc : ''}
🛌 *Ward/Bed:* ${wardBed}
⚠️ *Condition:* ${condition}
📞 *Direct Call/WhatsApp:* ${contact}
🛡️ *Verified on Campus 360 BloodHero*
_Please forward to campus batch groups!_ 🙏`;
    }
}

/* =====================================================================
   6. Gemini Multimodal Doctor Slip Scanner
   ===================================================================== */
function setupSlipScanner() {
    const dropzone = document.getElementById('slipDropzone');
    const fileInput = document.getElementById('slipFileInput');
    const scannerStatus = document.getElementById('scannerStatus');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processSlipImage(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            processSlipImage(e.target.files[0]);
        }
    });
}

function processSlipImage(file) {
    const dropzone = document.getElementById('slipDropzone');
    const scannerStatus = document.getElementById('scannerStatus');
    const previewContainer = document.getElementById('slipPreviewContainer');
    const previewImg = document.getElementById('slipPreviewImg');

    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file (JPEG, PNG).');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        if (previewImg) previewImg.src = base64Data;
        if (previewContainer) previewContainer.style.display = 'block';

        if (dropzone) dropzone.classList.add('is-scanning');

        if (scannerStatus) {
            scannerStatus.innerHTML = `
                <div style="color: #2563eb; font-weight: 700; padding: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-wand-magic-sparkles fa-spin"></i> 
                    Gemini Vision AI analyzing medical requisition memo...
                </div>
            `;
        }

        try {
            const res = await fetch('http://localhost:8080/api/v1/blood/ai/scan-slip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64Data,
                    mimeType: file.type
                })
            });

            if (!res.ok) throw new Error('AI Scan failed');
            const result = await res.json();

            // Populate form fields
            if (result.patientName) document.getElementById('reqPatientName').value = result.patientName;
            if (result.bloodGroup) document.getElementById('reqBloodGroup').value = result.bloodGroup;
            if (result.unitsNeeded) document.getElementById('reqUnitsNeeded').value = result.unitsNeeded;
            if (result.hospitalName) document.getElementById('reqHospitalName').value = result.hospitalName;
            if (result.hospitalLocation) document.getElementById('reqHospitalLocation').value = result.hospitalLocation;
            if (result.wardBed) document.getElementById('reqWardBed').value = result.wardBed;
            if (result.patientCondition) document.getElementById('reqCondition').value = result.patientCondition;

            if (result.urgencyLevel) {
                const urgencyInput = document.getElementById('reqUrgencyLevel');
                if (urgencyInput) urgencyInput.value = result.urgencyLevel;
                document.querySelectorAll('.urgency-card-option').forEach(card => {
                    card.classList.toggle('selected', card.dataset.urgency === result.urgencyLevel);
                });
            }

            // Flag as AI slip verified
            window.lastScannedSlipVerified = true;

            // Trigger real-time studio preview update!
            updateStudioLivePreview();

            if (scannerStatus) {
                scannerStatus.innerHTML = `
                    <div style="background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 0.9rem; border-radius: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fa-solid fa-circle-check" style="font-size: 1.1rem;"></i> 
                        Doctor's slip parsed successfully! Details auto-filled and ready for broadcast.
                    </div>
                `;
            }
        } catch (err) {
            console.error('Slip scanning error:', err);
            if (scannerStatus) {
                scannerStatus.innerHTML = `
                    <div style="background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; padding: 0.9rem; border-radius: 10px; font-weight: 600;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Could not read prescription text automatically. Please verify or fill manually below.
                    </div>
                `;
            }
        } finally {
            if (dropzone) dropzone.classList.remove('is-scanning');
        }
    };
    reader.readAsDataURL(file);
}

/* =====================================================================
   7. Post Blood Request Form
   ===================================================================== */
function setupRequestForm() {
    const form = document.getElementById('createRequestForm');
    const previewBtn = document.getElementById('previewBroadcastBtn');

    if (previewBtn) {
        previewBtn.addEventListener('click', async () => {
            const payload = collectFormData();
            previewBtn.disabled = true;
            previewBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

            try {
                const res = await fetch('http://localhost:8080/api/v1/blood/ai/generate-broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const broadcast = await res.json();
                showBroadcastModal(broadcast);
            } catch (err) {
                alert('Could not generate broadcast notices.');
            } finally {
                previewBtn.disabled = false;
                previewBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Preview AI Social Broadcasts';
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Broadcasting SOS...';

            const payload = collectFormData();
            payload.isAiVerified = !!window.lastScannedSlipVerified;

            try {
                const res = await fetch('http://localhost:8080/api/v1/blood/requests', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Failed to create request');
                const created = await res.json();

                // Save locally to tracked IDs so it is guaranteed to show even if auth token changed
                try {
                    let myTracked = JSON.parse(localStorage.getItem('bloodhero_my_request_ids') || '[]');
                    if (!myTracked.includes(created.id)) {
                        myTracked.unshift(created.id);
                        localStorage.setItem('bloodhero_my_request_ids', JSON.stringify(myTracked));
                    }
                } catch (e) {}

                form.reset();
                window.lastScannedSlipVerified = false;

                // Reset Slip Scanner preview if any
                const previewCont = document.getElementById('slipPreviewContainer');
                if (previewCont) previewCont.style.display = 'none';
                const scannerSt = document.getElementById('scannerStatus');
                if (scannerSt) scannerSt.innerHTML = '';

                // Refresh live requests, stats, and My Requests list
                loadLiveStats();
                loadEmergencyRequests();
                await loadMyRequests();

                // Scroll to My Requests card on the right so user sees it instantly
                const myCard = document.getElementById('myStudioRequestsCard');
                if (myCard) {
                    myCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    myCard.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.4)';
                    setTimeout(() => {
                        myCard.style.boxShadow = '';
                    }, 2500);
                }

                alert('🚨 Emergency Blood Request broadcasted successfully! It is now listed under "My Active SOS Requests" on the right.');
            } catch (err) {
                alert('Error creating blood request: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i> Publish Emergency SOS';
            }
        });
    }
}

function collectFormData() {
    return {
        requesterId: parseInt(getCurrentStudentId(), 10),
        patientName: document.getElementById('reqPatientName').value.trim(),
        bloodGroup: document.getElementById('reqBloodGroup').value,
        unitsNeeded: parseInt(document.getElementById('reqUnitsNeeded').value) || 1,
        hospitalName: document.getElementById('reqHospitalName').value.trim(),
        hospitalLocation: document.getElementById('reqHospitalLocation').value.trim(),
        wardBed: document.getElementById('reqWardBed').value.trim(),
        urgencyLevel: document.getElementById('reqUrgencyLevel').value,
        neededDate: document.getElementById('reqNeededDate').value || new Date().toISOString(),
        contactNumber: document.getElementById('reqContactNumber').value.trim(),
        patientCondition: document.getElementById('reqCondition').value.trim()
    };
}

/* =====================================================================
   8. Broadcast Modal & WhatsApp Sharing
   ===================================================================== */
function shareToWhatsApp(requestId) {
    const req = currentEmergencyRequests.find(r => r.id === requestId);
    if (!req) return;

    let text = req.aiFormattedBroadcast;
    if (!text) {
        text = `🚨 *URGENT BLOOD REQUIRED (${req.urgencyLevel})* 🚨\n\n` +
               `🩸 *Blood Group:* ${req.bloodGroup}\n` +
               `📦 *Units Needed:* ${req.unitsNeeded} Bag(s)\n` +
               `🏥 *Hospital:* ${req.hospitalName} (${req.hospitalLocation})\n` +
               `📍 *Ward/Bed:* ${req.wardBed || 'General Ward'}\n` +
               `📞 *Direct Contact:* ${req.contactNumber}\n\n` +
               `🛡️ *Verified on Campus 360 BloodHero*\nPlease share!`;
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
}

async function openBroadcastModal(requestId) {
    const req = currentEmergencyRequests.find(r => r.id === requestId);
    if (!req) return;

    // Call AI to generate full formats
    try {
        const res = await fetch('http://localhost:8080/api/v1/blood/ai/generate-broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientName: req.patientName,
                bloodGroup: req.bloodGroup,
                unitsNeeded: req.unitsNeeded,
                hospitalName: req.hospitalName,
                hospitalLocation: req.hospitalLocation,
                wardBed: req.wardBed,
                urgencyLevel: req.urgencyLevel,
                neededDate: req.neededDate,
                contactNumber: req.contactNumber,
                patientCondition: req.patientCondition
            })
        });
        const broadcast = await res.json();
        showBroadcastModal(broadcast);
    } catch (e) {
        alert('Could not generate notices.');
    }
}

function showBroadcastModal(broadcast) {
    let overlay = document.getElementById('broadcastModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'broadcastModalOverlay';
        overlay.className = 'blood-modal-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="blood-modal">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; font-size: 1.25rem; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-bullhorn" style="color: #ef4444;"></i> AI Emergency Broadcasts
                </h3>
                <button onclick="closeBroadcastModal()" style="border: none; background: none; font-size: 1.2rem; cursor: pointer; color: #64748b;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- WhatsApp Box -->
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: #15803d; font-size: 0.9rem;"><i class="fa-brands fa-whatsapp"></i> WhatsApp Status / Group Format</span>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem;" onclick="copyTextToClipboard('whatsappNoticeBox')">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
                <textarea id="whatsappNoticeBox" readonly style="width: 100%; height: 110px; padding: 10px; font-size: 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit; background: #f8fafc;">${escapeHtml(broadcast.whatsappText || '')}</textarea>
            </div>

            <!-- Facebook Box -->
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: #1d4ed8; font-size: 0.9rem;"><i class="fa-brands fa-facebook"></i> Facebook Batch / Club Group Post</span>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem;" onclick="copyTextToClipboard('fbNoticeBox')">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
                <textarea id="fbNoticeBox" readonly style="width: 100%; height: 110px; padding: 10px; font-size: 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit; background: #f8fafc;">${escapeHtml(broadcast.facebookText || '')}</textarea>
            </div>

            <!-- SMS Box -->
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: #b45309; font-size: 0.9rem;"><i class="fa-solid fa-comment-sms"></i> 160-Char SMS Flash</span>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem;" onclick="copyTextToClipboard('smsNoticeBox')">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                </div>
                <textarea id="smsNoticeBox" readonly style="width: 100%; height: 60px; padding: 10px; font-size: 0.85rem; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit; background: #f8fafc;">${escapeHtml(broadcast.smsText || '')}</textarea>
            </div>

            <button class="btn btn-primary" style="width: 100%;" onclick="closeBroadcastModal()">Done</button>
        </div>
    `;

    overlay.style.display = 'flex';
}

function closeBroadcastModal() {
    const overlay = document.getElementById('broadcastModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function copyTextToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.select();
    navigator.clipboard.writeText(el.value).then(() => {
        alert('Notice copied to clipboard!');
    });
}

/* =====================================================================
   8.5 Record / Log Donation Modal
   ===================================================================== */
function openDonationModal(requestId) {
    const req = currentEmergencyRequests.find(r => r.id === requestId);
    if (!req) return;

    const overlay = document.getElementById('recordDonationModalOverlay');
    const pEl = document.getElementById('donateModalPatient');
    const hEl = document.getElementById('donateModalHospital');
    const uEl = document.getElementById('donateModalUnits');
    const idInput = document.getElementById('donateModalRequestId');

    if (pEl) pEl.textContent = req.patientName + ` (${req.bloodGroup})`;
    if (hEl) hEl.textContent = `${req.hospitalName} • ${req.hospitalLocation}`;
    if (uEl) uEl.textContent = `Status: ${req.unitsFulfilled || 0} / ${req.unitsNeeded} Bags Arranged`;
    if (idInput) idInput.value = req.id;

    if (overlay) overlay.style.display = 'flex';
}

function closeDonationModal() {
    const overlay = document.getElementById('recordDonationModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function setupDonationModal() {
    const form = document.getElementById('recordDonationForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestId = document.getElementById('donateModalRequestId').value;
        const notes = document.getElementById('donateModalNotes').value.trim() || 'Donated 1 unit on campus';
        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recording...';
        }

        try {
            const res = await fetch(`http://localhost:8080/api/v1/blood/requests/${requestId}/donate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });

            if (!res.ok) throw new Error('Failed to record donation');
            await res.json();

            alert('🩸 Life-saving donation logged! Thank you for answering the call.');
            closeDonationModal();
            loadLiveStats();
            loadEmergencyRequests();
            loadDonors();
        } catch (err) {
            alert('Could not record donation: ' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm Donation';
            }
        }
    });
}

/* =====================================================================
   9. "Can I Donate?" AI Triage Screener
   ===================================================================== */
function setupEligibilityScreener() {
    const queryInput = document.getElementById('screenerQuery');
    const checkBtn = document.getElementById('checkEligibilityBtn');
    const resultBox = document.getElementById('screenerResult');
    const chips = document.querySelectorAll('.screener-chip');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (queryInput) queryInput.value = chip.textContent.trim();
            runScreener();
        });
    });

    if (checkBtn) {
        checkBtn.addEventListener('click', () => runScreener());
    }

    if (queryInput) {
        queryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                runScreener();
            }
        });
    }

    async function runScreener() {
        const query = queryInput ? queryInput.value.trim() : '';
        if (!query) return;

        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
        }

        if (resultBox) {
            resultBox.innerHTML = '<div style="text-align: center; padding: 2rem; color: #2563eb;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p style="margin-top: 0.5rem;">Evaluating health criteria with AI...</p></div>';
            resultBox.style.display = 'block';
        }

        try {
            const res = await fetch('http://localhost:8080/api/v1/blood/ai/screen-eligibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });
            const data = await res.json();

            const isEligible = data.eligible;
            const verdictColor = isEligible ? '#15803d' : '#b45309';
            const verdictBg = isEligible ? '#dcfce7' : '#fef3c7';
            const icon = isEligible ? 'fa-circle-check' : 'fa-triangle-exclamation';

            resultBox.innerHTML = `
                <div style="background: ${verdictBg}; border-radius: 12px; padding: 1.5rem; border: 1px solid ${verdictColor};">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.75rem;">
                        <i class="fa-solid ${icon}" style="font-size: 1.5rem; color: ${verdictColor};"></i>
                        <h4 style="margin: 0; color: ${verdictColor}; font-size: 1.15rem; font-weight: 700;">
                            ${escapeHtml(data.verdict || 'Evaluation Complete')}
                        </h4>
                    </div>
                    <p style="color: #334155; font-size: 0.95rem; margin-bottom: 0.8rem; line-height: 1.5;">
                        ${escapeHtml(data.explanation || '')}
                    </p>
                    <div style="background: white; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; color: #475569; margin-bottom: 0.75rem;">
                        <strong>Timeline:</strong> ${escapeHtml(data.nextEligibleDate || 'Available Now')}
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b; font-style: italic;">
                        <i class="fa-solid fa-shield-halved"></i> ${escapeHtml(data.disclaimer || '')}
                    </div>
                </div>
            `;
        } catch (e) {
            resultBox.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Could not process AI screening. Please try again.</div>`;
        } finally {
            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fa-solid fa-stethoscope"></i> Check Eligibility';
            }
        }
    }
}

/* =====================================================================
   10. My Donor Profile
   ===================================================================== */
async function loadMyProfile() {
    try {
        const res = await fetch('http://localhost:8080/api/v1/blood/donors/me');
        if (!res.ok) return;
        const profile = await res.json();
        if (!profile) return;

        const availSwitch = document.getElementById('myAvailabilityToggle');
        if (availSwitch) availSwitch.checked = !!profile.isAvailable;

        const bgSelect = document.getElementById('myBloodGroup');
        if (bgSelect) bgSelect.value = profile.bloodGroup || 'O+';

        const phoneInput = document.getElementById('myContactNumber');
        if (phoneInput) phoneInput.value = profile.contactNumber || '';

        const hallInput = document.getElementById('myHallArea');
        if (hallInput) hallInput.value = profile.hallOrArea || '';

        const lastDateInput = document.getElementById('myLastDonationDate');
        if (lastDateInput && profile.lastDonationDate) lastDateInput.value = profile.lastDonationDate;

        const notesInput = document.getElementById('myNotes');
        if (notesInput) notesInput.value = profile.notes || '';
    } catch (e) {
        console.warn('Could not load current user donor profile:', e);
    }
}

function setupDonorProfileForm() {
    const form = document.getElementById('donorProfileForm');
    const availSwitch = document.getElementById('myAvailabilityToggle');

    if (availSwitch) {
        availSwitch.addEventListener('change', async () => {
            try {
                await fetch('http://localhost:8080/api/v1/blood/donors/availability', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isAvailable: availSwitch.checked })
                });
                alert(`Your availability status is now: ${availSwitch.checked ? 'AVAILABLE' : 'OFFLINE'}`);
                loadLiveStats();
                loadDonors();
            } catch (e) {
                alert('Could not update availability.');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                bloodGroup: document.getElementById('myBloodGroup').value,
                contactNumber: document.getElementById('myContactNumber').value.trim(),
                hallOrArea: document.getElementById('myHallArea').value.trim(),
                lastDonationDate: document.getElementById('myLastDonationDate').value || null,
                notes: document.getElementById('myNotes').value.trim(),
                isAvailable: document.getElementById('myAvailabilityToggle') ? document.getElementById('myAvailabilityToggle').checked : true
            };

            try {
                const res = await fetch('http://localhost:8080/api/v1/blood/donors/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Registration failed');
                alert('🎉 Donor Profile successfully saved! Thank you for being a Campus BloodHero.');
                loadLiveStats();
                loadDonors();
            } catch (err) {
                alert('Error saving donor profile: ' + err.message);
            }
        });
    }
}

/* =====================================================================
   Helper Functions
   ===================================================================== */
function formatDateTime(isoString) {
    if (!isoString) return 'Today';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return isoString;
    }
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

/* =====================================================================
   9. My Emergency Requests Tracking & Outside Resolution Manager
   ===================================================================== */
async function loadMyRequests() {
    const studioList = document.getElementById('myStudioRequestsList');
    const profileList = document.getElementById('myProfileRequestsList');
    const countBadge = document.getElementById('myRequestsCountBadge');

    try {
        const studentId = getCurrentStudentId();
        const res = await fetch(`http://localhost:8080/api/v1/blood/requests/me?studentId=${studentId}`, {
            headers: getAuthHeaders()
        });
        
        let requests = [];
        if (res.ok) {
            requests = await res.json();
        }

        // Also check any locally tracked request IDs from this browser
        try {
            const myTracked = JSON.parse(localStorage.getItem('bloodhero_my_request_ids') || '[]');
            if (myTracked.length > 0) {
                const allReqRes = await fetch('http://localhost:8080/api/v1/blood/requests');
                if (allReqRes.ok) {
                    const allRequests = await allReqRes.json();
                    const existingIds = new Set(requests.map(r => r.id));
                    const locallyTracked = allRequests.filter(r => myTracked.includes(r.id) && !existingIds.has(r.id));
                    requests = [...locallyTracked, ...requests];
                }
            }
        } catch (storageErr) {
            console.warn('LocalStorage tracked requests error', storageErr);
        }

        myUserRequests = requests || [];

        const activeCount = myUserRequests.filter(r => r.status === 'OPEN').length;
        if (countBadge) {
            countBadge.textContent = `${activeCount} Active`;
            countBadge.style.background = activeCount > 0 ? '#fee2e2' : '#f1f5f9';
            countBadge.style.color = activeCount > 0 ? '#dc2626' : '#64748b';
        }

        const html = renderMyRequestsHtml(myUserRequests);
        if (studioList) studioList.innerHTML = html;
        if (profileList) profileList.innerHTML = html;

    } catch (err) {
        console.error('loadMyRequests error:', err);
        const errHtml = `<div style="text-align: center; padding: 1rem; color: #ef4444; font-size: 0.8rem;">Unable to load your requests. Please refresh.</div>`;
        if (studioList) studioList.innerHTML = errHtml;
        if (profileList) profileList.innerHTML = errHtml;
    }
}

function renderMyRequestsHtml(requests) {
    if (!requests || requests.length === 0) {
        return `
        <div style="text-align: center; padding: 1.25rem 1rem; color: #94a3b8; font-size: 0.82rem; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;">
            <i class="fa-solid fa-file-circle-check fa-2x" style="color: #cbd5e1; margin-bottom: 0.4rem; display: block;"></i>
            No emergency requests created by you yet.<br>Publish one using the form on the left!
        </div>`;
    }

    return requests.map(req => {
        const isCritical = req.urgencyLevel === 'CRITICAL';
        const isOpen = req.status === 'OPEN';
        const isFulfilled = req.status === 'FULFILLED';
        const isClosed = req.status === 'CLOSED';

        const unitsNeeded = req.unitsNeeded || 1;
        const unitsFulfilled = req.unitsFulfilled || 0;
        const pct = Math.min(100, Math.round((unitsFulfilled / unitsNeeded) * 100));

        let statusClass = 'active-sos';
        let statusBadge = '<span class="my-req-status-pill open">🔴 ACTIVE SOS</span>';
        if (isFulfilled) {
            statusClass = 'fulfilled-sos';
            statusBadge = '<span class="my-req-status-pill fulfilled">🟢 FULFILLED</span>';
        } else if (isClosed) {
            statusClass = 'closed-sos';
            statusBadge = '<span class="my-req-status-pill closed">⚪ CLOSED</span>';
        }

        let resolutionSnippet = '';
        if (req.resolutionSource) {
            const sourceMap = {
                'QUANTUM_FOUNDATION': '🏢 Quantum / Red Crescent',
                'FAMILY_NETWORK': '👨‍👩‍👧 Family Network',
                'HOSPITAL_BANK': '🏥 Hospital Blood Bank',
                'POSTPONED_STABILIZED': '🩺 Patient Stabilized',
                'OUTSIDE_DONOR': '🤝 External Donor',
                'CAMPUS_PEER': '🎓 Campus Peer'
            };
            const label = sourceMap[req.resolutionSource] || req.resolutionSource;
            resolutionSnippet = `
            <div style="font-size: 0.74rem; color: #047857; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-circle-check"></i> Resolved via <strong>${label}</strong>
                ${req.resolutionNotes ? ` &bull; <em>${escapeHtml(req.resolutionNotes)}</em>` : ''}
            </div>`;
        }

        return `
        <div class="my-request-item ${statusClass}" data-req-id="${req.id}">
            <div class="my-req-top">
                <div>
                    <div class="my-req-patient-title">
                        <span style="background: ${isCritical ? '#ef4444' : '#f97316'}; color: white; padding: 2px 7px; border-radius: 4px; font-size: 0.78rem;">
                            ${escapeHtml(req.bloodGroup)}
                        </span>
                        <span>${escapeHtml(req.patientName)}</span>
                    </div>
                    <div class="my-req-hospital">
                        <i class="fa-solid fa-hospital" style="color: #94a3b8;"></i> ${escapeHtml(req.hospitalName || 'Hospital')} 
                        ${req.wardBed ? `&bull; ${escapeHtml(req.wardBed)}` : ''}
                    </div>
                </div>
                <div>${statusBadge}</div>
            </div>

            <div class="my-req-progress-text">
                <span>Progress: ${unitsFulfilled} of ${unitsNeeded} Bags Arranged</span>
                <span>${pct}%</span>
            </div>
            <div class="my-req-progress-bar">
                <div class="my-req-progress-fill" style="width: ${pct}%;"></div>
            </div>

            ${resolutionSnippet}

            <div class="my-req-actions-bar">
                ${isOpen ? `
                    <button class="my-req-btn my-req-btn-add" onclick="quickAddOutsideBag(${req.id})" title="Record 1 bag arranged externally">
                        <i class="fa-solid fa-plus"></i> +1 Bag Arranged Outside
                    </button>
                    <button class="my-req-btn my-req-btn-resolve" onclick="openOutsideResolutionModal(${req.id})">
                        <i class="fa-solid fa-circle-xmark"></i> Blood Managed Outside / Close
                    </button>
                    <button class="my-req-btn my-req-btn-standdown" onclick="openStandDownModal(${req.id})" title="Copy Stand-Down text for WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i> Stand-Down
                    </button>
                ` : `
                    <button class="my-req-btn my-req-btn-standdown" onclick="openStandDownModal(${req.id})">
                        <i class="fa-brands fa-whatsapp"></i> Copy Stand-Down Announcement
                    </button>
                    <button class="my-req-btn" style="background: #f1f5f9; color: #475569;" onclick="reopenRequest(${req.id})">
                        <i class="fa-solid fa-rotate-left"></i> Re-open SOS
                    </button>
                `}
            </div>
        </div>`;
    }).join('');
}

/* Quick Increment: +1 Bag Arranged Outside */
async function quickAddOutsideBag(requestId) {
    try {
        const payload = {
            unitsAdded: 1,
            markClosed: false,
            source: 'OUTSIDE_DONOR',
            notes: '+1 Bag arranged externally'
        };

        const res = await fetch(`http://localhost:8080/api/v1/blood/requests/${requestId}/outside-resolution`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to update bags');
        const updated = await res.json();

        loadMyRequests();
        loadEmergencyRequests();
        loadLiveStats();

        if (updated.unitsFulfilled >= updated.unitsNeeded) {
            if (confirm(`🎉 Great news! All ${updated.unitsNeeded} bag(s) have been arranged.\n\nWould you like to generate and copy the 'Stand-Down / Thank You' WhatsApp announcement now?`)) {
                openStandDownModal(requestId);
            }
        }
    } catch (err) {
        alert('Error recording external bag: ' + err.message);
    }
}

/* Outside Resolution Modal Handler */
function setupOutsideResolutionModal() {
    const form = document.getElementById('outsideResolutionForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestId = document.getElementById('resolveRequestId').value;
        const source = document.querySelector('input[name="resSource"]:checked')?.value || 'QUANTUM_FOUNDATION';
        const unitsAddedStr = document.getElementById('resolveUnitsToAdd').value;
        const unitsAdded = parseInt(unitsAddedStr) || 1;
        const markClosed = document.getElementById('resolveMarkClosed').checked;
        const notes = document.getElementById('resolveNotes').value.trim();

        try {
            const payload = {
                source: source,
                unitsAdded: unitsAdded,
                markClosed: markClosed,
                notes: notes
            };

            const res = await fetch(`http://localhost:8080/api/v1/blood/requests/${requestId}/outside-resolution`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to resolve request');
            const data = await res.json();

            closeOutsideResolutionModal();
            loadMyRequests();
            loadEmergencyRequests();
            loadLiveStats();

            // Prompt stand-down broadcast
            setTimeout(() => {
                openStandDownModal(requestId);
            }, 300);

        } catch (err) {
            alert('Error updating resolution: ' + err.message);
        }
    });
}

function openOutsideResolutionModal(requestId) {
    const req = myUserRequests.find(r => r.id === requestId) || currentEmergencyRequests.find(r => r.id === requestId);
    if (!req) return;

    document.getElementById('resolveRequestId').value = req.id;
    document.getElementById('resolveModalPatient').textContent = req.patientName;
    document.getElementById('resolveModalHospital').textContent = `${req.hospitalName || 'Hospital'} (${req.hospitalLocation || 'Dhaka'})`;
    document.getElementById('resolveModalGroup').textContent = req.bloodGroup;
    document.getElementById('resolveModalProgress').textContent = `Bags: ${req.unitsFulfilled || 0} / ${req.unitsNeeded || 1} Arranged`;

    document.getElementById('resolveNotes').value = '';
    document.getElementById('resolveMarkClosed').checked = true;

    const overlay = document.getElementById('outsideResolutionModalOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function closeOutsideResolutionModal() {
    const overlay = document.getElementById('outsideResolutionModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

/* Stand Down Modal Handler */
function openStandDownModal(requestId) {
    const req = myUserRequests.find(r => r.id === requestId) || currentEmergencyRequests.find(r => r.id === requestId);
    if (!req) return;

    const sourceMap = {
        'QUANTUM_FOUNDATION': 'via Quantum Foundation / Red Crescent',
        'FAMILY_NETWORK': 'via family members & external network',
        'HOSPITAL_BANK': 'via hospital in-house blood bank',
        'POSTPONED_STABILIZED': 'as patient condition stabilized',
        'OUTSIDE_DONOR': 'via voluntary donor',
        'CAMPUS_PEER': 'via university BloodHero donor'
    };

    const sourceText = req.resolutionSource ? (sourceMap[req.resolutionSource] || 'via external donor') : 'via generous donors';

    const broadcastMsg = 
`✅ *BLOOD REQUIREMENT RESOLVED (STAND DOWN)* ✅

Alhamdulillah! The urgent blood requirement for *${req.patientName}* (Blood Group: *${req.bloodGroup}*) at *${req.hospitalName || 'Hospital'}* has been successfully arranged (${sourceText}).

❤️ *Heartfelt gratitude and dua* to all campus peers, BloodHeroes, and well-wishers who called, shared the emergency broadcast, or stood by ready to donate.

🙏 *Please call off further donor searches.*

— Verified via Campus 360 BloodHero Network`;

    const preview = document.getElementById('standDownTextPreview');
    if (preview) {
        preview.textContent = broadcastMsg;
    }

    const overlay = document.getElementById('standDownModalOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function closeStandDownModal() {
    const overlay = document.getElementById('standDownModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function copyStandDownMessage() {
    const preview = document.getElementById('standDownTextPreview');
    if (!preview) return;

    const text = preview.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyStandDownBtn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied to Clipboard!';
            btn.style.background = '#15803d';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.background = '#25d366';
            }, 2000);
        }
    }).catch(err => {
        alert('Failed to copy: ' + err.message);
    });
}

async function reopenRequest(requestId) {
    if (!confirm('Are you sure you want to re-open this emergency SOS request to public feed?')) return;
    try {
        const res = await fetch(`http://localhost:8080/api/v1/blood/requests/${requestId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'OPEN' })
        });
        if (!res.ok) throw new Error('Failed to reopen request');
        loadMyRequests();
        loadEmergencyRequests();
        loadLiveStats();
    } catch (err) {
        alert('Error reopening request: ' + err.message);
    }
}

// =====================================================================
// Matched Campus Peer Donors Modal Logic
// =====================================================================
let currentMatchedRequest = null;

async function openMatchedPeersModal(requestId) {
    const modal = document.getElementById('matchedPeersModalOverlay');
    const headerInfo = document.getElementById('matchedModalHeaderInfo');
    const body = document.getElementById('matchedModalBody');
    if (!modal || !headerInfo || !body) return;

    // Open modal with loading state
    modal.style.display = 'flex';
    body.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
            <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: #ef4444; margin-bottom: 0.8rem;"></i>
            <p style="font-weight: 600; font-size: 0.95rem;">Finding compatible campus donors...</p>
        </div>
    `;

    try {
        // Find or fetch request details
        let req = (typeof currentRequests !== 'undefined') ? currentRequests.find(r => r.id === requestId) : null;
        if (!req) {
            const reqRes = await fetch(`http://localhost:8080/api/v1/blood/requests/${requestId}`, {
                headers: getAuthHeaders()
            });
            if (reqRes.ok) req = await reqRes.json();
        }
        currentMatchedRequest = req;

        // Render header info
        if (req) {
            const compatPills = (req.compatibleBloodGroups || [req.bloodGroup])
                .map(bg => `<span class="compat-pill" style="font-size: 0.72rem; padding: 2px 7px;">${escapeHtml(bg)}</span>`)
                .join('');

            headerInfo.innerHTML = `
                <div class="matched-peers-header-card">
                    <div>
                        <div class="matched-peers-patient-title">
                            <span>${escapeHtml(req.patientName || 'Emergency Patient')}</span>
                            <span class="urgency-pill urgency-${(req.urgencyLevel || 'CRITICAL').toLowerCase()}" style="font-size: 0.7rem; padding: 2px 8px;">
                                ${escapeHtml(req.urgencyLevel || 'CRITICAL')}
                            </span>
                        </div>
                        <div class="matched-peers-subtext">
                            <span><i class="fa-solid fa-hospital" style="color: #ef4444;"></i> ${escapeHtml(req.hospitalName || 'Hospital')}</span>
                            <span>•</span>
                            <span><strong>${req.unitsNeeded || 1} Bag(s)</strong> Needed</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: #475569;">Compatible Groups:</span>
                            ${compatPills}
                        </div>
                    </div>
                    <div class="matched-peers-blood-pill">
                        ${escapeHtml(req.bloodGroup || 'O+')}
                        <div style="font-size: 0.65rem; font-weight: 600; opacity: 0.9; text-transform: uppercase;">Needed</div>
                    </div>
                </div>
            `;
        } else {
            headerInfo.innerHTML = '';
        }

        // Fetch matched donors from backend endpoint
        const res = await fetch(`http://localhost:8080/api/v1/blood/requests/${requestId}/matched-donors`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch matched donors');
        const donors = await res.json();

        renderMatchedPeersList(req, donors);
    } catch (err) {
        body.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: #ef4444;">
                <i class="fa-solid fa-circle-exclamation fa-2x" style="margin-bottom: 0.8rem;"></i>
                <p style="font-weight: 600;">Unable to load matched peers right now.</p>
                <p style="font-size: 0.85rem; color: #64748b;">${escapeHtml(err.message)}</p>
                <button class="btn btn-outline" style="margin-top: 1rem; font-size: 0.85rem;" onclick="openMatchedPeersModal(${requestId})">
                    <i class="fa-solid fa-arrow-rotate-right"></i> Try Again
                </button>
            </div>
        `;
    }
}

function renderMatchedPeersList(req, donors) {
    const body = document.getElementById('matchedModalBody');
    if (!body) return;

    if (!donors || donors.length === 0) {
        body.innerHTML = `
            <div class="matched-peers-empty">
                <div style="width: 52px; height: 52px; border-radius: 50%; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 0.8rem auto;">
                    <i class="fa-solid fa-user-slash"></i>
                </div>
                <h4 style="color: #0f172a; font-size: 1.05rem; margin-bottom: 0.35rem; font-weight: 800;">No Available Donors Matched Yet</h4>
                <p style="color: #64748b; font-size: 0.88rem; max-width: 420px; margin: 0 auto 1.2rem auto; line-height: 1.5;">
                    No registered campus peers matching <strong>${escapeHtml(req?.bloodGroup || 'this')}</strong> compatibility are currently toggled "Available".
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" style="background: #25d366; border-color: #25d366; font-size: 0.85rem; font-weight: 700;" onclick="shareToWhatsApp(${req ? req.id : ''})">
                        <i class="fa-brands fa-whatsapp"></i> Broadcast SOS to Hall/Batches
                    </button>
                    <button class="btn btn-outline" style="font-size: 0.85rem;" onclick="viewAllDonorsInDirectory()">
                        <i class="fa-solid fa-users"></i> Browse Full Directory
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const cardsHtml = donors.map(d => {
        const initials = (d.studentName || 'Peer')
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        const isAvail = d.isAvailable && (d.isCooldownOver !== false);
        const cooldownStatus = isAvail
            ? '<span class="matched-peer-avail-badge"><i class="fa-solid fa-circle-check"></i> Available Now</span>'
            : `<span style="font-size: 0.72rem; color: #d97706; background: #fef3c7; padding: 1px 7px; border-radius: 6px; font-weight: 700;"><i class="fa-solid fa-hourglass-half"></i> Cooldown (${d.daysUntilEligible || 0}d)</span>`;

        const phoneClean = (d.contactNumber || '').replace(/[^0-9+]/g, '');

        return `
            <div class="matched-peer-card">
                <div class="matched-peer-left">
                    <div class="matched-peer-avatar">${initials}</div>
                    <div class="matched-peer-info">
                        <div class="matched-peer-name-row">
                            <span class="matched-peer-name">${escapeHtml(d.studentName || 'Campus Peer')}</span>
                            <span class="matched-peer-dept">${escapeHtml(d.departmentName || 'Student')}</span>
                        </div>
                        <div class="matched-peer-meta">
                            <span><i class="fa-solid fa-location-dot" style="color: #64748b;"></i> ${escapeHtml(d.hallOrArea || 'Campus Area')}</span>
                            ${cooldownStatus}
                            ${d.totalDonations ? `<span style="font-weight: 600; color: #475569;">⭐ ${d.totalDonations} Donation(s)</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="matched-peer-right">
                    <span class="matched-peer-group-pill">${escapeHtml(d.bloodGroup)}</span>
                    ${phoneClean ? `
                        <a href="tel:${phoneClean}" class="btn-peer-action btn-peer-call" title="Call Donor Directly">
                            <i class="fa-solid fa-phone"></i> Call
                        </a>
                        <button class="btn-peer-action btn-peer-whatsapp" onclick="messageMatchedPeerWhatsApp('${escapeHtml(d.studentName)}', '${phoneClean}', ${req ? req.id : 'null'})" title="Send WhatsApp Emergency Message">
                            <i class="fa-brands fa-whatsapp"></i> Chat
                        </button>
                    ` : `
                        <span style="font-size: 0.75rem; color: #94a3b8; font-style: italic;">No Phone</span>
                    `}
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div style="font-size: 0.82rem; font-weight: 700; color: #475569; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fa-solid fa-users"></i> ${donors.length} Verified Peer Donor(s) Available</span>
            <span style="font-size: 0.76rem; color: #16a34a; font-weight: 600;">Direct Campus Contacts</span>
        </div>
        <div class="matched-peers-list">
            ${cardsHtml}
        </div>
    `;
}

function closeMatchedPeersModal() {
    const modal = document.getElementById('matchedPeersModalOverlay');
    if (modal) modal.style.display = 'none';
}

function messageMatchedPeerWhatsApp(peerName, contact, requestId) {
    const req = currentMatchedRequest || ((typeof currentRequests !== 'undefined') ? currentRequests.find(r => r.id === requestId) : null);
    const patient = req ? req.patientName : 'an emergency patient';
    const group = req ? req.bloodGroup : 'blood';
    const hospital = req ? req.hospitalName : 'the hospital';
    const contactNum = req ? req.contactNumber : '';

    const text = `Assalamu Alaikum ${peerName || 'Brother/Sister'},\n\nWe urgently need *${group}* blood for *${patient}* at *${hospital}* via Campus 360 BloodHero.\n\nYou are listed as an available compatible donor on campus. Could you please let us know if you can donate today?\n\nRequester Contact: ${contactNum}\nThank you so much!`;

    const cleanNumber = contact.replace(/[^0-9]/g, '');
    let fullPhone = cleanNumber;
    if (fullPhone.startsWith('01')) fullPhone = '880' + fullPhone.substring(1);

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function viewAllDonorsInDirectory() {
    closeMatchedPeersModal();
    const directoryTabBtn = document.querySelector('.blood-tab-btn[data-tab="donors"]');
    if (directoryTabBtn) {
        directoryTabBtn.click();
    } else if (typeof switchBloodTab === 'function') {
        switchBloodTab('donors');
    }
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
    const matchedOverlay = document.getElementById('matchedPeersModalOverlay');
    if (matchedOverlay) {
        matchedOverlay.addEventListener('click', (e) => {
            if (e.target === matchedOverlay) closeMatchedPeersModal();
        });
    }
});
