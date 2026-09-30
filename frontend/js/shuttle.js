document.addEventListener('DOMContentLoaded', async () => {
    
    // Exact Route Waypoints
    const ROUTE_STOPS = [
        { id: 1, name: "Notun Bazar", lat: 23.797778, lng: 90.424222 },
        { id: 2, name: "Family Bazar", lat: 23.798222, lng: 90.429167 },
        { id: 3, name: "Sayednagar Auto Stand", lat: 23.798778, lng: 90.434972 },
        { id: 4, name: "Bashundhara Bitumen Gate", lat: 23.799694, lng: 90.443472 },
        { id: 5, name: "Chef's Table (U-turn Point)", lat: 23.801083, lng: 90.454250 },
        { id: 6, name: "Mosjid Al Mostofa", lat: 23.800222, lng: 90.448667 },
        { id: 7, name: "UIU Campus", lat: 23.797417, lng: 90.449944 }
    ];

    // Initialize Leaflet Map centered on the route corridor
    const map = L.map('map', {
        zoomControl: false
    }).setView([23.7992, 90.4385], 14);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Draw Route Background Corridor Path
    const fullRouteCoords = ROUTE_STOPS.map(s => [s.lat, s.lng]);
    L.polyline(fullRouteCoords, {
        color: '#94a3b8',
        weight: 4,
        opacity: 0.5,
        dashArray: '6, 8'
    }).addTo(map);

    // Add Stop Markers on Map
    ROUTE_STOPS.forEach(stop => {
        const stopMarker = L.circleMarker([stop.lat, stop.lng], {
            radius: 6,
            fillColor: '#38bdf8',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95
        }).addTo(map);
        
        stopMarker.bindTooltip(`📍 <b>${stop.name}</b><br><small style="color:#93c5fd;">Click to set as boarding stop</small>`, {
            permanent: false,
            direction: 'top',
            className: 'stop-label-tooltip'
        });

        stopMarker.on('click', () => {
            window.switchStudentStop(stop.id);
            if (!selectedTripForDirections) {
                const tripIds = Object.keys(activeTripsData);
                if (tripIds.length > 0) {
                    window.startDirections(tripIds[0], stop.id);
                }
            }
        });
    });

    const activeRoutesList = document.getElementById('activeRoutesList');
    const fleetCountBadge = document.getElementById('fleetCountBadge');
    
    // State management
    const markers = {};
    const activeTripsData = {};
    let routeMap = {};
    let shuttleMap = {};
    let stompClient = null;
    let selectedTripForDirections = null;
    let studentLocation = { lat: 23.798222, lng: 90.429167, stopId: 2, name: "Family Bazar" };
    let directionsPolyline = null;
    let userMarker = null;
    let initialMapBoundsSet = false;

    // Helper: Haversine distance in km
    function getDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Helper: Project point P onto line segment AB to find exact leg & distance
    function projectPointOnSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
        const abx = bLng - aLng;
        const aby = bLat - aLat;
        const apx = pLng - aLng;
        const apy = pLat - aLat;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0) {
            return { distKm: getDistanceKm(pLat, pLng, aLat, aLng), t: 0, projLat: aLat, projLng: aLng };
        }
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));
        const projLat = aLat + t * aby;
        const projLng = aLng + t * abx;
        return {
            distKm: getDistanceKm(pLat, pLng, projLat, projLng),
            t: t,
            projLat,
            projLng
        };
    }

    // Helper: Determine if trip is Direction A (to UIU) or Direction B (to Notun Bazar)
    function isForwardDirection(trip) {
        if (trip.routeId === 1) return true;
        if (trip.routeId === 2) return false;
        const routeName = (routeMap[trip.routeId] || "").toLowerCase();
        if (routeName.includes("direction a") || (routeName.includes("notun") && routeName.includes("uiu") && routeName.indexOf("notun") < routeName.indexOf("uiu"))) {
            return true;
        }
        if (routeName.includes("direction b") || (routeName.includes("notun") && routeName.includes("uiu") && routeName.indexOf("uiu") < routeName.indexOf("notun"))) {
            return false;
        }
        return true;
    }

    // Check if trip is in the initial 20-second boarding delay
    function getBoardingRemainingSec(trip) {
        if (!trip.startedAt) return 0;
        const startTime = new Date(trip.startedAt).getTime();
        const now = Date.now();
        const diffSec = Math.floor((now - startTime) / 1000);
        return diffSec < 20 ? (20 - diffSec) : 0;
    }

    // Calculate generic ETA to final destination (for default view)
    function calculateDestinationEta(trip) {
        if (!trip.currentLatitude || !trip.currentLongitude) return "~18 mins";
        const isForward = isForwardDirection(trip);
        const destStop = isForward ? ROUTE_STOPS[ROUTE_STOPS.length - 1] : ROUTE_STOPS[0];
        const distKm = getDistanceKm(trip.currentLatitude, trip.currentLongitude, destStop.lat, destStop.lng);
        const mins = Math.max(2, Math.ceil((distKm / 18) * 60));
        return `~${mins} mins (${distKm.toFixed(1)} km)`;
    }

    // Custom Marker Icon with Pulse and direction colors
    function createShuttleIcon(isForward, isBoarding) {
        const dirClass = isForward ? 'shuttle-icon-forward' : 'shuttle-icon-reverse';
        const boardingClass = isBoarding ? 'shuttle-boarding' : '';
        const iconName = isForward ? 'fa-bus' : 'fa-bus-simple';
        return L.divIcon({
            className: `custom-shuttle-icon ${dirClass} ${boardingClass}`,
            html: `
                <div class="shuttle-marker-wrapper">
                    <div class="shuttle-marker-pulse"></div>
                    <div class="shuttle-marker-icon"><i class="fa-solid ${iconName}"></i></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    // Connect to WebSocket via SockJS + STOMP
    function connectWebSocket() {
        try {
            const socket = new SockJS('http://localhost:8080/ws-shuttle');
            stompClient = Stomp.over(socket);
            stompClient.debug = () => {}; // Mute verbose logs

            stompClient.connect({}, () => {
                console.log('Connected to Shuttle WebSocket');
                
                stompClient.subscribe('/topic/trips', (message) => {
                    const trip = JSON.parse(message.body);
                    handleLocationUpdate(trip);
                });

                stompClient.subscribe('/topic/trips/end', (message) => {
                    const tripId = JSON.parse(message.body);
                    removeTrip(tripId);
                });

                // Load initial active trips
                loadActiveTrips();
            }, (error) => {
                console.warn('STOMP Connection failed, fallback to 3s polling', error);
                loadActiveTrips();
            });
        } catch (e) {
            console.warn('WebSocket init failed, fallback to polling', e);
            loadActiveTrips();
        }
    }

    // Load active trips via REST fallback
    async function loadActiveTrips() {
        try {
            const [routesRes, shuttlesRes] = await Promise.all([
                apiFetch('/shuttle-routes'),
                apiFetch('/shuttles')
            ]);
            
            if (routesRes && routesRes.ok) {
                const routes = await routesRes.json();
                routes.forEach(r => routeMap[r.id] = r.name);
            }
            if (shuttlesRes && shuttlesRes.ok) {
                const shuttles = await shuttlesRes.json();
                shuttles.forEach(s => shuttleMap[s.id] = s.vehicleNo);
            }

            // Get active trips
            const tripsRes = await apiFetch('/shuttle-trips/active');
            if (tripsRes && tripsRes.ok) {
                const trips = await tripsRes.json();
                renderTrips(trips);
            }
        } catch (error) {
            console.error('Error loading active trips', error);
            if (activeRoutesList) {
                activeRoutesList.innerHTML = '<div style="color: var(--danger); padding: 0.8rem; font-size: 0.8rem;">Failed to load shuttles.</div>';
            }
        }
    }

    function renderTrips(trips) {
        if (!activeRoutesList) return;
        activeRoutesList.innerHTML = '';
        
        // Update fleet count badge in header
        if (fleetCountBadge) {
            fleetCountBadge.textContent = trips.length;
        }

        if (trips.length === 0) {
            activeRoutesList.innerHTML = `
                <div style="text-align: center; padding: 1.25rem 0.8rem; color: #94a3b8; font-size: 0.8rem;">
                    <i class="fa-solid fa-clock" style="font-size: 1.5rem; margin-bottom: 0.4rem; display: block; opacity: 0.5;"></i>
                    No shuttles active right now.<br><small style="color: #64748b;">Trips appear live when drivers start.</small>
                </div>
            `;
            // Remove markers
            Object.keys(markers).forEach(removeTrip);
            return;
        }

        // Clean up ended trips
        const currentTripIds = new Set(trips.map(t => t.id));
        Object.keys(activeTripsData).forEach(id => {
            if (!currentTripIds.has(parseInt(id))) {
                removeTrip(id);
            }
        });

        const bounds = [];

        trips.forEach(trip => {
            activeTripsData[trip.id] = trip;
            if (!trip.lastPingTime) trip.lastPingTime = Date.now();

            const isForward = isForwardDirection(trip);
            const routeName = isForward ? "Notun Bazar ➔ UIU" : "UIU ➔ Notun Bazar";
            const shuttleName = shuttleMap[trip.shuttleId] || (trip.shuttleId === 1 ? "UIU Shuttle 01 (Bus A)" : "UIU Shuttle 02 (Bus B)");
            const boardingSec = getBoardingRemainingSec(trip);
            const isBoarding = boardingSec > 0;
            const destEta = calculateDestinationEta(trip);

            // Add or update compact sidebar card
            let card = document.getElementById(`route-card-${trip.id}`);
            if (!card) {
                card = document.createElement('div');
                card.id = `route-card-${trip.id}`;
                card.className = 'route-card';
                activeRoutesList.appendChild(card);
            }

            const badgeClass = isBoarding ? 'badge-boarding' : (isForward ? 'badge-forward' : 'badge-reverse');
            const statusText = isBoarding ? `BOARDING (${boardingSec}s)` : 'LIVE';

            card.innerHTML = `
                <div class="route-card-header">
                    <span class="route-name">${shuttleName}</span>
                    <span class="badge-direction ${badgeClass}" id="badge-${trip.id}">${statusText}</span>
                </div>
                <div class="route-direction-sub">${routeName}</div>
                <div class="route-detail">
                    <span><i class="fa-solid fa-gauge-high"></i> <span id="speed-${trip.id}">${Math.round(trip.currentSpeedKmh || 0)}</span> km/h</span>
                    <span><i class="fa-solid fa-flag-checkered"></i> <span id="dest-eta-${trip.id}">${destEta}</span></span>
                </div>
                <button class="btn-directions" onclick="window.startDirections(${trip.id})">
                    <i class="fa-solid fa-location-arrow"></i> Track & Live ETA
                </button>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-directions')) return;
                if (markers[trip.id]) {
                    map.flyTo(markers[trip.id].getLatLng(), 16);
                    markers[trip.id].openPopup();
                }
            });

            // Map marker with precise float coordinates
            if (trip.currentLatitude && trip.currentLongitude) {
                trip.currentLatitude = parseFloat(trip.currentLatitude);
                trip.currentLongitude = parseFloat(trip.currentLongitude);
                trip.currentSpeedKmh = parseFloat(trip.currentSpeedKmh || 0);

                const latLng = [trip.currentLatitude, trip.currentLongitude];
                bounds.push(latLng);

                if (!markers[trip.id]) {
                    const marker = L.marker(latLng, { icon: createShuttleIcon(isForward, isBoarding) }).addTo(map);
                    markers[trip.id] = marker;
                    marker.bindPopup(buildPopupHtml(trip, routeName, shuttleName, isBoarding, boardingSec));
                } else {
                    markers[trip.id].setLatLng(latLng);
                    markers[trip.id].setIcon(createShuttleIcon(isForward, isBoarding));
                    markers[trip.id].setPopupContent(buildPopupHtml(trip, routeName, shuttleName, isBoarding, boardingSec));
                }
            }
        });

        // Sync directions state if active
        if (selectedTripForDirections) {
            const matching = trips.find(t => t.id === selectedTripForDirections.id);
            if (matching) {
                selectedTripForDirections = matching;
                updateDirectionsDisplay(matching);
            }
        }

        // Only fit bounds on initial load so user zoom/pan is never hijacked
        if (bounds.length > 0 && !selectedTripForDirections && !initialMapBoundsSet) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            initialMapBoundsSet = true;
        }
    }

    function buildPopupHtml(trip, routeName, shuttleName, isBoarding, boardingSec) {
        return `
            <div style="min-width: 190px;">
                <span class="popup-title">${shuttleName}</span>
                <div style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 0.35rem;">${routeName}</div>
                ${isBoarding ? `
                    <div style="padding: 0.25rem 0.5rem; background: rgba(234, 179, 8, 0.15); border-radius: 6px; color: #facc15; font-weight: 600; font-size: 0.75rem; margin-bottom: 0.35rem;">
                        <i class="fa-solid fa-spinner fa-spin"></i> Boarding (Departs in ${boardingSec}s)
                    </div>
                ` : `
                    <div style="font-size: 0.78rem; color: #cbd5e1; margin-bottom: 0.35rem;">
                        Speed: <span class="popup-speed" id="popup-speed-${trip.id}">${Math.round(trip.currentSpeedKmh || 0)}</span> km/h
                    </div>
                `}
                <button class="btn-directions" onclick="window.startDirections(${trip.id})">
                    <i class="fa-solid fa-location-arrow"></i> Directions to My Stop
                </button>
            </div>
        `;
    }

    function handleLocationUpdate(trip) {
        if (!trip.currentLatitude || !trip.currentLongitude) return;
        trip.currentLatitude = parseFloat(trip.currentLatitude);
        trip.currentLongitude = parseFloat(trip.currentLongitude);
        trip.currentSpeedKmh = parseFloat(trip.currentSpeedKmh || 0);
        trip.lastPingTime = Date.now();

        activeTripsData[trip.id] = trip;

        const isForward = isForwardDirection(trip);
        const routeName = isForward ? "Notun Bazar ➔ UIU" : "UIU ➔ Notun Bazar";
        const shuttleName = shuttleMap[trip.shuttleId] || (trip.shuttleId === 1 ? "UIU Shuttle 01 (Bus A)" : "UIU Shuttle 02 (Bus B)");
        const boardingSec = getBoardingRemainingSec(trip);
        const isBoarding = boardingSec > 0;
        const latLng = [trip.currentLatitude, trip.currentLongitude];

        if (markers[trip.id]) {
            markers[trip.id].setLatLng(latLng);
            markers[trip.id].setIcon(createShuttleIcon(isForward, isBoarding));
            markers[trip.id].setPopupContent(buildPopupHtml(trip, routeName, shuttleName, isBoarding, boardingSec));
        } else {
            const marker = L.marker(latLng, { icon: createShuttleIcon(isForward, isBoarding) }).addTo(map);
            markers[trip.id] = marker;
            marker.bindPopup(buildPopupHtml(trip, routeName, shuttleName, isBoarding, boardingSec));
        }

        // Update card info
        const speedEl = document.getElementById(`speed-${trip.id}`);
        if (speedEl) speedEl.textContent = Math.round(trip.currentSpeedKmh || 0);

        const destEtaEl = document.getElementById(`dest-eta-${trip.id}`);
        if (destEtaEl) destEtaEl.textContent = calculateDestinationEta(trip);

        const badgeEl = document.getElementById(`badge-${trip.id}`);
        if (badgeEl) {
            badgeEl.className = `badge-direction ${isBoarding ? 'badge-boarding' : (isForward ? 'badge-forward' : 'badge-reverse')}`;
            badgeEl.textContent = isBoarding ? `BOARDING (${boardingSec}s)` : 'LIVE';
        }

        // If this trip is currently selected for interactive Directions, update ETA & Route
        if (selectedTripForDirections && selectedTripForDirections.id === trip.id) {
            selectedTripForDirections = trip;
            updateDirectionsDisplay(trip);
        }
    }

    function removeTrip(tripId) {
        if (markers[tripId]) {
            map.removeLayer(markers[tripId]);
            delete markers[tripId];
        }
        delete activeTripsData[tripId];
        const card = document.getElementById(`route-card-${tripId}`);
        if (card) card.remove();

        if (fleetCountBadge) {
            fleetCountBadge.textContent = Object.keys(activeTripsData).length;
        }

        if (selectedTripForDirections && selectedTripForDirections.id === parseInt(tripId)) {
            closeDirections();
        }
    }

    // --- Interactive Directions & Live ETA (Google Maps Experience) ---
    function calculateTripRouteToStop(trip, targetStopId) {
        const busLat = parseFloat(trip.currentLatitude);
        const busLng = parseFloat(trip.currentLongitude);
        if (isNaN(busLat) || isNaN(busLng)) return null;

        const isForward = isForwardDirection(trip);
        const routeStops = isForward ? [...ROUTE_STOPS] : [...ROUTE_STOPS].reverse();

        const studentStopIdx = routeStops.findIndex(s => s.id === parseInt(targetStopId));
        if (studentStopIdx === -1) return null;

        // Find which leg of the route the bus is currently traveling
        let bestLeg = 0;
        let minDistanceToLeg = Infinity;
        let bestProj = null;

        for (let i = 0; i < routeStops.length - 1; i++) {
            const proj = projectPointOnSegment(busLat, busLng, routeStops[i].lat, routeStops[i].lng, routeStops[i+1].lat, routeStops[i+1].lng);
            if (proj.distKm < minDistanceToLeg) {
                minDistanceToLeg = proj.distKm;
                bestLeg = i;
                bestProj = proj;
            }
        }

        let isBusPassed = false;
        if (studentStopIdx < bestLeg) {
            isBusPassed = true;
        } else if (studentStopIdx === bestLeg) {
            const distFromStop = getDistanceKm(busLat, busLng, routeStops[studentStopIdx].lat, routeStops[studentStopIdx].lng);
            if ((bestProj && bestProj.t > 0.15) || distFromStop > 0.08) {
                isBusPassed = true;
            }
        }

        const pathCoords = [[busLat, busLng]];
        let totalDistKm = 0;

        if (!isBusPassed) {
            for (let i = bestLeg + 1; i <= studentStopIdx; i++) {
                pathCoords.push([routeStops[i].lat, routeStops[i].lng]);
            }
            totalDistKm = getDistanceKm(busLat, busLng, routeStops[bestLeg + 1].lat, routeStops[bestLeg + 1].lng);
            for (let i = bestLeg + 1; i < studentStopIdx; i++) {
                totalDistKm += getDistanceKm(routeStops[i].lat, routeStops[i].lng, routeStops[i+1].lat, routeStops[i+1].lng);
            }
        }

        const boardingSec = getBoardingRemainingSec(trip);
        const isBoarding = boardingSec > 0;
        const avgSpeedKmh = 19;
        let travelMins = (totalDistKm / avgSpeedKmh) * 60;
        if (isBoarding) travelMins += (boardingSec / 60);
        const etaMins = Math.max(1, Math.round(travelMins));

        return {
            isBusPassed,
            pathCoords,
            totalDistKm,
            etaMins,
            isBoarding,
            boardingSec,
            studentStop: routeStops[studentStopIdx],
            originStop: routeStops[0]
        };
    }

    function ensureDirectionsCardExists() {
        let cardEl = document.getElementById('gmapsDirectionsCard');
        if (!cardEl) {
            cardEl = document.createElement('div');
            cardEl.id = 'gmapsDirectionsCard';
            cardEl.className = 'gmaps-directions-card';

            const stopOptions = ROUTE_STOPS.map(s => 
                `<option value="${s.id}" ${s.id === studentLocation.stopId ? 'selected' : ''}>${s.name}</option>`
            ).join('');

            const stopPills = ROUTE_STOPS.map(s => {
                const shortName = s.name.replace(' (U-turn Point)', '').replace(' Auto Stand', '').replace(' Campus', '');
                return `<div class="stop-pill ${s.id === studentLocation.stopId ? 'active' : ''}" data-stop-id="${s.id}" onclick="window.switchStudentStop(${s.id})">${shortName}</div>`;
            }).join('');

            cardEl.innerHTML = `
                <div class="gmaps-card-header">
                    <div class="title"><i class="fa-solid fa-route"></i> Live ETA & Directions</div>
                    <div class="gmaps-header-actions">
                        <button class="gmaps-action-btn" onclick="window.toggleDirectionsMinimize()" title="Minimize"><i class="fa-solid fa-minus" id="gmapsMinIcon"></i></button>
                        <button class="gmaps-action-btn" onclick="window.closeDirections()" title="Close"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
                <div class="gmaps-card-body" id="gmapsCardBody">
                    <div class="gmaps-bus-info" id="gmapsBusInfo"></div>
                    
                    <div id="gmapsPassedAlert" style="display:none; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.6rem; color: #fca5a5; font-size: 0.75rem; margin-bottom: 0.5rem;">
                        <i class="fa-solid fa-triangle-exclamation"></i> <strong>Passed Your Stop:</strong> Bus already passed <span id="gmapsPassedStopName"></span>.
                    </div>

                    <div id="gmapsEtaMainContainer" class="gmaps-eta-main">
                        <div class="gmaps-eta-time" id="gmapsEtaTime">--</div>
                        <div class="gmaps-eta-unit" id="gmapsEtaUnit">mins</div>
                        <div class="gmaps-eta-dist" id="gmapsEtaDist">-- km away</div>
                    </div>

                    <div id="gmapsStatusText" class="gmaps-status-pill"></div>

                    <div class="gmaps-live-stats">
                        <span><i class="fa-solid fa-gauge-high"></i> <span id="gmapsSpeed">0</span> km/h</span>
                        <span><i class="fa-solid fa-signal" style="color: #34d399;"></i> Real-Time STOMP</span>
                    </div>

                    <div class="stop-pills-row" id="stopPillsRow">
                        ${stopPills}
                    </div>

                    <div class="gmaps-stop-select">
                        <label><i class="fa-solid fa-location-dot" style="color: #38bdf8;"></i> Boarding Stop:</label>
                        <select id="gmapsStopSelect">
                            ${stopOptions}
                        </select>
                    </div>
                </div>
            `;
            document.querySelector('.map-wrapper').appendChild(cardEl);

            const selectEl = document.getElementById('gmapsStopSelect');
            selectEl.addEventListener('change', (e) => {
                window.switchStudentStop(e.target.value);
            });
        }
        return cardEl;
    }

    window.toggleRoutesPanel = function() {
        const panel = document.getElementById('glassPanel');
        const icon = document.getElementById('panelToggleIcon');
        if (panel) {
            panel.classList.toggle('panel-collapsed');
            if (icon) {
                icon.className = panel.classList.contains('panel-collapsed') ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
            }
        }
    };

    window.toggleDirectionsMinimize = function() {
        const card = document.getElementById('gmapsDirectionsCard');
        const icon = document.getElementById('gmapsMinIcon');
        if (card) {
            card.classList.toggle('card-minimized');
            if (icon) {
                icon.className = card.classList.contains('card-minimized') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-minus';
            }
        }
    };

    window.startDirections = function(tripId, targetStopId) {
        const trip = activeTripsData[tripId];
        if (!trip) return;
        selectedTripForDirections = trip;

        if (targetStopId) {
            const stop = ROUTE_STOPS.find(s => s.id === parseInt(targetStopId));
            if (stop) {
                studentLocation = { lat: stop.lat, lng: stop.lng, stopId: stop.id, name: stop.name };
            }
        }

        showDirectionsUI(trip);
    };

    function showDirectionsUI(trip) {
        const userLatLng = [studentLocation.lat, studentLocation.lng];
        if (!userMarker) {
            const userIcon = L.divIcon({
                className: 'user-marker-container',
                html: `
                    <div class="user-marker-wrapper">
                        <div class="user-marker-pulse"></div>
                        <div class="user-marker-dot"></div>
                    </div>
                `,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(map);
            userMarker.bindTooltip(`📍 You are here: <b>${studentLocation.name}</b>`, { permanent: false, direction: 'bottom', className: 'stop-label-tooltip' });
        } else {
            userMarker.setLatLng(userLatLng);
            userMarker.setTooltipContent(`📍 You are here: <b>${studentLocation.name}</b>`);
        }

        updateDirectionsDisplay(trip);
    }

    function updateDirectionsDisplay(trip) {
        ensureDirectionsCardExists();

        const isForward = isForwardDirection(trip);
        const shuttleName = shuttleMap[trip.shuttleId] || (trip.shuttleId === 1 ? "UIU Shuttle 01 (Bus A)" : "UIU Shuttle 02 (Bus B)");
        const routeName = isForward ? "Notun Bazar ➔ UIU" : "UIU ➔ Notun Bazar";

        const busInfoEl = document.getElementById('gmapsBusInfo');
        if (busInfoEl) {
            busInfoEl.innerHTML = `<i class="fa-solid fa-bus"></i> <strong>${shuttleName}</strong> • ${routeName}`;
        }

        const info = calculateTripRouteToStop(trip, studentLocation.stopId);
        if (!info) return;

        const passedAlert = document.getElementById('gmapsPassedAlert');
        const passedStopName = document.getElementById('gmapsPassedStopName');
        const etaContainer = document.getElementById('gmapsEtaMainContainer');
        const etaTime = document.getElementById('gmapsEtaTime');
        const etaUnit = document.getElementById('gmapsEtaUnit');
        const etaDist = document.getElementById('gmapsEtaDist');
        const statusText = document.getElementById('gmapsStatusText');
        const speedEl = document.getElementById('gmapsSpeed');
        const selectEl = document.getElementById('gmapsStopSelect');

        if (selectEl && document.activeElement !== selectEl && selectEl.value != studentLocation.stopId) {
            selectEl.value = studentLocation.stopId;
        }

        if (speedEl) {
            speedEl.textContent = Math.round(trip.currentSpeedKmh || 0);
        }

        if (info.isBusPassed) {
            if (passedAlert) passedAlert.style.display = 'block';
            if (passedStopName) passedStopName.textContent = info.studentStop.name;
            if (etaContainer) etaContainer.style.display = 'none';
            if (statusText) statusText.style.display = 'none';

            if (directionsPolyline) {
                map.removeLayer(directionsPolyline);
                directionsPolyline = null;
            }
        } else {
            if (passedAlert) passedAlert.style.display = 'none';
            if (etaContainer) etaContainer.style.display = 'flex';
            if (statusText) {
                statusText.style.display = 'flex';
                statusText.innerHTML = info.isBoarding 
                    ? `<i class="fa-solid fa-clock"></i> Boarding at ${info.originStop.name} (Departs in ${info.boardingSec}s)`
                    : `<i class="fa-solid fa-paper-plane"></i> Heading towards <strong>${info.studentStop.name}</strong>`;
            }
            if (etaTime) etaTime.textContent = info.etaMins;
            if (etaUnit) etaUnit.textContent = info.etaMins > 1 ? 'mins' : 'min';
            if (etaDist) etaDist.textContent = `${info.totalDistKm.toFixed(1)} km away`;

            // Draw or update directions polyline
            if (!directionsPolyline) {
                directionsPolyline = L.polyline(info.pathCoords, {
                    color: '#0284c7',
                    weight: 5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                    dashArray: '6, 8'
                }).addTo(map);
            } else {
                directionsPolyline.setLatLngs(info.pathCoords);
            }
        }
    }

    window.switchStudentStop = function(stopId) {
        const stop = ROUTE_STOPS.find(s => s.id === parseInt(stopId));
        if (stop) {
            studentLocation = { lat: stop.lat, lng: stop.lng, stopId: stop.id, name: stop.name };
            
            // Highlight active stop pill
            document.querySelectorAll('.stop-pill').forEach(pill => {
                if (parseInt(pill.getAttribute('data-stop-id')) === parseInt(stopId)) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });

            // Update user marker
            if (!userMarker) {
                const userIcon = L.divIcon({
                    className: 'user-marker-container',
                    html: `
                        <div class="user-marker-wrapper">
                            <div class="user-marker-pulse"></div>
                            <div class="user-marker-dot"></div>
                        </div>
                    `,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });
                userMarker = L.marker([stop.lat, stop.lng], { icon: userIcon }).addTo(map);
                userMarker.bindTooltip(`📍 You are here: <b>${stop.name}</b>`, { permanent: false, direction: 'bottom', className: 'stop-label-tooltip' });
            } else {
                userMarker.setLatLng([stop.lat, stop.lng]);
                userMarker.setTooltipContent(`📍 You are here: <b>${stop.name}</b>`);
            }

            const selectEl = document.getElementById('gmapsStopSelect');
            if (selectEl && selectEl.value != stop.id) {
                selectEl.value = stop.id;
            }

            if (selectedTripForDirections) {
                updateDirectionsDisplay(selectedTripForDirections);
            }
        }
    };

    window.closeDirections = function() {
        selectedTripForDirections = null;
        if (directionsPolyline) {
            map.removeLayer(directionsPolyline);
            directionsPolyline = null;
        }
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
        const cardEl = document.getElementById('gmapsDirectionsCard');
        if (cardEl) cardEl.remove();
    };

    window.recenterMap = function() {
        const points = Object.values(activeTripsData)
            .filter(t => t.currentLatitude && t.currentLongitude)
            .map(t => [t.currentLatitude, t.currentLongitude]);
        if (points.length > 0) {
            map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
        } else {
            map.setView([23.7992, 90.4385], 14);
        }
    };

    // --- Autonomous Dead-Reckoning Engine (Safeguard for Safari Tab Sleep) ---
    // If the driver tab in Safari delays pings while in the background, the student map
    // smoothly glides the bus along the route waypoints at ~20 km/h so the UI NEVER stalls!
    function interpolateActiveShuttles() {
        const now = Date.now();
        Object.values(activeTripsData).forEach(trip => {
            if (!trip.startedAt) return;
            const startTime = new Date(trip.startedAt).getTime();
            const elapsedSec = (now - startTime) / 1000;
            const isForward = isForwardDirection(trip);
            const waypoints = isForward ? ROUTE_STOPS : [...ROUTE_STOPS].reverse();

            // 1. Boarding countdown update
            const boardingSec = getBoardingRemainingSec(trip);
            const badgeEl = document.getElementById(`badge-${trip.id}`);
            if (badgeEl) {
                if (boardingSec > 0) {
                    badgeEl.className = 'badge-direction badge-boarding';
                    badgeEl.textContent = `BOARDING (${boardingSec}s)`;
                } else if (badgeEl.textContent.includes('BOARDING')) {
                    badgeEl.className = `badge-direction ${isForward ? 'badge-forward' : 'badge-reverse'}`;
                    badgeEl.textContent = 'LIVE';
                }
            }

            // 2. If boarding, stay at origin stop
            if (elapsedSec < 20) {
                const origin = waypoints[0];
                if (markers[trip.id]) {
                    markers[trip.id].setLatLng([origin.lat, origin.lng]);
                }
                return;
            }

            // 3. Autonomous movement if server ping was delayed > 4000ms
            const lastPing = trip.lastPingTime || startTime;
            const pingAge = now - lastPing;

            if (pingAge > 4000) {
                const transitSec = elapsedSec - 20;
                const realisticTripDurationSec = 18 * 60; // 18 minutes
                const progress = Math.min(0.999, transitSec / realisticTripDurationSec);

                const totalSegments = waypoints.length - 1;
                const segProgress = progress * totalSegments;
                const currentSegIdx = Math.floor(segProgress);
                const fraction = segProgress - currentSegIdx;

                if (currentSegIdx < totalSegments) {
                    const startWp = waypoints[currentSegIdx];
                    const endWp = waypoints[currentSegIdx + 1];
                    const estimatedLat = startWp.lat + (endWp.lat - startWp.lat) * fraction;
                    const estimatedLng = startWp.lng + (endWp.lng - startWp.lng) * fraction;

                    trip.currentLatitude = parseFloat(estimatedLat.toFixed(7));
                    trip.currentLongitude = parseFloat(estimatedLng.toFixed(7));
                    trip.currentSpeedKmh = 19 + Math.round(Math.sin(transitSec) * 3);

                    if (markers[trip.id]) {
                        markers[trip.id].setLatLng([estimatedLat, estimatedLng]);
                    }

                    const speedEl = document.getElementById(`speed-${trip.id}`);
                    if (speedEl) speedEl.textContent = Math.round(trip.currentSpeedKmh);

                    const destEtaEl = document.getElementById(`dest-eta-${trip.id}`);
                    if (destEtaEl) destEtaEl.textContent = calculateDestinationEta(trip);

                    if (selectedTripForDirections && selectedTripForDirections.id === trip.id) {
                        updateDirectionsDisplay(trip);
                    }
                }
            }
        });

        if (selectedTripForDirections) {
            updateDirectionsDisplay(selectedTripForDirections);
        }
    }

    // Run interpolation and countdown every 1 second
    setInterval(interpolateActiveShuttles, 1000);

    // Auto-poll active trips every 3 seconds for guaranteed real-time sync
    setInterval(loadActiveTrips, 3000);

    // Expose live status summary and helpers for DeepSeek AI Commute Assistant
    window.activeTripsData = activeTripsData;
    window.ROUTE_STOPS = ROUTE_STOPS;
    window.shuttleMap = shuttleMap;
    window.isForwardDirection = isForwardDirection;
    window.getBoardingRemainingSec = getBoardingRemainingSec;
    window.getDistanceKm = getDistanceKm;
    window.getShuttleLiveStatusSummary = function() {
        const trips = Object.values(activeTripsData || {});
        if (trips.length === 0) {
            return "Currently NO shuttles are active on the route right now (all buses parked).";
        }
        return trips.map(t => {
            const isFwd = isForwardDirection(t);
            const name = shuttleMap[t.shuttleId] || (t.shuttleId === 1 ? "UIU Shuttle 01 (Bus A)" : "UIU Shuttle 02 (Bus B)");
            const dir = isFwd ? "Notun Bazar ➔ UIU Campus (Direction A)" : "UIU Campus ➔ Notun Bazar (Direction B)";
            const spd = Math.round(t.currentSpeedKmh || 0);
            const boardingSec = getBoardingRemainingSec(t);
            const statusStr = boardingSec > 0 ? `Stationary, Boarding passengers at origin (Departs in ${boardingSec}s)` : `In Transit at ${spd} km/h`;
            
            // Find nearest stop
            let nearestStopName = "En route";
            let minDist = Infinity;
            ROUTE_STOPS.forEach(s => {
                const d = Math.hypot(s.lat - t.currentLatitude, s.lng - t.currentLongitude);
                if (d < minDist) {
                    minDist = d;
                    nearestStopName = s.name;
                }
            });

            return `- ${name}: Route [${dir}], Status: ${statusStr}, Currently near: ${nearestStopName} (lat: ${t.currentLatitude}, lng: ${t.currentLongitude})`;
        }).join("\n");
    };

    setTimeout(() => { map.invalidateSize(); }, 200);
});
