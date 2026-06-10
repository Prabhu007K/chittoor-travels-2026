const TravelStore = (() => {
  const FLEET_KEY = 'chittoor-fleet-v1';
  const BOOKINGS_KEY = 'chittoor-bookings-v1';

  const DEFAULT = [
    { id: 'sedan', name: 'Sedan (4 seater)', emoji: '🚗', capacity: 4, rate: 12, desc: 'AC sedan for city & short trips', available: true },
    { id: 'suv', name: 'SUV (7 seater)', emoji: '🚙', capacity: 7, rate: 16, desc: 'Comfortable family SUV', available: true },
    { id: 'minivan', name: 'Mini Van (12 seater)', emoji: '🚐', capacity: 12, rate: 18, desc: 'Ideal for group outings', available: true },
    { id: 'tempo', name: 'Tempo Traveller (17 seater)', emoji: '🛻', capacity: 17, rate: 22, desc: 'Popular for temple trips', available: true },
    { id: 'bus', name: 'Mini Bus (32 seater)', emoji: '🚌', capacity: 32, rate: 35, desc: 'Large group & wedding travel', available: true },
    { id: 'luxury', name: 'Luxury Bus (40 seater)', emoji: '🚎', capacity: 40, rate: 45, desc: 'Premium AC coach with push-back seats', available: true },
  ];

  function normalize(v) {
    return { image: '', ...v };
  }

  function loadFleet() {
    try {
      const raw = localStorage.getItem(FLEET_KEY);
      if (raw) return JSON.parse(raw).map(normalize);
    } catch { /* defaults */ }
    saveFleet(DEFAULT);
    return DEFAULT.map(normalize);
  }

  function saveFleet(fleet) {
    try {
      localStorage.setItem(FLEET_KEY, JSON.stringify(fleet));
    } catch (err) {
      if (err.name === 'QuotaExceededError') {
        throw new Error('Storage full — try a smaller image or use an image URL instead.');
      }
      throw err;
    }
  }

  function getVehicles(includeUnavailable = false) {
    const list = loadFleet();
    return includeUnavailable ? list : list.filter(v => v.available !== false);
  }

  function getVehicle(id) { return loadFleet().find(v => v.id === id); }

  function upsertVehicle(v) {
    const list = loadFleet();
    const normalized = normalize(v);
    const idx = list.findIndex(x => x.id === normalized.id);
    if (idx >= 0) list[idx] = normalized;
    else list.push(normalized);
    saveFleet(list);
  }

  function removeVehicle(id) { saveFleet(loadFleet().filter(v => v.id !== id)); }

  function loadBookings() {
    try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveBooking(booking) {
    const list = loadBookings();
    list.unshift({ ...booking, id: booking.id || Date.now(), status: booking.status || 'new', created: booking.created || new Date().toISOString() });
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list.slice(0, 50)));
  }

  function getBooking(id) {
    return loadBookings().find(b => b.id === id);
  }

  function isVehicleConfirmedOnDate(vehicleId, date, excludeBookingId = null) {
    return loadBookings().some(b =>
      b.status === 'confirmed' &&
      b.vehicleId === vehicleId &&
      b.date === date &&
      b.id !== excludeBookingId
    );
  }

  function updateBookingStatus(id, status, extra = {}) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(
      loadBookings().map(b => b.id === id ? { ...b, status, ...extra } : b)
    ));
  }

  function confirmBooking(id) {
    const booking = getBooking(id);
    if (!booking) return { ok: false, error: 'Booking not found.' };
    if (booking.status !== 'new') return { ok: false, error: 'Only pending bookings can be confirmed.' };
    if (isVehicleConfirmedOnDate(booking.vehicleId, booking.date, id)) {
      return { ok: false, error: `Vehicle already confirmed on ${booking.date}. Mark unavailable or cancel the other trip first.` };
    }
    updateBookingStatus(id, 'confirmed', { confirmedAt: new Date().toISOString() });
    return { ok: true };
  }

  return {
    loadFleet, saveFleet, getVehicles, getVehicle, upsertVehicle, removeVehicle,
    loadBookings, saveBooking, getBooking, isVehicleConfirmedOnDate,
    updateBookingStatus, confirmBooking, DEFAULT,
  };
})();
