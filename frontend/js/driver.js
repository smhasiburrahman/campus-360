document.addEventListener('DOMContentLoaded', () => {
    
    const loginSection = document.getElementById('loginSection');
    const setupSection = document.getElementById('setupSection');
    const activeSection = document.getElementById('activeSection');
    
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const startTripBtn = document.getElementById('startTripBtn');
    const endTripBtn = document.getElementById('endTripBtn');
    
    const routeSelect = document.getElementById('routeSelect');
    const shuttleSelect = document.getElementById('shuttleSelect');
    
    const speedDisplay = document.getElementById('speedDisplay');
    const timeDisplay = document.getElementById('timeDisplay');
    const activeRouteName = document.getElementById('activeRouteName');
    const logoutBtn = document.getElementById('logoutBtn');
    
    let currentTripId = null;
    let watchId = null;
    let tripStartTime = null;
    let timeInterval = null;

    // Check if already logged in as driver
    if (localStorage.getItem('token') && window.currentUser && window.currentUser.role === 'driver') {
        showSetupSection();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (currentTripId) {
                alert('Please end your active trip before logging out.');
                return;
            }
            localStorage.removeItem('token');
            window.currentUser = null;
            window.location.reload();
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
                localStorage.setItem('token', data.token);
                // Ensure currentUser is updated immediately
                window.currentUser = { id: data.id, role: 'driver', accountType: 'DRIVER' };
                loginError.style.display = 'none';
                showSetupSection();
            } else {
                const errText = await res.text();
                loginError.textContent = errText || 'Invalid credentials';
                loginError.style.display = 'block';
            }
        } catch (error) {
            loginError.textContent = 'Server error. Try again later.';
            loginError.style.display = 'block';
        } finally {
            btn.textContent = 'Log In';
            btn.disabled = false;
        }
    });

    async function showSetupSection() {
        loginSection.classList.add('hidden');
        setupSection.classList.remove('hidden');
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        // Fetch routes and shuttles
        try {
            const routesRes = await apiFetch('/shuttle-routes');
            const shuttlesRes = await apiFetch('/shuttles');
            
            if (routesRes && routesRes.ok) {
                const routes = await routesRes.json();
                routeSelect.innerHTML = '<option value="" disabled selected>Select a route</option>';
                routes.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = r.name;
                    routeSelect.appendChild(opt);
                });
            }
            
            if (shuttlesRes && shuttlesRes.ok) {
                const shuttles = await shuttlesRes.json();
                shuttleSelect.innerHTML = '<option value="" disabled selected>Select a shuttle</option>';
                shuttles.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `${s.vehicleNo} (Cap: ${s.capacity})`;
                    shuttleSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('Error loading dropdowns', error);
        }
    }

    startTripBtn.addEventListener('click', async () => {
        const routeId = routeSelect.value;
        const shuttleId = shuttleSelect.value;
        
        if (!routeId || !shuttleId) {
            alert('Please select both a route and a shuttle.');
            return;
        }
        
        const btnText = startTripBtn.textContent;
        startTripBtn.textContent = 'Starting...';
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
                
                const selectedRouteName = routeSelect.options[routeSelect.selectedIndex].text;
                activeRouteName.textContent = selectedRouteName;
                
                startGPSWatch();
                showActiveSection();
            } else {
                alert('Failed to start trip.');
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
        
        tripStartTime = new Date();
        timeInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const now = new Date();
        const diff = Math.floor((now - tripStartTime) / 1000);
        const mins = String(Math.floor(diff / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        timeDisplay.textContent = `${mins}:${secs}`;
    }

    let lastPatchTime = 0;

    function startGPSWatch() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        
        watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, speed, heading } = position.coords;
                
                // Speed is in m/s, convert to km/h
                let speedKmh = 0;
                if (speed && speed > 0) {
                    speedKmh = speed * 3.6;
                }
                
                speedDisplay.textContent = Math.round(speedKmh);
                
                // Throttle requests to max 1 every 3 seconds
                const nowMs = Date.now();
                if (nowMs - lastPatchTime < 3000) {
                    return;
                }
                lastPatchTime = nowMs;

                // Patch location to backend
                try {
                    await apiFetch(`/driver/trips/${currentTripId}/location`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            latitude,
                            longitude,
                            heading: heading || 0,
                            speedKmh
                        })
                    });
                } catch (error) {
                    console.error('Failed to patch location', error);
                }
            },
            (error) => {
                console.error('GPS Watch Error:', error);
                // On mobile devices, sometimes this throws immediately if permission denied
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    }

    endTripBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to end this trip?')) return;
        
        endTripBtn.textContent = 'Ending...';
        endTripBtn.disabled = true;
        
        try {
            const res = await apiFetch(`/driver/trips/${currentTripId}/end`, {
                method: 'POST'
            });
            
            if (res && res.ok) {
                // Cleanup
                navigator.geolocation.clearWatch(watchId);
                clearInterval(timeInterval);
                
                // Reset UI
                activeSection.classList.add('hidden');
                setupSection.classList.remove('hidden');
                endTripBtn.textContent = 'End Trip';
                endTripBtn.disabled = false;
                startTripBtn.textContent = 'Start Trip';
                startTripBtn.disabled = false;
                
                timeDisplay.textContent = '00:00';
                speedDisplay.textContent = '0';
                currentTripId = null;
            }
        } catch (error) {
            console.error('Failed to end trip', error);
            endTripBtn.textContent = 'End Trip';
            endTripBtn.disabled = false;
        }
    });

});
