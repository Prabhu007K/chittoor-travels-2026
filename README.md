# Chittoor Travels — Private Vehicle Booking

A booking website for a local travel operator in Chittoor. Customers set pickup and drop on an interactive map, choose a vehicle, see a distance-based fare estimate, and submit bookings. An admin panel manages the fleet, confirms trips, and unlocks printable invoices.

## Live Demo

<!-- Replace with your deployed URL after publishing -->
`https://prabhu007k-chittoor-travels-2026.netlify.app/`

## Features

### Customer booking (`index.html`)

- **Interactive map routing** — Leaflet + OpenStreetMap with pickup/drop pins
- **Service-area pickup** — Chittoor (45 km radius per city, shown as green circles)
- **Drop anywhere in India** — click the map or search by place name
- **Place search** — Nominatim geocoding for pickup and drop addresses
- **Route distance** — OSRM driving route with straight-line fallback
- **3-step flow** — map → vehicle → booking form
- **Vehicle fleet** — sedans, SUVs, mini vans, tempo travellers, and buses with photos (upload or URL)
- **Fare estimate** — distance × vehicle rate, plus 5% GST in the sidebar
- **My bookings** — view submitted trips and status in the browser
- **Printable bill** — invoice dialog; print is enabled only after admin confirms the booking
- **Notification preview** — simulated email and WhatsApp confirmation on submit

### Admin panel (`admin.html`)

- Manage fleet availability, rates, descriptions, and vehicle images
- View and confirm pending bookings
- Prevent double-booking the same vehicle on the same date
- Password-protected demo login

### Data & deployment

- **localStorage persistence** — no backend required for demo
- Static site — no build step; deploy to Netlify or GitHub Pages

## Tech Stack

- HTML5, CSS3 (Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- [Leaflet](https://leafletjs.com/) — map UI
- [OpenStreetMap](https://www.openstreetmap.org/) — map tiles
- [Nominatim](https://nominatim.org/) — geocoding & search
- [OSRM](http://project-osrm.org/) — driving distance & route
- Browser localStorage API

## Project Structure

```
├── index.html          # Customer booking site
├── admin.html          # Owner dashboard
├── serve.py            # Local dev server (port 4004)
├── start.bat           # Windows quick start
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── store.js        # Fleet, bookings, confirmBooking()
│   ├── map.js          # Pickup/drop map, routing, fare distance
│   ├── app.js          # Vehicles, fare, bookings, step UI
│   ├── bill.js         # Invoice HTML + print helper
│   └── admin.js
├── description.txt
└── README.md
```

## Run Locally

No build step or npm install required.

**Option 1 — Python server (recommended)**

```bash
python serve.py
```

Then visit `http://localhost:4004`

**Option 2 — Windows batch file**

Double-click `start.bat` (runs `serve.py` on port 4004).

**Option 3 — Open directly**

Open `index.html` in your browser. Map search and routing need network access; a local server is recommended.

**Admin demo login:** password `chittoor2026` on `admin.html`

## How to book (quick guide)

1. **Step 1 — Map:** Pick a city chip (e.g. Chittoor), click inside the green circle to set pickup, then switch to Drop and click anywhere in India. Or use search / **Pin map center**.
2. **Step 2 — Vehicle:** Choose an available vehicle once the route distance appears.
3. **Step 3 — Details:** Enter date, name, phone, passengers, and submit.
4. **Bill:** After admin confirms the booking, open **View bill** and print.

## Deploy to Netlify

1. Push this folder to GitHub or use [Netlify Drop](https://app.netlify.com/drop).
2. **Build command:** leave empty  
3. **Publish directory:** `.` (project root)
4. Deploy to `https://<site-name>.netlify.app/`

Include `index.html`, `admin.html`, `css/`, and `js/`.

## Deploy to GitHub Pages

1. Push files to a GitHub repository root.
2. **Settings → Pages → Deploy from branch → main → / (root)**.

## Author

K Prabhu
