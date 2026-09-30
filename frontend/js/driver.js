document.addEventListener('DOMContentLoaded', () => {
    
    // Core Elements
    const loginSection = document.getElementById('loginSection');
    const setupSection = document.getElementById('setupSection');
    const activeSection = document.getElementById('activeSection');
    
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const startTripBtn = document.getElementById('startTripBtn');
    const endTripBtn = document.getElementById('endTripBtn');
    
    const routeSelect = document.getElementById('routeSelect');
    const shuttleSelect = document.getElementById('shuttleSelect');
    const trackingModeSelect = document.getElementById('trackingModeSelect');
    const speedModeSelect = document.getElementById('speedModeSelect');
    const speedModeGroup = document.getElementById('speedModeGroup');
    const activeTripNotice = document.getElementById('activeTripNotice');
    
    const singleTelemetryView = document.getElementById('singleTelemetryView');
    const fleetTelemetryView = document.getElementById('fleetTelemetryView');
    
    const speedDisplay = document.getElementById('speedDisplay');
    const timeDisplay = document.getElementById('timeDisplay');
    const activeRouteName = document.getElementById('activeRouteName');
    const nextStopName = document.getElementById('nextStopName');
    const liveStatusText = document.getElementById('liveStatusText');
    const boardingBanner = document.getElementById('boardingBanner');
    const boardingTimer = document.getElementById('boardingTimer');
    
    const fleetSpeed1 = document.getElementById('fleetSpeed1');
    const fleetNext1 = document.getElementById('fleetNext1');
    const fleetSpeed2 = document.getElementById('fleetSpeed2');
    const fleetNext2 = document.getElementById('fleetNext2');
    
    const logoutBtn = document.getElementById('logoutBtn');
    const driverInfoLabel = document.getElementById('driverInfoLabel');
    
    // Single trip state
    let currentTripId = null;
    let watchId = null;
    let tripStartTime = null;
    let timeInterval = null;
    let telemetryPollInterval = null;
    let stompClient = null;

    // Fleet trip state (Dual bus simulation in 1 tab)
    let isFleetMode = false;
    let fleetTrip1 = null;
    let fleetTrip2 = null;

    const WAYPOINTS_FORWARD = [
        { name: "Notun Bazar", lat: 23.797778, lng: 90.424222 },
        { name: "Family Bazar", lat: 23.798222, lng: 90.429167 },
        { name: "Sayednagar Auto Stand", lat: 23.798778, lng: 90.434972 },
        { name: "Bashundhara Bitumen Gate", lat: 23.799694, lng: 90.443472 },
        { name: "Chef's Table (U-turn Point)", lat: 23.801083, lng: 90.454250 },
        { name: "Mosjid Al Mostofa", lat: 23.800222, lng: 90.448667 },
        { name: "UIU Campus", lat: 23.797417, lng: 90.449944 }
    ];

    const WAYPOINTS_REVERSE = [
        { name: "UIU Campus", lat: 23.797417, lng: 90.449944 },
        { name: "Mosjid Al Mostofa", lat: 23.800222, lng: 90.448667 },
        { name: "Chef's Table (U-turn Point)", lat: 23.801083, lng: 90.454250 },
        { name: "Bashundhara Bitumen Gate", lat: 23.799694, lng: 90.443472 },
        { name: "Sayednagar Auto Stand", lat: 23.798778, lng: 90.434972 },
        { name: "Family Bazar", lat: 23.798222, lng: 90.429167 },
        { name: "Notun Bazar", lat: 23.797778, lng: 90.424222 }
    ];

    // Helper: Safari Keep-Alive
    let safariAudioCtx = null;
    function enableSafariKeepAlive() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!safariAudioCtx) {
                safariAudioCtx = new AudioCtx();
            }
            if (safariAudioCtx.state === 'suspended') {
                safariAudioCtx.resume();
            }
            const osc = safariAudioCtx.createOscillator();
            const gain = safariAudioCtx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain);
            gain.connect(safariAudioCtx.destination);
            osc.start();
        } catch (e) {}
    }

    // Driver account quick switcher
    window.selectDriverAccount = function(email) {
        document.getElementById('email').value = email;
        const btn1 = document.getElementById('btnSelectDriver1');
        const btn2 = document.getElementById('btnSelectDriver2');
        if (email.includes('driver2')) {
            if (btn1) btn1.classList.remove('active');
            if (btn2) btn2.classList.add('active');
        } else {
            if (btn2) btn2.classList.remove('active');
            if (btn1) btn1.classList.add('active');
        }
    };

    if (trackingModeSelect) {
        trackingModeSelect.addEventListener('change', () => {
            if (speedModeGroup) {
                speedModeGroup.style.display = trackingModeSelect.value === 'simulation' ? 'block' : 'none';
            }
        });
    }

    function getDriverToken() {
        return sessionStorage.getItem('driver_token') || sessionStorage.getItem('token');
    }

    function isTokenValid(token) {
        const t = token || getDriverToken();
        if (!t) return false;
        try {
            const base64Url = t.split('.')[1];
            if (!base64Url) return false;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload.exp && (payload.exp * 1000) < Date.now()) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('driver_token');
                return false;
            }
            return true;
        } catch (e) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('driver_token');
            return false;
        }
    }

    function showLoginSection() {
        loginSection.classList.remove('hidden');
        setupSection.classList.add('hidden');
        activeSection.classList.add('hidden');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (driverInfoLabel) driverInfoLabel.style.display = 'none';
    }

    // Check if logged in in THIS tab
    if (getDriverToken() && isTokenValid()) {
        checkExistingSession();
    } else {
        showLoginSection();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (currentTripId) {
                alert('Please end your active trip before logging out.');
                return;
            }
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('driver_token');
            sessionStorage.removeItem('driver_email');
            sessionStorage.removeItem('active_trip_id');
            sessionStorage.removeItem('active_shuttle_id');
            showLoginSection();
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const btn = document.getElementById('loginBtn');
        btn.textContent = 'Logging in...';
        btn.disabled = true;
        
        try {
            const res = await apiFetch('/auth/driver/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (res && res.ok) {
                const data = await res.json();
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('driver_token', data.token);
                sessionStorage.setItem('driver_email', email);
                loginError.style.display = 'none';
                await checkExistingSession();
            } else {
                const errText = await res.text();
                loginError.textContent = errText || 'Invalid credentials';
                loginError.style.display = 'block';
            }
        } catch (error) {
            loginError.textContent = 'Server error. Try again later.';
            loginError.style.display = 'block';
        } finally {
            btn.textContent = 'Log In to Drive';
            btn.disabled = false;
        }
    });

    // Check existing session for THIS tab
    async function checkExistingSession() {
        if (!isTokenValid()) {
            showLoginSection();
            return;
        }

        loginSection.classList.add('hidden');
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        const emailVal = sessionStorage.getItem('driver_email') || document.getElementById('email').value || "";
        if (driverInfoLabel) {
            driverInfoLabel.textContent = emailVal.includes('driver2') ? 'Driver 2 (Rahim)' : 'Driver 1 (Karim)';
            driverInfoLabel.style.display = 'inline-block';
        }

        // Check if THIS SPECIFIC TAB has an ongoing active trip
        const tabTripId = sessionStorage.getItem('active_trip_id');
        if (tabTripId) {
            try {
                const res = await apiFetch('/shuttle-trips/active');
                if (res && res.ok) {
                    const trips = await res.json();
                    const myTrip = trips.find(t => t.id === parseInt(tabTripId));
                    if (myTrip) {
                        currentTripId = myTrip.id;
                        tripStartTime = new Date(myTrip.startedAt || Date.now());
                        activeRouteName.textContent = myTrip.routeId === 1 ? 'Notun Bazar ➔ UIU (Direction A)' : 'UIU ➔ Notun Bazar (Direction B)';
                        
                        if (singleTelemetryView) singleTelemetryView.style.display = 'block';
                        if (fleetTelemetryView) fleetTelemetryView.style.display = 'none';
                        showActiveSection();
                        startTelemetryMonitoring(myTrip.id);
                        return;
                    } else {
                        sessionStorage.removeItem('active_trip_id');
                        sessionStorage.removeItem('active_shuttle_id');
                    }
                }
            } catch (err) {
                console.log('Error verifying tab trip', err);
            }
        }

        // Otherwise show setup section (allows starting Shuttle 1 or Shuttle 2!)
        await showSetupSection();
    }

    async function showSetupSection() {
        loginSection.classList.add('hidden');
        activeSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        
        const emailVal = (sessionStorage.getItem('driver_email') || document.getElementById('email').value || "").toLowerCase();
        const isDriver2 = emailVal.includes('driver2');

        // Check which shuttles are currently active
        let activeShuttleMap = {};
        try {
            const activeRes = await apiFetch('/shuttle-trips/active');
            if (activeRes && activeRes.ok) {
                const activeTrips = await activeRes.json();
                activeTrips.forEach(t => activeShuttleMap[t.shuttleId] = t);
            }
        } catch (e) {}

        const shuttle1Active = !!activeShuttleMap[1];
        const shuttle2Active = !!activeShuttleMap[2];

        // Populate routes
        routeSelect.innerHTML = '';
        const optRoute1 = document.createElement('option');
        optRoute1.value = "1";
        optRoute1.textContent = "Notun Bazar ➔ UIU Campus (Direction A)";
        
        const optRoute2 = document.createElement('option');
        optRoute2.value = "2";
        optRoute2.textContent = "UIU Campus ➔ Notun Bazar (Direction B)";

        // Auto-select opposite route if one shuttle is already running
        if (shuttle1Active && !shuttle2Active) {
            optRoute2.selected = true;
        } else if (shuttle2Active && !shuttle1Active) {
            optRoute1.selected = true;
        } else {
            if (isDriver2) optRoute2.selected = true;
            else optRoute1.selected = true;
        }
        routeSelect.appendChild(optRoute1);
        routeSelect.appendChild(optRoute2);

        // Populate shuttles
        shuttleSelect.innerHTML = '';
        const optShuttle1 = document.createElement('option');
        optShuttle1.value = "1";
        optShuttle1.textContent = `UIU Shuttle 01 (Bus A) ${shuttle1Active ? '• [Already Active in Tab 1]' : '(Available)'}`;
        if (shuttle1Active) optShuttle1.disabled = true;

        const optShuttle2 = document.createElement('option');
        optShuttle2.value = "2";
        optShuttle2.textContent = `UIU Shuttle 02 (Bus B) ${shuttle2Active ? '• [Already Active in Tab 2]' : '(Available)'}`;
        if (shuttle2Active) optShuttle2.disabled = true;

        if (shuttle1Active && !shuttle2Active) {
            optShuttle2.selected = true;
        } else if (shuttle2Active && !shuttle1Active) {
            optShuttle1.selected = true;
        } else {
            if (isDriver2) optShuttle2.selected = true;
            else optShuttle1.selected = true;
        }
        shuttleSelect.appendChild(optShuttle1);
        shuttleSelect.appendChild(optShuttle2);

        // Notice banner
        if (activeTripNotice) {
            if (shuttle1Active && !shuttle2Active) {
                activeTripNotice.style.display = 'block';
                activeTripNotice.style.background = 'rgba(16, 185, 129, 0.15)';
                activeTripNotice.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                activeTripNotice.style.color = '#34d399';
                activeTripNotice.innerHTML = `<i class="fa-solid fa-circle-check"></i> Shuttle 01 (Bus A) is currently active. You can run <strong>Shuttle 02 (Bus B)</strong> in this tab!`;
            } else if (shuttle2Active && !shuttle1Active) {
                activeTripNotice.style.display = 'block';
                activeTripNotice.style.background = 'rgba(16, 185, 129, 0.15)';
                activeTripNotice.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                activeTripNotice.style.color = '#34d399';
                activeTripNotice.innerHTML = `<i class="fa-solid fa-circle-check"></i> Shuttle 02 (Bus B) is currently active. You can run <strong>Shuttle 01 (Bus A)</strong> in this tab!`;
            } else if (shuttle1Active && shuttle2Active) {
                activeTripNotice.style.display = 'block';
                activeTripNotice.style.background = 'rgba(234, 179, 8, 0.15)';
                activeTripNotice.style.borderColor = 'rgba(234, 179, 8, 0.4)';
                activeTripNotice.style.color = '#facc15';
                activeTripNotice.innerHTML = `<i class="fa-solid fa-circle-info"></i> Both Bus A & Bus B are currently in active transit.`;
            } else {
                activeTripNotice.style.display = 'none';
            }
        }
    }

    // Start single bus trip
    startTripBtn.addEventListener('click', async () => {
        enableSafariKeepAlive();

        let routeId = routeSelect.value || "1";
        let shuttleId = shuttleSelect.value || "1";
        
        const btnText = startTripBtn.textContent;
        startTripBtn.textContent = 'Starting trip...';
        startTripBtn.disabled = true;
        
        try {
            const res = await apiFetch('/driver/trips', {
                method: 'POST',
                body: JSON.stringify({
                    routeId: parseInt(routeId),
                    shuttleId: parseInt(shuttleId)
                })
            });
            
            if (res && res.ok) {
                const data = await res.json();
                currentTripId = data.id;
                sessionStorage.setItem('active_trip_id', data.id);
                sessionStorage.setItem('active_shuttle_id', shuttleId);
                isFleetMode = false;
                
                const selectedRouteName = routeSelect.options[routeSelect.selectedIndex].text;
                activeRouteName.textContent = selectedRouteName;
                
                if (singleTelemetryView) singleTelemetryView.style.display = 'block';
                if (fleetTelemetryView) fleetTelemetryView.style.display = 'none';
                
                showActiveSection();
                startTelemetryMonitoring(currentTripId);
            } else {
                const errData = await res.text();
                alert(`Cannot start trip: ${errData || 'This shuttle is already running!'}`);
                startTripBtn.textContent = btnText;
                startTripBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('Error starting trip.');
            startTripBtn.textContent = btnText;
            startTripBtn.disabled = false;
        }
    });

    function showActiveSection() {
        setupSection.classList.add('hidden');
        activeSection.classList.remove('hidden');
        
        if (!tripStartTime) {
            tripStartTime = new Date();
        }
        if (timeInterval) clearInterval(timeInterval);
        timeInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const now = new Date();
        const diff = Math.floor((now - tripStartTime) / 1000);
        const mins = String(Math.floor(diff / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        timeDisplay.textContent = `${mins}:${secs}`;
    }

    // Live Telemetry Sync: Connected to backend Spring Boot ShuttleSimulationService
    function startTelemetryMonitoring(tripId) {
        if (telemetryPollInterval) clearInterval(telemetryPollInterval);

        const syncTelemetry = async () => {
            try {
                const res = await apiFetch('/shuttle-trips/active');
                if (res && res.ok) {
                    const activeTrips = await res.json();
                    if (currentTripId) {
                        const myTrip = activeTrips.find(t => t.id === currentTripId);
                        if (myTrip) {
                            const speed = Math.round(myTrip.currentSpeedKmh || 0);
                            speedDisplay.textContent = speed;
                            
                            const now = Date.now();
                            const elapsed = (now - new Date(myTrip.startedAt).getTime()) / 1000;
                            if (elapsed < 20) {
                                boardingBanner.style.display = 'block';
                                boardingTimer.textContent = `${Math.max(0, 20 - Math.floor(elapsed))}s`;
                                liveStatusText.textContent = 'Stationary • Boarding Passengers';
                                nextStopName.textContent = myTrip.routeId === 1 ? 'Notun Bazar (Boarding)' : 'UIU Campus (Boarding)';
                            } else {
                                boardingBanner.style.display = 'none';
                                liveStatusText.textContent = `Live Backend Simulation (${speed} km/h)`;
                                nextStopName.textContent = myTrip.routeId === 1 ? 'Heading to UIU Campus' : 'Heading to Notun Bazar';
                            }
                        } else {
                            // Trip ended elsewhere
                            alert('This trip has concluded.');
                            await endTrip();
                        }
                    }
                }
            } catch (e) {
                console.error('Error polling telemetry', e);
            }
        };

        syncTelemetry();
        telemetryPollInterval = setInterval(syncTelemetry, 2500);

        // Connect STOMP for sub-second sync
        try {
            if (typeof SockJS !== 'undefined' && typeof Stomp !== 'undefined') {
                const socket = new SockJS('http://localhost:8080/ws-shuttle');
                stompClient = Stomp.over(socket);
                stompClient.debug = () => {};
                stompClient.connect({}, () => {
                    stompClient.subscribe('/topic/trips/active', (msg) => {
                        syncTelemetry();
                    });
                }, () => {});
            }
        } catch (e) {}
    }

    // End Trip
    async function endTrip() {
        if (telemetryPollInterval) clearInterval(telemetryPollInterval);
        if (timeInterval) clearInterval(timeInterval);
        if (watchId) navigator.geolocation.clearWatch(watchId);
        
        endTripBtn.textContent = 'Ending Trip...';
        endTripBtn.disabled = true;

        try {
            if (currentTripId) {
                await apiFetch(`/driver/trips/${currentTripId}/end`, { method: 'POST' });
            }

            sessionStorage.removeItem('active_trip_id');
            sessionStorage.removeItem('active_shuttle_id');
            currentTripId = null;
            tripStartTime = null;

            activeSection.classList.add('hidden');
            setupSection.classList.remove('hidden');
            endTripBtn.textContent = 'End Trip';
            endTripBtn.disabled = false;
            startTripBtn.textContent = 'Start This Shuttle';
            startTripBtn.disabled = false;

            timeDisplay.textContent = '00:00';
            speedDisplay.textContent = '0';
            if (boardingBanner) boardingBanner.style.display = 'none';

            await showSetupSection();

        } catch (error) {
            console.error('Failed to end trip', error);
            endTripBtn.textContent = 'End Trip';
            endTripBtn.disabled = false;
        }
    }

    endTripBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to end active trip?')) return;
        await endTrip();
    });

});
