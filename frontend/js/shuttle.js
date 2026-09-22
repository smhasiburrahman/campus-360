document.addEventListener('DOMContentLoaded', async () => {
    
    // Initialize Leaflet Map
    // Coordinates default to a general center (e.g., UIU Campus approx. 23.794, 90.450)
    // We'll just use a generic default if no routes are present
    const map = L.map('map', {
        zoomControl: false // We can position it manually if needed
    }).setView([23.794, 90.450], 15);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Use standard OpenStreetMap tiles which are 100% free with no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const activeRoutesList = document.getElementById('activeRoutesList');
    
    // Store markers by tripId
    const markers = {};
    
    // Custom Marker Icon with Pulse
    const createShuttleIcon = () => {
        return L.divIcon({
            className: 'custom-shuttle-icon',
            html: `
                <div class="shuttle-marker-wrapper">
                    <div class="shuttle-marker-pulse"></div>
                    <div class="shuttle-marker-icon"><i class="fa-solid fa-bus"></i></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    };

    // WebSocket Setup
    let stompClient = null;

    function connectWebSocket() {
        // Create SockJS connection to backend
        const socket = new SockJS('http://localhost:8080/ws/shuttle-tracking');
        stompClient = StompJs.Stomp.over(socket);
        
        // Disable debug logging for production
        stompClient.debug = function() {};

        stompClient.connect({}, (frame) => {
            console.log('Connected to WebSocket');
            // We will subscribe to topics individually based on active trips
            loadActiveTrips();
        }, (error) => {
            console.error('WebSocket connection error:', error);
            // Reconnect logic could go here
            setTimeout(connectWebSocket, 5000);
        });
    }

    async function loadActiveTrips() {
        try {
            // First get routes to map route IDs to route names
            const routesRes = await apiFetch('/shuttle-routes');
            let routeMap = {};
            if (routesRes && routesRes.ok) {
                const routes = await routesRes.json();
                routes.forEach(r => routeMap[r.id] = r.name);
            }

            // Get active trips
            const tripsRes = await apiFetch('/shuttle-trips/active');
            if (tripsRes && tripsRes.ok) {
                const trips = await tripsRes.json();
                
                activeRoutesList.innerHTML = '';
                
                if (trips.length === 0) {
                    activeRoutesList.innerHTML = '<div style="text-align:center; padding: 1rem; color: var(--text-secondary);">No shuttles currently active.</div>';
                    return;
                }

                const bounds = [];

                trips.forEach(trip => {
                    const routeName = routeMap[trip.routeId] || `Route #${trip.routeId}`;
                    
                    // Add to sidebar
                    const card = document.createElement('div');
                    card.className = 'route-card';
                    card.innerHTML = `
                        <div class="route-card-header">
                            <div class="route-name">${routeName}</div>
                            <div class="route-status">LIVE</div>
                        </div>
                        <div class="route-detail">
                            <span><i class="fa-solid fa-gauge-high"></i> <span id="speed-${trip.id}">${trip.currentSpeedKmh || 0}</span> km/h</span>
                            <span>Trip #${trip.id}</span>
                        </div>
                    `;
                    card.addEventListener('click', () => {
                        if (markers[trip.id]) {
                            map.flyTo(markers[trip.id].getLatLng(), 17);
                            markers[trip.id].openPopup();
                        }
                    });
                    activeRoutesList.appendChild(card);

                    // Add to Map if it has coordinates
                    if (trip.currentLatitude && trip.currentLongitude) {
                        const latLng = [trip.currentLatitude, trip.currentLongitude];
                        bounds.push(latLng);
                        
                        const marker = L.marker(latLng, { icon: createShuttleIcon() }).addTo(map);
                        marker.bindPopup(`
                            <span class="popup-title">${routeName}</span>
                            <span style="font-size: 0.85rem; color: #64748b;">Current Speed: <span class="popup-speed" id="popup-speed-${trip.id}">${Math.round(trip.currentSpeedKmh || 0)}</span> km/h</span>
                        `);
                        
                        markers[trip.id] = marker;
                    }

                    // Subscribe to this trip's updates
                    if (stompClient && stompClient.connected) {
                        stompClient.subscribe(`/topic/trips/${trip.id}`, (message) => {
                            const updatedTrip = JSON.parse(message.body);
                            handleLocationUpdate(updatedTrip);
                        });
                    }
                });

                // Fit map to show all shuttles
                if (bounds.length > 0) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }

            }
        } catch (error) {
            console.error('Error loading active trips', error);
            activeRoutesList.innerHTML = '<div style="color: var(--danger); padding: 1rem;">Failed to load active shuttles.</div>';
        }
    }

    function handleLocationUpdate(trip) {
        if (!trip.currentLatitude || !trip.currentLongitude) return;
        
        const latLng = [trip.currentLatitude, trip.currentLongitude];
        
        // Update Marker on Map
        if (markers[trip.id]) {
            // Leaflet handles smooth transition if we use simple setLatLng, 
            // but for real smooth animation you'd use a plugin like Leaflet.Slide.
            // For now, setLatLng works beautifully with the CSS transition on the icon we added!
            markers[trip.id].setLatLng(latLng);
        } else {
            // If the marker didn't exist (maybe they just started tracking), create it
            markers[trip.id] = L.marker(latLng, { icon: createShuttleIcon() }).addTo(map);
            markers[trip.id].bindPopup(`
                <span class="popup-title">Trip #${trip.id}</span>
                <span style="font-size: 0.85rem; color: #64748b;">Current Speed: <span class="popup-speed" id="popup-speed-${trip.id}">${Math.round(trip.currentSpeedKmh || 0)}</span> km/h</span>
            `);
        }
        
        // Update side panel text
        const speedEl = document.getElementById(`speed-${trip.id}`);
        if (speedEl) speedEl.textContent = Math.round(trip.currentSpeedKmh || 0);
        
        // Update popup text if open
        const popupSpeedEl = document.getElementById(`popup-speed-${trip.id}`);
        if (popupSpeedEl) popupSpeedEl.textContent = Math.round(trip.currentSpeedKmh || 0);
    }

    // Start Connection
    connectWebSocket();
    
    // Invalidate map size to ensure it renders fully if inside a flex container
    setTimeout(() => { map.invalidateSize(); }, 100);
});
