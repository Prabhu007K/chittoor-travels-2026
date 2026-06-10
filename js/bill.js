/** Compact single-page invoice HTML + print helper */
const Bill = (() => {
  const COMPANY = {
    name: 'Chittoor Travels',
    tagline: 'Private Vehicle Booking',
    address: 'Near Bus Stand, Chittoor, Andhra Pradesh — 517001',
    phone: '+91 98765 43210',
    email: 'travels@chittoortravels.demo',
    gstin: 'Demo portfolio — GSTIN N/A',
  };

  function formatDate(iso, opts = { dateStyle: 'medium' }) {
    try { return new Date(iso).toLocaleString(undefined, opts); }
    catch { return iso; }
  }

  function billNumber(id) {
    return `CT-${String(id).slice(-8)}`;
  }

  function buildHtml(booking) {
    const billDate = formatDate(booking.confirmedAt || booking.created, { dateStyle: 'medium', timeStyle: 'short' });
    const tripDate = formatDate(booking.date + 'T12:00:00', { dateStyle: 'full' });

    return `
    <article class="invoice">
      <header class="invoice-top">
        <div class="invoice-brand">
          <h1>${COMPANY.name}</h1>
          <p>${COMPANY.tagline}</p>
          <p class="invoice-co-meta">${COMPANY.address}<br>${COMPANY.phone} · ${COMPANY.email}</p>
        </div>
        <div class="invoice-ids">
          <table>
            <tr><td>Bill No.</td><td><strong>${billNumber(booking.id)}</strong></td></tr>
            <tr><td>Bill Date</td><td>${billDate}</td></tr>
            <tr><td>Trip Date</td><td>${tripDate}</td></tr>
            <tr><td>Status</td><td>${booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}</td></tr>
          </table>
        </div>
      </header>

      <section class="invoice-block">
        <h2>Passenger details</h2>
        <table class="invoice-grid">
          <tr><td>Name</td><td>${esc(booking.passengerName || '—')}</td></tr>
          <tr><td>Phone</td><td>${esc(booking.phone)}</td></tr>
          <tr><td>Email</td><td>${esc(booking.email || '—')}</td></tr>
          <tr><td>Passengers</td><td>${booking.passengers}</td></tr>
        </table>
      </section>

      <section class="invoice-block">
        <h2>Travel details</h2>
        <table class="invoice-grid">
          <tr><td>Vehicle</td><td>${esc(booking.vehicle)}</td></tr>
          <tr><td>Pickup</td><td>${esc(booking.pickup)}</td></tr>
          <tr><td>Drop</td><td>${esc(booking.destination)}</td></tr>
          <tr><td>Distance</td><td>${booking.distanceKm} km (≈ ${booking.durationMin} min)</td></tr>
        </table>
      </section>

      <section class="invoice-block">
        <h2>Billing details</h2>
        <table class="invoice-charges">
          <thead>
            <tr><th>Description</th><th>Calculation</th><th>Amount (₹)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Trip fare</td>
              <td>₹${booking.rate}/km × ${booking.distanceKm} km</td>
              <td>${booking.baseFare}</td>
            </tr>
            <tr>
              <td>GST (5%)</td>
              <td>On trip fare</td>
              <td>${booking.gst}</td>
            </tr>
            <tr class="invoice-total">
              <td colspan="2"><strong>Total payable</strong></td>
              <td><strong>₹${booking.total}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer class="invoice-foot">
        <p>${COMPANY.gstin}</p>
        <p>Thank you for choosing ${COMPANY.name}. This is a computer-generated tax invoice.</p>
        ${booking.confirmedAt ? `<p class="invoice-confirmed">Vehicle confirmed available on trip date · ${formatDate(booking.confirmedAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>` : ''}
      </footer>
    </article>`;
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function print(booking) {
    const sheet = document.getElementById('print-sheet');
    sheet.innerHTML = buildHtml(booking);
    document.body.classList.add('print-mode');
    window.print();
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('print-mode');
      sheet.innerHTML = '';
    }, { once: true });
  }

  return { buildHtml, print, billNumber, COMPANY };
})();
