document.addEventListener('DOMContentLoaded', () => {
    
    const shuttleForm = document.getElementById('shuttleForm');
    const routeForm = document.getElementById('routeForm');
    const stopForm = document.getElementById('stopForm');
    const stopRouteSelect = document.getElementById('stopRouteSelect');
    const stopLatInput = document.getElementById('stopLat');
    const stopLngInput = document.getElementById('stopLng');

    // 1. Initialize Map Picker
    let map = L.map('mapPicker').setView([23.794, 90.450], 15); // Default to Campus area
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    let currentPin = null;

    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        if (currentPin) {
            map.removeLayer(currentPin);
        }

        currentPin = L.marker([lat, lng]).addTo(map);
        
        // Auto-fill the inputs
        stopLatInput.value = lat.toFixed(6);
        stopLngInput.value = lng.toFixed(6);
    });

    // 2. Load Routes into Dropdown
    async function loadRoutes() {
        try {
            const res = await apiFetch('/shuttle-routes');
            if (res && res.ok) {
                const routes = await res.json();
                stopRouteSelect.innerHTML = '<option value="" disabled selected>Select a route</option>';
                routes.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = r.name;
                    stopRouteSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('Failed to load routes', error);
        }
    }

    // Call initially
    loadRoutes();

    // 3. Handle Shuttle Creation
    shuttleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vehicleNo = document.getElementById('vehicleNo').value;
        const capacity = document.getElementById('capacity').value;
        
        const btn = document.getElementById('btnCreateShuttle');
        const oldText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await apiFetch('/admin/shuttles', {
                method: 'POST',
                body: JSON.stringify({ vehicleNo, capacity: parseInt(capacity) })
            });

            if (res && res.ok) {
                alert('Shuttle created successfully!');
                shuttleForm.reset();
            } else {
                alert('Failed to create shuttle.');
            }
        } catch (error) {
            alert('Error creating shuttle.');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    // 4. Handle Route Creation
    routeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('routeName').value;
        const description = document.getElementById('routeDesc').value;
        
        const btn = document.getElementById('btnCreateRoute');
        const oldText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await apiFetch('/admin/shuttle-routes', {
                method: 'POST',
                body: JSON.stringify({ name, description })
            });

            if (res && res.ok) {
                alert('Route created successfully!');
                routeForm.reset();
                loadRoutes(); // Reload the dropdown
            } else {
                alert('Failed to create route.');
            }
        } catch (error) {
            alert('Error creating route.');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    // 5. Handle Stop Creation
    stopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const routeId = stopRouteSelect.value;
        const name = document.getElementById('stopName').value;
        const latitude = document.getElementById('stopLat').value;
        const longitude = document.getElementById('stopLng').value;
        const sortOrder = document.getElementById('sortOrder').value;

        if (!latitude || !longitude) {
            alert('Please click on the map to select a location for the stop.');
            return;
        }

        const btn = document.getElementById('btnCreateStop');
        const oldText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await apiFetch(`/admin/shuttle-routes/${routeId}/stops`, {
                method: 'POST',
                body: JSON.stringify({ 
                    stopName: name, 
                    latitude: parseFloat(latitude), 
                    longitude: parseFloat(longitude),
                    sequenceNo: parseInt(sortOrder)
                })
            });

            if (res && res.ok) {
                alert('Stop added successfully!');
                // Don't reset route dropdown, just clear the specific inputs
                document.getElementById('stopName').value = '';
                document.getElementById('sortOrder').value = '';
                if (currentPin) {
                    map.removeLayer(currentPin);
                    currentPin = null;
                }
                stopLatInput.value = '';
                stopLngInput.value = '';
            } else {
                alert('Failed to add stop.');
            }
        } catch (error) {
            alert('Error adding stop.');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

});
