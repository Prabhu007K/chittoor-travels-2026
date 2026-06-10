/** Map pickup/drop selection — city-radius pickup, click-to-pin drop. */
const RouteMap = (() => {
  const CENTER = [13.2172, 79.1003];
  const ZOOM = 11;
  const PICKUP_RADIUS_KM = 45;

  const PICKUP_AREAS = [
    { id: 'chittoor', name: 'Chittoor', center: [13.2172, 79.1003], zoom: 12 },
    { id: 'chennai', name: 'Chennai', center: [13.0827, 80.2707], zoom: 11 },
    { id: 'bangalore', name: 'Bangalore', center: [12.9716, 77.5946], zoom: 11 },
    { id: 'tirupati', name: 'Tirupati', center: [13.6288, 79.4192], zoom: 13 },
    { id: 'hyderabad', name: 'Hyderabad', center: [17.385, 78.4867], zoom: 11 },
  ];

  const INDIA_BOUNDS = { south: 6.5, north: 37.1, west: 68.1, east: 97.5 };

  let map;
  let pickupMarker;
  let dropMarker;
  let routeLine;
  let zonesLayer;
  let clickPulse;
  let mode = 'pickup';
  let selectedCityId = 'chittoor';
  let onChange = () => {};

  const state = {
    pickup: null,
    drop: null,
    pickupLabel: '',
    dropLabel: '',
    pickupCity: '',
    distanceKm: 0,
    durationMin: 0,
    loading: false,
  };

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function inIndia(lat, lng) {
    return lat >= INDIA_BOUNDS.south && lat <= INDIA_BOUNDS.north &&
      lng >= INDIA_BOUNDS.west && lng <= INDIA_BOUNDS.east;
  }

  /** Nearest service city within pickup radius, or null. */
  function matchPickupCity(lat, lng) {
    let best = null;
    PICKUP_AREAS.forEach(area => {
      const d = haversineKm(lat, lng, area.center[0], area.center[1]);
      if (d <= PICKUP_RADIUS_KM && (!best || d < best.distanceKm)) {
        best = { area, distanceKm: d };
      }
    });
    return best;
  }

  function serviceAreaNames() {
    return PICKUP_AREAS.map(a => a.name).join(', ');
  }

  function showServiceError(type, locationName) {
    const el = document.getElementById('route-error');
    const extra = type === 'pickup'
      ? `Pickup is only available within ~${PICKUP_RADIUS_KM} km of ${serviceAreaNames()}. Select a city chip, then click the map.`
      : 'Drop points must be within India.';
    el.textContent = `Sorry, our service to ${type} at "${locationName}" is not available. ${extra}`;
    el.classList.remove('hidden');
    setRouteStatus('');
  }

  function clearServiceError() {
    document.getElementById('route-error').classList.add('hidden');
  }

  function flashClick(lat, lng, ok) {
    if (clickPulse) clickPulse.remove();
    clickPulse = L.circleMarker([lat, lng], {
      radius: ok ? 12 : 10,
      color: ok ? '#16a34a' : '#dc2626',
      fillColor: ok ? '#22c55e' : '#ef4444',
      fillOpacity: 0.5,
      weight: 3,
      interactive: false,
    }).addTo(map);
    setTimeout(() => {
      if (clickPulse) { clickPulse.remove(); clickPulse = null; }
    }, 1200);
  }

  function drawServiceZones() {
    zonesLayer = L.layerGroup().addTo(map);
    PICKUP_AREAS.forEach(area => {
      L.circle(area.center, {
        radius: PICKUP_RADIUS_KM * 1000,
        color: '#16a34a',
        weight: 1.5,
        fillColor: '#22c55e',
        fillOpacity: 0.06,
        dashArray: '5,5',
        interactive: false,
      }).addTo(zonesLayer);
      L.circleMarker(area.center, {
        radius: 4,
        color: '#16a34a',
        fillColor: '#16a34a',
        fillOpacity: 0.9,
        weight: 1,
        interactive: false,
      }).addTo(zonesLayer);
    });
  }

  function makePin(lat, lng, kind) {
    const color = kind === 'pickup' ? '#16a34a' : '#dc2626';
    return L.circleMarker([lat, lng], {
      radius: 11,
      color: '#fff',
      fillColor: color,
      fillOpacity: 1,
      weight: 3,
      interactive: false,
    }).addTo(map);
  }

  function init(callback) {
    onChange = callback || onChange;

    const mapEl = document.getElementById('route-map');
    if (!mapEl || typeof L === 'undefined') return;

    map = L.map(mapEl, { scrollWheelZoom: true, tap: true }).setView(CENTER, ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    drawServiceZones();

    map.on('click', handleMapClick);

    document.getElementById('mode-pickup').addEventListener('click', () => setMode('pickup'));
    document.getElementById('mode-drop').addEventListener('click', () => setMode('drop'));
    document.getElementById('map-clear').addEventListener('click', clearAll);

    const centerBtn = document.getElementById('pickup-center-btn');
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        setMode('pickup');
        const c = map.getCenter();
        applyPickup(c.lat, c.lng);
      });
    }

    document.getElementById('search-pickup-btn').addEventListener('click', () =>
      searchPlace('pickup', document.getElementById('search-pickup').value));
    document.getElementById('search-drop-btn').addEventListener('click', () =>
      searchPlace('drop', document.getElementById('search-drop').value));

    ['search-pickup', 'search-drop'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchPlace(id === 'search-pickup' ? 'pickup' : 'drop', e.target.value);
        }
      });
    });

    document.querySelectorAll('[data-pickup-city]').forEach(btn => {
      btn.addEventListener('click', () => focusPickupCity(btn.dataset.pickupCity));
    });

    focusPickupCity('chittoor');
    setMode('pickup');
    requestAnimationFrame(() => map.invalidateSize());
  }

  function focusPickupCity(cityId) {
    const area = PICKUP_AREAS.find(a => a.id === cityId);
    if (!area) return;
    selectedCityId = cityId;
    setMode('pickup');
    map.setView(area.center, area.zoom);
    document.querySelectorAll('[data-pickup-city]').forEach(b => {
      b.classList.toggle('active', b.dataset.pickupCity === cityId);
    });
    setRouteStatus(`Click the map to set pickup near ${area.name} (green circle).`);
    clearServiceError();
  }

  function setMode(next) {
    mode = next;
    document.getElementById('mode-pickup').classList.toggle('active', mode === 'pickup');
    document.getElementById('mode-drop').classList.toggle('active', mode === 'drop');
    const area = PICKUP_AREAS.find(a => a.id === selectedCityId);
    document.getElementById('map-hint').textContent = mode === 'pickup'
      ? `Click inside the green circle near ${area?.name || 'a service city'} — or use "Pin map center"`
      : 'Click anywhere in India to set drop point';
  }

  function handleMapClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (mode === 'pickup') {
      applyPickup(lat, lng);
      return;
    }

    if (!inIndia(lat, lng)) {
      flashClick(lat, lng, false);
      showServiceError('drop', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return;
    }

    clearServiceError();
    flashClick(lat, lng, true);
    applyDrop(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    reverseGeocode(lat, lng).then(label => {
      state.dropLabel = label;
      document.getElementById('destination').value = label;
      if (dropMarker) dropMarker.bindPopup(`Drop: ${label}`).openPopup();
    });
    updateRoute();
  }

  function applyPickup(lat, lng) {
    const match = matchPickupCity(lat, lng);
    if (!match) {
      flashClick(lat, lng, false);
      showServiceError('pickup', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return;
    }

    clearServiceError();
    flashClick(lat, lng, true);
    selectedCityId = match.area.id;
    document.querySelectorAll('[data-pickup-city]').forEach(b => {
      b.classList.toggle('active', b.dataset.pickupCity === match.area.id);
    });

    const tempLabel = `${match.area.name} area (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    placePickup(lat, lng, tempLabel, match.area.name);
    setRouteStatus(`Pickup set in ${match.area.name}. Now set your drop point.`);

    reverseGeocode(lat, lng).then(label => {
      state.pickupLabel = label;
      document.getElementById('pickup').value = label;
      if (pickupMarker) pickupMarker.bindPopup(`Pickup (${match.area.name}): ${label}`).openPopup();
      onChange(getState());
    });
  }

  async function searchPlace(type, query) {
    const q = query.trim();
    if (!q) return;
    setRouteStatus('Searching…');
    clearServiceError();

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', India')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) {
        setRouteStatus('Location not found — try a different search.');
        return;
      }
      const lat = +data[0].lat;
      const lon = +data[0].lon;
      const label = data[0].display_name.split(',').slice(0, 3).join(', ');

      if (type === 'pickup') {
        const match = matchPickupCity(lat, lon);
        if (!match) {
          showServiceError('pickup', label);
          map.setView([lat, lon], 10);
          return;
        }
        selectedCityId = match.area.id;
        document.querySelectorAll('[data-pickup-city]').forEach(b => {
          b.classList.toggle('active', b.dataset.pickupCity === match.area.id);
        });
        placePickup(lat, lon, label, match.area.name);
        setRouteStatus(`Pickup set in ${match.area.name}. Now set your drop point.`);
      } else {
        if (!inIndia(lat, lon)) {
          showServiceError('drop', label);
          map.setView([lat, lon], 4);
          return;
        }
        placeDrop(lat, lon, label);
      }
      map.setView([lat, lon], 13);
      await updateRoute();
    } catch {
      setRouteStatus('Search failed — check your internet connection.');
    }
  }

  function placePickup(lat, lng, label, cityName) {
    state.pickup = { lat, lng };
    state.pickupLabel = label;
    state.pickupCity = cityName || '';
    document.getElementById('pickup').value = label;
    if (pickupMarker) pickupMarker.remove();
    pickupMarker = makePin(lat, lng, 'pickup')
      .bindPopup(`Pickup (${cityName}): ${label}`)
      .openPopup();
    setMode('drop');
    onChange(getState());
  }

  function applyDrop(lat, lng, label) {
    placeDrop(lat, lng, label);
  }

  function placeDrop(lat, lng, label) {
    state.drop = { lat, lng };
    state.dropLabel = label;
    document.getElementById('destination').value = label;
    if (dropMarker) dropMarker.remove();
    dropMarker = makePin(lat, lng, 'drop')
      .bindPopup(`Drop: ${label}`)
      .openPopup();
    onChange(getState());
  }

  function reverseGeocode(lat, lng) {
    return fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then(res => res.json())
      .then(data => data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      .catch(() => `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }

  async function updateRoute() {
    if (!state.pickup || !state.drop) {
      state.distanceKm = 0;
      state.durationMin = 0;
      if (routeLine) { routeLine.remove(); routeLine = null; }
      setRouteSummary();
      onChange(getState());
      return;
    }

    state.loading = true;
    setRouteStatus('Calculating route…');
    onChange(getState());

    const { lat: lat1, lng: lng1 } = state.pickup;
    const { lat: lat2, lng: lng2 } = state.drop;
    const coords = `${lng1},${lat1};${lng2},${lat2}`;

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('no route');

      const route = data.routes[0];
      state.distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      state.durationMin = Math.round(route.duration / 60);

      if (routeLine) routeLine.remove();
      const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
      routeLine = L.polyline(latlngs, { color: '#0284c7', weight: 4, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
      setRouteStatus('');
    } catch {
      state.distanceKm = Math.round(haversineKm(lat1, lng1, lat2, lng2) * 1.25 * 10) / 10;
      state.durationMin = Math.round(state.distanceKm * 2);
      if (routeLine) routeLine.remove();
      routeLine = L.polyline(
        [[lat1, lng1], [lat2, lng2]],
        { color: '#0284c7', weight: 3, dashArray: '8,8', opacity: 0.7 }
      ).addTo(map);
      setRouteStatus('Approximate distance (straight-line estimate).');
    }

    state.loading = false;
    setRouteSummary();
    onChange(getState());
  }

  function setRouteSummary() {
    const el = document.getElementById('route-summary');
    if (!state.pickup || !state.drop) {
      el.classList.add('hidden');
      if (!document.getElementById('route-error').classList.contains('hidden')) return;
      setRouteStatus('Pick a city, click the map for pickup, then set drop anywhere in India.');
      return;
    }
    el.classList.remove('hidden');
    document.getElementById('summary-distance').textContent = state.distanceKm.toFixed(1);
    document.getElementById('summary-duration').textContent = state.durationMin;
  }

  function setRouteStatus(msg) {
    document.getElementById('route-status').textContent = msg;
  }

  function clearAll() {
    state.pickup = null;
    state.drop = null;
    state.pickupLabel = '';
    state.dropLabel = '';
    state.pickupCity = '';
    state.distanceKm = 0;
    state.durationMin = 0;
    if (pickupMarker) { pickupMarker.remove(); pickupMarker = null; }
    if (dropMarker) { dropMarker.remove(); dropMarker = null; }
    if (routeLine) { routeLine.remove(); routeLine = null; }
    if (clickPulse) { clickPulse.remove(); clickPulse = null; }
    document.getElementById('pickup').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('search-pickup').value = '';
    document.getElementById('search-drop').value = '';
    clearServiceError();
    setRouteSummary();
    focusPickupCity('chittoor');
    onChange(getState());
  }

  function getState() {
    return { ...state };
  }

  return { init, getState, clearAll, PICKUP_AREAS };
})();
