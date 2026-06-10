let selectedId = null;
let routeState = { distanceKm: 0, pickup: null, drop: null };
let activeBillId = null;

const minDate = new Date();
minDate.setDate(minDate.getDate() + 1);
document.getElementById('trip-date').min = minDate.toISOString().split('T')[0];

function getVehicles() { return TravelStore.getVehicles(); }

function renderVehicleImage(v) {
  if (v.image) {
    return `<div class="vehicle-photo">
      <img src="${escAttr(v.image)}" alt="${esc(v.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="vehicle-photo-fallback">${v.emoji}</span>
    </div>`;
  }
  return `<div class="emoji">${v.emoji}</div>`;
}

function renderVehicles() {
  const vehicles = getVehicles();
  document.getElementById('vehicle-list').innerHTML = vehicles.length ? vehicles.map(v => `
    <article class="vehicle-card ${selectedId === v.id ? 'selected' : ''}" data-id="${v.id}">
      ${renderVehicleImage(v)}
      <h3>${esc(v.name)}</h3>
      <p>${esc(v.desc)}</p>
      <div class="rate">₹${v.rate}/km · up to ${v.capacity} passengers</div>
    </article>`).join('') : '<p style="color:#64748b">No vehicles available.</p>';

  document.querySelectorAll('.vehicle-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedId = card.dataset.id;
      renderVehicles();
      updateSelected();
      updateFareEstimate();
    });
  });
}

function updateSelected() {
  const el = document.getElementById('selected-info');
  if (!selectedId) {
    const routeReady = routeState.pickup && routeState.drop && routeState.distanceKm > 0;
    el.textContent = routeReady
      ? 'Choose a vehicle from Step 2 on the left'
      : 'Complete Step 1 (map), then select a vehicle in Step 2';
    el.classList.add('empty');
    return;
  }
  const v = TravelStore.getVehicle(selectedId);
  el.classList.remove('empty');
  el.innerHTML = `${v.emoji} <strong>${esc(v.name)}</strong><br>₹${v.rate}/km · ${v.capacity} seats max`;
}

function updateStepUI() {
  routeState = RouteMap.getState();
  const hint = document.getElementById('vehicle-step-hint');
  const vehiclesSection = document.getElementById('vehicles-section');
  const routeReady = routeState.pickup && routeState.drop && routeState.distanceKm > 0;

  if (routeReady) {
    hint.textContent = 'Route set — click a vehicle below to continue.';
    vehiclesSection.classList.add('highlight-step');
  } else {
    hint.textContent = 'Set pickup and drop on the map first, then pick a vehicle.';
    vehiclesSection.classList.remove('highlight-step');
  }
  updateSelected();
}

let scrolledToVehicles = false;
function maybeScrollToVehicles() {
  routeState = RouteMap.getState();
  if (routeState.pickup && routeState.drop && routeState.distanceKm > 0 && !scrolledToVehicles) {
    scrolledToVehicles = true;
    document.getElementById('vehicles-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (!routeState.pickup || !routeState.drop) scrolledToVehicles = false;
}

function canBook() {
  return selectedId && routeState.distanceKm > 0 && routeState.pickup && routeState.drop && !routeState.loading;
}

function updateFareEstimate() {
  routeState = RouteMap.getState();
  const fareEl = document.getElementById('fare-estimate');
  const submitBtn = document.getElementById('submit-btn');

  if (!selectedId || !routeState.distanceKm) {
    fareEl.classList.add('hidden');
    submitBtn.disabled = true;
    return;
  }

  const v = TravelStore.getVehicle(selectedId);
  const baseFare = Math.round(routeState.distanceKm * v.rate);
  const gst = Math.round(baseFare * 0.05);
  const total = baseFare + gst;

  fareEl.classList.remove('hidden');
  document.getElementById('fare-distance').textContent = routeState.distanceKm.toFixed(1);
  document.getElementById('fare-rate').textContent = v.rate;
  document.getElementById('fare-base').textContent = baseFare;
  document.getElementById('fare-gst').textContent = gst;
  document.getElementById('fare-total').textContent = total;
  submitBtn.disabled = routeState.loading;
  updateStepUI();
  maybeScrollToVehicles();
}

function statusBadge(status) {
  const map = {
    new: '<span class="status-pill status-pending">Pending admin confirmation</span>',
    confirmed: '<span class="status-pill status-confirmed">Confirmed — bill ready</span>',
    cancelled: '<span class="status-pill status-cancelled">Cancelled</span>',
  };
  return map[status] || esc(status);
}

function renderBookings() {
  const list = TravelStore.loadBookings().slice(0, 10);
  const el = document.getElementById('bookings-list');
  if (!list.length) {
    el.innerHTML = '<p class="bookings-empty">No bookings yet.</p>';
    return;
  }
  el.innerHTML = list.map(b => `
    <div class="booking-card">
      <div class="booking-card-head">
        <strong>${esc(b.vehicle)}</strong>
        ${statusBadge(b.status)}
      </div>
      <p>${esc(b.pickup)} → ${esc(b.destination)}</p>
      <p>Trip: ${b.date} · ${b.passengers} passengers · ${b.distanceKm || '—'} km · ₹${b.total || '—'}</p>
      <p class="booking-contact">${esc(b.passengerName || 'Guest')} · ${esc(b.phone)}</p>
      <div class="booking-actions">
        ${b.status === 'confirmed'
          ? `<button type="button" class="btn-book btn-sm" data-view-bill="${b.id}">View & print bill</button>`
          : b.status === 'new'
            ? '<span class="bill-wait">Bill available after admin confirms vehicle is free on this date.</span>'
            : ''}
      </div>
    </div>`).join('');

  document.querySelectorAll('[data-view-bill]').forEach(btn => {
    btn.addEventListener('click', () => openBillDialog(TravelStore.getBooking(+btn.dataset.viewBill)));
  });
}

function openBillDialog(booking) {
  if (!booking || booking.status !== 'confirmed') {
    alert('Bill can only be printed after admin confirms your booking.');
    return;
  }
  activeBillId = booking.id;
  document.getElementById('bill-content').innerHTML = Bill.buildHtml(booking);
  document.getElementById('bill-print').classList.remove('hidden');
  document.getElementById('bill-pending-msg').classList.add('hidden');
  document.getElementById('bill-dialog').showModal();
}

document.getElementById('booking-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!canBook()) {
    alert('Select a vehicle and set pickup & drop points on the map.');
    return;
  }

  const vehicle = TravelStore.getVehicle(selectedId);
  const passengers = +document.getElementById('passengers').value;

  if (passengers > vehicle.capacity) {
    alert(`This vehicle seats up to ${vehicle.capacity} passengers.`);
    return;
  }

  const emailOn = document.getElementById('notify-email').checked;
  const waOn = document.getElementById('notify-whatsapp').checked;
  if (!emailOn && !waOn) {
    alert('Select at least one notification method.');
    return;
  }

  const notify = [];
  if (emailOn) notify.push('Email');
  if (waOn) notify.push('WhatsApp');

  const rs = RouteMap.getState();
  const baseFare = Math.round(rs.distanceKm * vehicle.rate);
  const gst = Math.round(baseFare * 0.05);
  const total = baseFare + gst;

  const booking = {
    id: Date.now(),
    vehicle: vehicle.name,
    vehicleId: selectedId,
    date: document.getElementById('trip-date').value,
    pickup: document.getElementById('pickup').value,
    destination: document.getElementById('destination').value,
    pickupCity: rs.pickupCity || '',
    pickupCoords: rs.pickup,
    dropCoords: rs.drop,
    distanceKm: rs.distanceKm,
    durationMin: rs.durationMin,
    rate: vehicle.rate,
    baseFare,
    gst,
    total,
    passengers,
    passengerName: document.getElementById('passenger-name').value.trim(),
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    notify,
    status: 'new',
    created: new Date().toISOString(),
  };

  TravelStore.saveBooking(booking);

  document.getElementById('pending-ref').textContent = Bill.billNumber(booking.id);
  document.getElementById('pending-date').textContent = booking.date;
  document.getElementById('pending-dialog').showModal();

  e.target.reset();
  document.getElementById('trip-date').min = minDate.toISOString().split('T')[0];
  selectedId = null;
  RouteMap.clearAll();
  scrolledToVehicles = false;
  renderVehicles();
  updateSelected();
  updateFareEstimate();
  renderBookings();
});

document.getElementById('bill-print').addEventListener('click', () => {
  const booking = TravelStore.getBooking(activeBillId);
  if (!booking || booking.status !== 'confirmed') {
    alert('Bill can only be printed after admin confirms your booking.');
    return;
  }
  Bill.print(booking);
});

document.getElementById('bill-close').addEventListener('click', () => document.getElementById('bill-dialog').close());
document.getElementById('pending-close').addEventListener('click', () => document.getElementById('pending-dialog').close());

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

RouteMap.init(() => { updateFareEstimate(); updateStepUI(); });
renderVehicles();
updateSelected();
updateFareEstimate();
updateStepUI();
renderBookings();
