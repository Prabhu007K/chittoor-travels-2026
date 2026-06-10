const AUTH_KEY = 'chittoor-admin-auth';
const ADMIN_PASS = 'chittoor2026';

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const vehicleForm = document.getElementById('vehicle-form');
const formStatus = document.getElementById('form-status');

let pendingImageData = '';

function isAuthed() { return sessionStorage.getItem(AUTH_KEY) === '1'; }
function showAdmin() { loginView.classList.add('hidden'); adminView.classList.remove('hidden'); refresh(); }
function showLogin() { sessionStorage.removeItem(AUTH_KEY); adminView.classList.add('hidden'); loginView.classList.remove('hidden'); }

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  if (document.getElementById('admin-password').value === ADMIN_PASS) {
    sessionStorage.setItem(AUTH_KEY, '1');
    showAdmin();
  } else alert('Incorrect password.');
});
document.getElementById('logout-btn').addEventListener('click', showLogin);
if (isAuthed()) showAdmin();

document.getElementById('v-image-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    showFormStatus('Image must be under 3 MB. Use a URL or smaller file.', false);
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    compressImage(reader.result).then(compressed => {
      pendingImageData = compressed;
      document.getElementById('v-image-url').value = '';
      showPreview(pendingImageData);
      showFormStatus('Image ready.', true);
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById('v-image-url').addEventListener('input', e => {
  pendingImageData = '';
  document.getElementById('v-image-file').value = '';
  const url = e.target.value.trim();
  if (url) showPreview(url);
  else hidePreview();
});

function compressImage(dataUrl, maxWidth = 560) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function showPreview(src) {
  document.getElementById('image-preview').src = src;
  document.getElementById('image-preview-wrap').classList.remove('hidden');
}

function hidePreview() {
  document.getElementById('image-preview-wrap').classList.add('hidden');
}

function showFormStatus(msg, ok) {
  formStatus.textContent = msg;
  formStatus.className = 'form-status ' + (ok ? 'ok' : 'err');
  formStatus.classList.remove('hidden');
}

function hideFormStatus() {
  formStatus.classList.add('hidden');
}

function refresh() {
  const fleet = TravelStore.getVehicles(true);
  const bookings = TravelStore.loadBookings();
  document.getElementById('stat-vehicles').textContent = fleet.filter(v => v.available !== false).length;
  document.getElementById('stat-bookings').textContent = bookings.length;
  document.getElementById('stat-pending').textContent = bookings.filter(b => b.status === 'new').length;

  document.getElementById('fleet-table').innerHTML = fleet.map(v => `
    <tr>
      <td>${v.image ? '🖼' : v.emoji} ${esc(v.name)}</td>
      <td>${v.capacity} seats</td>
      <td>₹${v.rate}/km</td>
      <td>${v.available === false ? '<span class="badge badge-off">Unavailable</span>' : '<span class="badge badge-done">Available</span>'}</td>
      <td><button class="btn-outline btn-sm" data-edit="${v.id}">Edit</button> <button class="btn-danger btn-sm" data-del="${v.id}">Delete</button></td>
    </tr>`).join('');

  document.getElementById('bookings-table').innerHTML = bookings.map(b => `
    <tr>
      <td>${b.date}<br><small>${new Date(b.created).toLocaleDateString()}</small></td>
      <td>${esc(b.passengerName || '—')}<br>${esc(b.phone)}${b.email ? '<br>' + esc(b.email) : ''}</td>
      <td>${esc(b.pickup)} → ${esc(b.destination)}<br>${b.passengers} passengers${b.total ? ` · ₹${b.total}` : ''}${b.distanceKm ? ` · ${b.distanceKm} km` : ''}</td>
      <td>${esc(b.vehicle)}</td>
      <td><span class="badge ${b.status === 'confirmed' ? 'badge-done' : b.status === 'cancelled' ? 'badge-off' : 'badge-new'}">${b.status || 'new'}</span></td>
      <td>
        ${b.status === 'new' ? `<button class="btn-outline btn-sm" data-confirm="${b.id}" title="Confirm vehicle is free on this date">Confirm available</button> <button class="btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>` : ''}
        ${b.status === 'confirmed' ? '<small style="color:#166534">Vehicle locked for this date</small>' : ''}
      </td>
    </tr>`).join('') || '<tr><td colspan="6">No bookings yet</td></tr>';

  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editVehicle(b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (confirm('Remove vehicle?')) { TravelStore.removeVehicle(b.dataset.del); resetForm(); refresh(); }
  }));
  document.querySelectorAll('[data-confirm]').forEach(b => b.addEventListener('click', () => {
    const id = +b.dataset.confirm;
    const result = TravelStore.confirmBooking(id);
    if (!result.ok) alert(result.error);
    else refresh();
  }));
  document.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => {
    TravelStore.updateBookingStatus(+b.dataset.cancel, 'cancelled'); refresh();
  }));
}

function editVehicle(id) {
  const v = TravelStore.getVehicle(id);
  hideFormStatus();
  pendingImageData = '';
  document.getElementById('form-title').textContent = 'Edit vehicle';
  document.getElementById('v-id-hidden').value = v.id;
  document.getElementById('v-id').value = v.id;
  document.getElementById('v-id').readOnly = true;
  document.getElementById('v-name').value = v.name;
  document.getElementById('v-emoji').value = v.emoji;
  document.getElementById('v-capacity').value = v.capacity;
  document.getElementById('v-rate').value = v.rate;
  document.getElementById('v-available').value = String(v.available !== false);
  document.getElementById('v-desc').value = v.desc;
  document.getElementById('v-image-url').value = v.image?.startsWith('data:') ? '' : (v.image || '');
  document.getElementById('v-image-file').value = '';
  if (v.image) showPreview(v.image);
  else hidePreview();
  if (v.image?.startsWith('data:')) pendingImageData = v.image;
  document.getElementById('cancel-edit').classList.remove('hidden');
}

function resetForm() {
  vehicleForm.reset();
  pendingImageData = '';
  document.getElementById('v-id-hidden').value = '';
  document.getElementById('v-id').readOnly = false;
  document.getElementById('form-title').textContent = 'Add vehicle';
  document.getElementById('cancel-edit').classList.add('hidden');
  hidePreview();
  hideFormStatus();
}

document.getElementById('cancel-edit').addEventListener('click', resetForm);

vehicleForm.addEventListener('submit', e => {
  e.preventDefault();
  hideFormStatus();

  const hidden = document.getElementById('v-id-hidden').value;
  const urlImage = document.getElementById('v-image-url').value.trim();
  const image = pendingImageData || urlImage || '';

  const vehicle = {
    id: hidden || document.getElementById('v-id').value.trim().toLowerCase(),
    name: document.getElementById('v-name').value.trim(),
    emoji: document.getElementById('v-emoji').value.trim() || '🚌',
    capacity: +document.getElementById('v-capacity').value,
    rate: +document.getElementById('v-rate').value,
    available: document.getElementById('v-available').value === 'true',
    desc: document.getElementById('v-desc').value.trim(),
    image,
  };

  const saveBtn = document.getElementById('save-vehicle-btn');
  saveBtn.disabled = true;

  try {
    TravelStore.upsertVehicle(vehicle);
    showFormStatus(`"${vehicle.name}" saved successfully.`, true);
    resetForm();
    refresh();
  } catch (err) {
    if (image && (err.message?.includes('Storage') || err.name === 'QuotaExceededError')) {
      if (confirm('Could not save with image (storage limit). Save without image?')) {
        vehicle.image = '';
        try {
          TravelStore.upsertVehicle(vehicle);
          showFormStatus(`"${vehicle.name}" saved without image.`, true);
          resetForm();
          refresh();
        } catch (err2) {
          showFormStatus(err2.message || 'Could not save vehicle.', false);
        }
      } else {
        showFormStatus(err.message || 'Could not save vehicle.', false);
      }
    } else {
      showFormStatus(err.message || 'Could not save vehicle.', false);
    }
  } finally {
    saveBtn.disabled = false;
  }
});

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
