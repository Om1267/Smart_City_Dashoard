# Smart City Dashboard

A futuristic, real-time Smart City monitoring and analytics dashboard built with pure HTML, CSS, and Vanilla JavaScript. This project demonstrates advanced front-end development skills including data visualization, real-time simulations, SVG mapping, and responsive design.

![Smart City Dashboard](https://img.shields.io/badge/Version-2.4.0-blue?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## Project Overview

Smart City Dashboard is a comprehensive urban intelligence platform that simulates real-time monitoring of a smart city's critical infrastructure. It provides actionable insights across multiple domains including traffic, energy, water management, air quality, and emergency services — all without requiring a backend server.

---

## Features

### Core Modules

| Module | Description |
|--------|-------------|
| **City Overview** | Real-time KPI cards for population, vehicles, power, water, emergencies, sensors, AQI, and traffic density |
| **Live Weather System** | Dynamic weather data with temperature, humidity, wind, pressure, UV index, and conditions |
| **Traffic Simulation** | Canvas-based animated traffic with density meter, vehicle counts, speed, and incident tracking |
| **Air Quality Monitoring** | AQI gauge, PM2.5, PM10, CO₂, NO₂, SO₂ pollutant tracking with color-coded severity |
| **Emergency Alert Center** | Full CRUD alert system with severity levels, notifications, and animated alerts |
| **City Analytics** | 6 interactive Chart.js visualizations — line, bar, doughnut, area, and pie charts |
| **Interactive City Map** | SVG-based zoomable map with clickable landmarks and popup details |
| **Energy Management** | Animated progress bars for total consumption, solar, grid, and battery storage |
| **Water Management** | Animated water tank, daily usage, quality, leak detection, and hourly usage chart |
| **System Health Panel** | Real-time sensor monitoring, network health, server status, and uptime tracking |

### Additional Features

- 🌙 **Dark/Light Theme** — Toggle with persistent settings
- 🔔 **Notification Center** — Real-time alerts with bell icon badge counter
- 🔍 **Smart Search** — Search hospitals, schools, police stations, alerts, and analytics (Ctrl+K)
- ⚙️ **Settings Panel** — Theme, auto-refresh, layout, notification sound preferences
- 📊 **Export Features** — Export dashboard as text report, JSON analytics, and chart images
- 💾 **LocalStorage** — Persistent settings, alerts, notifications, and preferences
- 📱 **Responsive Design** — Mobile, tablet, laptop, and desktop optimized
- ✨ **Glassmorphism UI** — Frosted glass effects with backdrop blur
- 🎬 **Smooth Animations** — CSS transitions, loading screens, and micro-interactions
- 🍞 **Toast Notifications** — Non-blocking feedback with auto-dismiss

---

## Screenshots

> Open `index.html` in a browser to view the live dashboard.

---

## Installation

1. **Clone the repository:**

```bash
git clone https://github.com/Om1267/Smart_City_Dashoard.git
cd Smart_City_Dashoard
```

2. **Open in browser:**

Simply open `index.html` in any modern browser. No build step or server required.

```bash
# Or use a local server:
npx serve .
# or
python -m http.server 8000
```

---

## Usage

- **Navigation:** Use the sidebar to switch between modules.
- **Search:** Press `Ctrl + K` or click the search icon to find locations and analytics.
- **Theme:** Click the moon/sun icon or use Settings to toggle dark/light mode.
- **Emergency Alerts:** Click "Add Alert" to create new emergency alerts.
- **Export:** Click the export icon to download reports or chart images.
- **Map:** Click on map landmarks to view detailed information. Use +/- to zoom.
- **Settings:** Click the gear icon to configure auto-refresh, layout, and notifications.

---

## Technologies Used

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic structure and layout |
| **CSS3** | Glassmorphism, animations, responsive design, CSS variables |
| **Vanilla JavaScript** | Application logic, simulations, real-time updates |
| **Chart.js** (CDN) | Data visualization charts |
| **Font Awesome** (CDN) | Icon library |
| **Google Fonts (Inter)** | Typography |
| **SVG** | Interactive city map |
| **Canvas API** | Traffic simulation |
| **LocalStorage API** | Persistent data storage |

---

## File Structure

```
smart-city-dashboard/
├── index.html          # Main HTML file
├── style.css           # Complete stylesheet
├── script.js           # Application logic
├── README.md           # Project documentation
├── CHANGELOG.md        # Version history
└── .gitignore          # Git ignore rules
```

---

## Future Improvements

- [ ] WebSocket integration for real-time data streams
- [ ] Full PDF export with html2pdf.js
- [ ] IoT sensor data integration
- [ ] Multi-language support (i18n)
- [ ] User authentication and role-based access
- [ ] Historical data comparison and trend analysis
- [ ] Push notification support
- [ ] PWA (Progressive Web App) support
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Unit and integration test suite

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

> Built with ❤️ as a portfolio project demonstrating advanced HTML, CSS, JavaScript, data visualization, SVG maps, real-time simulations, and modern dashboard development.
