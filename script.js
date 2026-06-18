/* ============================================================
   SMART CITY DASHBOARD — MAIN APPLICATION
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------
     UTILITIES
     ---------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
  const formatNum = (n) => n.toLocaleString('en-US');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ----------------------------------------
     STATE
     ---------------------------------------- */
  const state = {
    theme: 'dark',
    autoRefresh: true,
    layout: 'grid',
    notifSound: true,
    notifications: [],
    alerts: [],
    intervals: [],
    charts: {},
    mapScale: 1,
  };

  /* ----------------------------------------
     LOCAL STORAGE
     ---------------------------------------- */
  function loadSettings() {
    try {
      const saved = localStorage.getItem('smartcity_settings');
      if (saved) {
        const s = JSON.parse(saved);
        state.theme = s.theme || 'dark';
        state.autoRefresh = s.autoRefresh !== false;
        state.layout = s.layout || 'grid';
        state.notifSound = s.notifSound !== false;
      }
      const savedAlerts = localStorage.getItem('smartcity_alerts');
      if (savedAlerts) state.alerts = JSON.parse(savedAlerts);
      const savedNotifs = localStorage.getItem('smartcity_notifications');
      if (savedNotifs) state.notifications = JSON.parse(savedNotifs);
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    localStorage.setItem('smartcity_settings', JSON.stringify({
      theme: state.theme,
      autoRefresh: state.autoRefresh,
      layout: state.layout,
      notifSound: state.notifSound,
    }));
  }

  function saveAlerts() {
    localStorage.setItem('smartcity_alerts', JSON.stringify(state.alerts));
  }

  function saveNotifications() {
    localStorage.setItem('smartcity_notifications', JSON.stringify(state.notifications.slice(0, 50)));
  }

  /* ----------------------------------------
     TOAST SYSTEM
     ---------------------------------------- */
  function showToast(message, type = 'info') {
    const icons = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', danger: 'fa-times-circle', info: 'fa-info-circle' };
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  /* ----------------------------------------
     NOTIFICATION SYSTEM
     ---------------------------------------- */
  function addNotification(message, icon = 'fa-bell') {
    const n = {
      id: Date.now(),
      message,
      icon,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
    };
    state.notifications.unshift(n);
    if (state.notifications.length > 50) state.notifications.pop();
    saveNotifications();
    updateNotifUI();
  }

  function updateNotifUI() {
    const count = state.notifications.length;
    const badge = $('#notif-count');
    if (count > 0) {
      badge.style.display = 'flex';
      badge.textContent = count > 99 ? '99+' : count;
    } else {
      badge.style.display = 'none';
    }
    renderNotifList();
  }

  function renderNotifList() {
    const list = $('#notification-list');
    if (state.notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash"></i><br>No notifications</div>';
      return;
    }
    list.innerHTML = state.notifications.map(n =>
      `<div class="notif-item"><i class="fas ${n.icon}"></i>${n.message}<span class="notif-time">${n.time}</span></div>`
    ).join('');
  }

  /* ----------------------------------------
     THEME
     ---------------------------------------- */
  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const icon = $('#theme-icon');
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    $$('.toggle-btn[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    saveSettings();
    rebuildCharts();
  }

  /* ----------------------------------------
     NAVIGATION
     ---------------------------------------- */
  function navigateTo(sectionId) {
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.section === sectionId));
    $$('.section').forEach(s => {
      s.classList.remove('active');
      if (s.id === `section-${sectionId}`) s.classList.add('active');
    });
    if (window.innerWidth < 768) $('#sidebar').classList.remove('mobile-open');
  }

  /* ----------------------------------------
     CLOCK
     ---------------------------------------- */
  function updateClock() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    $('#city-clock').innerHTML = `<span class="clock-time">${h}:${m}:${s}</span> <span>${day}, ${date} ${month} ${year}</span>`;
  }

  /* ----------------------------------------
     OVERVIEW CARDS
     ---------------------------------------- */
  const overviewData = {
    population: { base: 2847561, variance: 50 },
    vehicles: { base: 45230, variance: 1200 },
    power: { base: 2450, unit: ' MWh', variance: 80 },
    water: { base: 4200, unit: ' KL', variance: 150 },
    emergency: { base: 18, variance: 5 },
    sensors: { base: 4712, variance: 20 },
    aqi: { base: 72, variance: 15 },
    traffic: { base: 64, unit: '%', variance: 10 },
  };

  function updateOverview() {
    Object.keys(overviewData).forEach(key => {
      const d = overviewData[key];
      const val = d.base + rand(-d.variance, d.variance);
      const el = $(`#stat-${key}`);
      if (el) el.textContent = formatNum(val) + (d.unit || '');
    });
    const trends = ['population', 'vehicles', 'power', 'water', 'emergency', 'sensors', 'aqi', 'traffic'];
    trends.forEach(t => {
      const el = $(`#trend-${t}`);
      if (!el) return;
      const v = randFloat(-5, 5);
      const isUp = v >= 0;
      el.className = `stat-trend ${isUp ? 'up' : 'down'}`;
      el.innerHTML = `<i class="fas fa-arrow-${isUp ? 'up' : 'down'}"></i> ${isUp ? '+' : ''}${v}%`;
    });
  }

  /* ----------------------------------------
     WEATHER
     ---------------------------------------- */
  const weatherConditions = [
    { name: 'Clear Sky', icon: 'fa-sun', gradient: ['#f59e0b', '#f97316'] },
    { name: 'Partly Cloudy', icon: 'fa-cloud-sun', gradient: ['#64748b', '#94a3b8'] },
    { name: 'Cloudy', icon: 'fa-cloud', gradient: ['#475569', '#64748b'] },
    { name: 'Light Rain', icon: 'fa-cloud-rain', gradient: ['#3b82f6', '#06b6d4'] },
    { name: 'Thunderstorm', icon: 'fa-bolt', gradient: ['#7c3aed', '#4338ca'] },
    { name: 'Sunny', icon: 'fa-sun', gradient: ['#f59e0b', '#ef4444'] },
    { name: 'Drizzle', icon: 'fa-cloud-showers-heavy', gradient: ['#64748b', '#3b82f6'] },
    { name: 'Foggy', icon: 'fa-smog', gradient: ['#94a3b8', '#cbd5e1'] },
  ];

  function updateWeather() {
    const cond = weatherConditions[rand(0, weatherConditions.length - 1)];
    const temp = rand(18, 42);
    const feels = temp + rand(-3, 5);
    const humidity = rand(30, 90);
    const wind = rand(5, 35);
    const pressure = rand(1005, 1025);
    const uv = rand(1, 11);
    const vis = rand(5, 15);

    const iconEl = $('#weather-icon');
    iconEl.className = `fas ${cond.icon} weather-big-icon`;
    iconEl.style.background = `linear-gradient(135deg, ${cond.gradient[0]}, ${cond.gradient[1]})`;
    iconEl.style.webkitBackgroundClip = 'text';
    iconEl.style.webkitTextFillColor = 'transparent';
    iconEl.style.backgroundClip = 'text';

    $('#weather-temp').textContent = `${temp}°C`;
    $('#weather-condition').textContent = cond.name;
    $('#weather-feels').textContent = `${feels}°C`;
    $('#weather-humidity').textContent = `${humidity}%`;
    $('#weather-wind').textContent = `${wind} km/h`;
    $('#weather-pressure').textContent = `${pressure} hPa`;
    $('#weather-uv').textContent = uv;
    $('#weather-visibility').textContent = `${vis} km`;
  }

  /* ----------------------------------------
     TRAFFIC SIMULATION
     ---------------------------------------- */
  let trafficVehicles = [];

  function initTrafficVehicles() {
    trafficVehicles = [];
    for (let i = 0; i < 40; i++) {
      trafficVehicles.push({
        x: rand(0, 700),
        y: rand(0, 400),
        speed: randFloat(0.5, 3),
        dir: rand(0, 3),
        color: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#06b6d4'][rand(0, 6)],
        size: rand(6, 10),
      });
    }
  }

  function drawTraffic() {
    const canvas = $('#traffic-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    /* Draw background */
    ctx.fillStyle = state.theme === 'dark' ? '#0f172a' : '#e2e8f0';
    ctx.fillRect(0, 0, w, h);

    /* Draw roads */
    ctx.strokeStyle = state.theme === 'dark' ? '#334155' : '#94a3b8';
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';

    const roads = [
      [[50, 100], [650, 100]], [[50, 200], [650, 200]], [[50, 300], [650, 300]],
      [[100, 50], [100, 350]], [[250, 50], [250, 350]], [[400, 50], [400, 350]], [[550, 50], [550, 350]],
    ];
    roads.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r[0][0], r[0][1]);
      ctx.lineTo(r[1][0], r[1][1]);
      ctx.stroke();
    });

    /* Road markings */
    ctx.strokeStyle = state.theme === 'dark' ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 12]);
    roads.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(r[0][0], r[0][1]);
      ctx.lineTo(r[1][0], r[1][1]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    /* Intersections */
    const intersections = [
      [100, 100], [250, 100], [400, 100], [550, 100],
      [100, 200], [250, 200], [400, 200], [550, 200],
      [100, 300], [250, 300], [400, 300], [550, 300],
    ];
    intersections.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 6, 0, Math.PI * 2);
      ctx.fillStyle = state.theme === 'dark' ? '#64748b' : '#475569';
      ctx.fill();
    });

    /* Move and draw vehicles */
    trafficVehicles.forEach(v => {
      switch (v.dir) {
        case 0: v.x += v.speed; if (v.x > w + 10) v.x = -10; break;
        case 1: v.x -= v.speed; if (v.x < -10) v.x = w + 10; break;
        case 2: v.y += v.speed; if (v.y > h + 10) v.y = -10; break;
        case 3: v.y -= v.speed; if (v.y < -10) v.y = h + 10; break;
      }

      ctx.beginPath();
      ctx.arc(v.x, v.y, v.size, 0, Math.PI * 2);
      ctx.fillStyle = v.color;
      ctx.fill();

      /* Glow */
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.size + 4, 0, Math.PI * 2);
      ctx.fillStyle = v.color + '33';
      ctx.fill();
    });

    /* Labels */
    ctx.fillStyle = state.theme === 'dark' ? '#64748b' : '#475569';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('SECTOR A', 140, 70);
    ctx.fillText('SECTOR B', 290, 70);
    ctx.fillText('SECTOR C', 440, 70);
    ctx.fillText('MAIN ST', 600, 115);
    ctx.fillText('PARK AVE', 600, 215);
    ctx.fillText('RIVER RD', 600, 315);
  }

  function updateTrafficStats() {
    const density = rand(20, 95);
    const vehicles = rand(800, 2500);
    const avgSpeed = density > 70 ? rand(15, 30) : rand(35, 65);
    const incidents = rand(0, 8);

    $('#congestion-bar').style.width = `${density}%`;
    let level = 'Low';
    let color = 'var(--success)';
    if (density > 70) { level = 'High'; color = 'var(--danger)'; }
    else if (density > 40) { level = 'Medium'; color = 'var(--warning)'; }
    const label = $('#congestion-label');
    label.textContent = level;
    label.style.color = color;

    $('#traffic-vehicle-count').textContent = formatNum(vehicles);
    $('#traffic-avg-speed').textContent = `${avgSpeed} km/h`;
    $('#traffic-incidents').textContent = incidents;

    if (density > 80) {
      addNotification('High traffic congestion detected!', 'fa-traffic-light');
      showToast('Traffic congestion alert: Density above 80%', 'warning');
    }
  }

  let trafficAnimFrame;
  function animateTraffic() {
    drawTraffic();
    trafficAnimFrame = requestAnimationFrame(animateTraffic);
  }

  /* ----------------------------------------
     AIR QUALITY
     ---------------------------------------- */
  function getAQIColor(val) {
    if (val <= 50) return '#10b981';
    if (val <= 100) return '#f59e0b';
    if (val <= 150) return '#f97316';
    return '#ef4444';
  }

  function getAQIStatus(val) {
    if (val <= 50) return { label: 'Good', desc: 'Air quality is satisfactory and poses little or no risk.' };
    if (val <= 100) return { label: 'Moderate', desc: 'Air quality is acceptable. Sensitive groups may experience minor issues.' };
    if (val <= 150) return { label: 'Poor', desc: 'Members of sensitive groups may experience health effects. General public is less likely to be affected.' };
    return { label: 'Hazardous', desc: 'Health alert! Everyone may experience serious health effects.' };
  }

  function drawAQIGauge(val) {
    const canvas = $('#aqi-gauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = canvas.width;
    const cx = s / 2, cy = s / 2, r = s / 2 - 20;

    ctx.clearRect(0, 0, s, s);

    /* Background arc */
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = state.theme === 'dark' ? '#1e293b' : '#e2e8f0';
    ctx.lineCap = 'round';
    ctx.stroke();

    /* Value arc */
    const pct = clamp(val / 300, 0, 1);
    const endAngle = 0.75 * Math.PI + pct * 1.5 * Math.PI;
    const grad = ctx.createLinearGradient(0, s, s, 0);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(0.33, '#f59e0b');
    grad.addColorStop(0.66, '#f97316');
    grad.addColorStop(1, '#ef4444');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.stroke();

    /* Center text */
    ctx.fillStyle = getAQIColor(val);
    ctx.font = '900 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, cx, cy - 8);
    ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillText('AQI', cx, cy + 22);
  }

  function updateAirQuality() {
    const aqi = rand(25, 180);
    const pm25 = rand(10, 80);
    const pm10 = rand(20, 120);
    const co2 = rand(380, 500);
    const no2 = rand(8, 55);
    const so2 = rand(2, 25);
    const o3 = rand(20, 80);

    drawAQIGauge(aqi);
    const status = getAQIStatus(aqi);
    $('#aqi-value').textContent = aqi;
    $('#aqi-value').style.color = getAQIColor(aqi);
    $('#aqi-status').textContent = status.label;
    $('#aqi-status').style.color = getAQIColor(aqi);
    $('#aqi-desc').textContent = status.desc;

    const pollutants = [
      { id: 'pm25', val: pm25, max: 150 },
      { id: 'pm10', val: pm10, max: 250 },
      { id: 'co2', val: co2, max: 600 },
      { id: 'no2', val: no2, max: 100 },
      { id: 'so2', val: so2, max: 50 },
      { id: 'o3', val: o3, max: 120 },
    ];

    pollutants.forEach(p => {
      $(`#${p.id}-val`).textContent = p.val;
      const bar = $(`#${p.id}-bar`);
      const pct = (p.val / p.max) * 100;
      bar.style.width = `${clamp(pct, 5, 100)}%`;
      bar.style.background = getAQIColor(pct > 66 ? 160 : pct > 33 ? 80 : 30);
    });

    if (aqi > 150) {
      addNotification(`Air quality is ${status.label} (AQI: ${aqi})!`, 'fa-smog');
      showToast(`AQI Alert: ${status.label} — AQI ${aqi}`, 'danger');
    }
  }

  /* ----------------------------------------
     EMERGENCY ALERTS
     ---------------------------------------- */
  const alertTypes = {
    fire: { label: '🔥 Fire Emergency', icon: 'fa-fire', cls: 'fire' },
    medical: { label: '🏥 Medical Emergency', icon: 'fa-hospital', cls: 'medical' },
    accident: { label: '🚗 Road Accident', icon: 'fa-car-crash', cls: 'accident' },
    flood: { label: '🌊 Flood Warning', icon: 'fa-water', cls: 'flood' },
    power: { label: '⚡ Power Failure', icon: 'fa-plug', cls: 'power' },
    'water-leak': { label: '💧 Water Leakage', icon: 'fa-tint', cls: 'water-leak' },
  };

  function renderAlerts() {
    const list = $('#alerts-list');
    const countEl = $('#alert-count');
    countEl.textContent = state.alerts.length;
    if (state.alerts.length === 0) {
      list.innerHTML = '<div class="notif-empty" style="padding:40px;text-align:center;color:var(--text-muted)"><i class="fas fa-shield-alt" style="font-size:2rem;margin-bottom:12px;display:block;"></i>No active alerts</div>';
      return;
    }
    list.innerHTML = state.alerts.map(a => {
      const t = alertTypes[a.type] || alertTypes.fire;
      return `
      <div class="alert-item severity-${a.severity}">
        <div class="alert-icon-wrap ${t.cls}"><i class="fas ${t.icon}"></i></div>
        <div class="alert-info">
          <div class="alert-type">${t.label}</div>
          <div class="alert-location"><i class="fas fa-map-marker-alt"></i> ${a.location}</div>
          <div class="alert-desc">${a.description}</div>
          <div class="alert-meta">
            <span class="alert-severity-badge ${a.severity}">${a.severity}</span>
            <span class="alert-time"><i class="fas fa-clock"></i> ${a.time}</span>
          </div>
        </div>
        <button class="alert-delete-btn" data-id="${a.id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
      </div>`;
    }).join('');

    $$('.alert-delete-btn', list).forEach(btn => {
      btn.addEventListener('click', () => {
        state.alerts = state.alerts.filter(a => a.id !== parseInt(btn.dataset.id));
        saveAlerts();
        renderAlerts();
        showToast('Alert removed', 'info');
      });
    });
  }

  function addAlert(type, severity, location, description) {
    const alert = {
      id: Date.now(),
      type,
      severity,
      location,
      description,
      time: new Date().toLocaleTimeString(),
    };
    state.alerts.unshift(alert);
    saveAlerts();
    renderAlerts();
    addNotification(`Emergency: ${alertTypes[type]?.label || type} at ${location}`, 'fa-exclamation-triangle');
    showToast(`New ${severity} alert: ${alertTypes[type]?.label || type}`, severity === 'critical' ? 'danger' : 'warning');
  }

  /* ----------------------------------------
     CHARTS (Chart.js)
     ---------------------------------------- */
  function getChartColors() {
    const isDark = state.theme === 'dark';
    return {
      text: isDark ? '#94a3b8' : '#64748b',
      grid: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      bg: isDark ? '#111827' : '#ffffff',
    };
  }

  function chartDefaults() {
    const c = getChartColors();
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: c.text, font: { family: 'Inter', size: 11 }, padding: 16 } },
      },
      scales: {
        x: { ticks: { color: c.text, font: { family: 'Inter', size: 10 } }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { family: 'Inter', size: 10 } }, grid: { color: c.grid } },
      },
    };
  }

  function destroyCharts() {
    Object.values(state.charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    state.charts = {};
  }

  function buildCharts() {
    const c = getChartColors();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /* 1. Population Growth - Line */
    const popCtx = $('#chart-population');
    if (popCtx) {
      state.charts.population = new Chart(popCtx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Population (millions)',
            data: [2.72, 2.74, 2.76, 2.78, 2.79, 2.81, 2.82, 2.83, 2.84, 2.85, 2.84, 2.85],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 6,
          }],
        },
        options: { ...chartDefaults() },
      });
    }

    /* 2. Energy Consumption - Bar */
    const energyCtx = $('#chart-energy');
    if (energyCtx) {
      state.charts.energy = new Chart(energyCtx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'Consumption (MWh)',
            data: [2100, 2300, 2150, 2450, 2600, 2800, 3000, 2900, 2700, 2500, 2350, 2400],
            backgroundColor: [
              'rgba(59,130,246,0.7)', 'rgba(139,92,246,0.7)', 'rgba(6,182,212,0.7)',
              'rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)',
              'rgba(249,115,22,0.7)', 'rgba(20,184,166,0.7)', 'rgba(99,102,241,0.7)',
              'rgba(236,72,153,0.7)', 'rgba(168,85,247,0.7)', 'rgba(34,197,94,0.7)',
            ],
            borderRadius: 8,
            borderSkipped: false,
          }],
        },
        options: { ...chartDefaults() },
      });
    }

    /* 3. Water Usage - Doughnut */
    const waterCtx = $('#chart-water');
    if (waterCtx) {
      state.charts.water = new Chart(waterCtx, {
        type: 'doughnut',
        data: {
          labels: ['Residential', 'Industrial', 'Commercial', 'Municipal', 'Agriculture'],
          datasets: [{
            data: [35, 25, 20, 12, 8],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'],
            borderWidth: 2,
            borderColor: c.bg,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: c.text, font: { family: 'Inter', size: 11 }, padding: 16 } },
          },
        },
      });
    }

    /* 4. Traffic Trends - Area (Line with fill) */
    const trafficCtx = $('#chart-traffic');
    if (trafficCtx) {
      state.charts.traffic = new Chart(trafficCtx, {
        type: 'line',
        data: {
          labels: ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'],
          datasets: [{
            label: 'Traffic Volume',
            data: [1200, 4500, 3200, 2800, 3100, 4800, 5200, 3400, 1800],
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.12)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#f97316',
            pointRadius: 4,
          }],
        },
        options: { ...chartDefaults() },
      });
    }

    /* 5. Pollution Trends - Line */
    const pollCtx = $('#chart-pollution');
    if (pollCtx) {
      state.charts.pollution = new Chart(pollCtx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'PM2.5',
              data: [35, 42, 38, 45, 52, 48, 55, 60, 53, 47, 40, 36],
              borderColor: '#ef4444',
              backgroundColor: 'transparent',
              tension: 0.4,
              pointRadius: 3,
            },
            {
              label: 'PM10',
              data: [55, 62, 58, 65, 72, 68, 75, 80, 73, 67, 60, 56],
              borderColor: '#f59e0b',
              backgroundColor: 'transparent',
              tension: 0.4,
              pointRadius: 3,
            },
            {
              label: 'AQI',
              data: [45, 52, 48, 55, 68, 62, 72, 78, 65, 58, 50, 46],
              borderColor: '#10b981',
              backgroundColor: 'transparent',
              tension: 0.4,
              pointRadius: 3,
            },
          ],
        },
        options: { ...chartDefaults() },
      });
    }

    /* 6. Emergency Statistics - Pie */
    const emCtx = $('#chart-emergency');
    if (emCtx) {
      state.charts.emergencyChart = new Chart(emCtx, {
        type: 'pie',
        data: {
          labels: ['Fire', 'Medical', 'Accident', 'Flood', 'Power', 'Water Leak'],
          datasets: [{
            data: [18, 32, 24, 8, 12, 6],
            backgroundColor: ['#ef4444', '#10b981', '#f97316', '#06b6d4', '#f59e0b', '#3b82f6'],
            borderWidth: 2,
            borderColor: c.bg,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: c.text, font: { family: 'Inter', size: 11 }, padding: 16 } },
          },
        },
      });
    }

    /* Water hourly chart */
    const whCtx = $('#chart-water-hourly');
    if (whCtx) {
      state.charts.waterHourly = new Chart(whCtx, {
        type: 'bar',
        data: {
          labels: ['12AM', '3AM', '6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
          datasets: [{
            label: 'Usage (KL)',
            data: [120, 80, 350, 480, 520, 440, 580, 320],
            backgroundColor: 'rgba(6, 182, 212, 0.6)',
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: { ...chartDefaults() },
      });
    }
  }

  function rebuildCharts() {
    destroyCharts();
    buildCharts();
  }

  /* ----------------------------------------
     CITY MAP (SVG)
     ---------------------------------------- */
  const mapLocations = [
    { id: 'hospital', x: 150, y: 120, icon: '🏥', label: 'City Hospital', color: '#ef4444', details: 'Central City Hospital<br>Beds: 450 | ICU: 32<br>Status: Operational<br>Emergency: Active 24/7' },
    { id: 'school', x: 350, y: 80, icon: '🏫', label: 'Metro School', color: '#3b82f6', details: 'Metro International School<br>Students: 2,400<br>Classes: Pre-K to 12<br>Rating: A+' },
    { id: 'police', x: 550, y: 150, icon: '🚔', label: 'Police HQ', color: '#1e40af', details: 'Metro Police Headquarters<br>Officers: 340<br>Vehicles: 85<br>Response Time: 4 min' },
    { id: 'fire', x: 750, y: 100, icon: '🚒', label: 'Fire Station', color: '#dc2626', details: 'Central Fire Station<br>Personnel: 120<br>Trucks: 12<br>Response Time: 3 min' },
    { id: 'airport', x: 850, y: 300, icon: '✈️', label: 'Metro Airport', color: '#7c3aed', details: 'Metro International Airport<br>Daily Flights: 280<br>Terminals: 3<br>Annual Passengers: 15M' },
    { id: 'traffic-signal', x: 450, y: 300, icon: '🚦', label: 'Central Signal Hub', color: '#f59e0b', details: 'Traffic Signal Control<br>Active Signals: 342<br>Smart Junctions: 86<br>AI Managed: Yes' },
    { id: 'govt', x: 250, y: 350, icon: '🏛️', label: 'City Hall', color: '#0891b2', details: 'Metro City Government Office<br>Departments: 18<br>Staff: 520<br>Open: Mon-Fri 9AM-5PM' },
    { id: 'residential', x: 650, y: 400, icon: '🏘️', label: 'Residential Zone', color: '#10b981', details: 'Green Valley Residential Area<br>Households: 12,500<br>Population: 48,000<br>Parks: 8' },
    { id: 'industrial', x: 150, y: 480, icon: '🏭', label: 'Industrial Zone', color: '#64748b', details: 'Metro Industrial District<br>Factories: 65<br>Workers: 8,400<br>Power Usage: 820 MWh' },
  ];

  function buildCityMap() {
    const svg = $('#city-map-svg');
    if (!svg) return;

    const isDark = state.theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#e8eff7';
    const roadColor = isDark ? '#1e293b' : '#cbd5e1';
    const roadStroke = isDark ? '#334155' : '#94a3b8';
    const waterColor = isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.15)';
    const greenColor = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    svg.innerHTML = `
      <!-- Background -->
      <rect width="1000" height="600" fill="${bgColor}" rx="12"/>
      
      <!-- Green areas -->
      <rect x="60" y="60" width="200" height="120" fill="${greenColor}" rx="8" opacity="0.6"/>
      <rect x="500" y="350" width="250" height="150" fill="${greenColor}" rx="8" opacity="0.6"/>
      <rect x="80" y="400" width="180" height="140" fill="${greenColor}" rx="8" opacity="0.3"/>
      
      <!-- Water body -->
      <ellipse cx="850" cy="480" rx="120" ry="70" fill="${waterColor}" opacity="0.8"/>
      <text x="830" y="490" font-size="11" fill="${textColor}" font-family="Inter" font-weight="600">Lake Metro</text>
      
      <!-- Major roads -->
      <line x1="50" y1="200" x2="950" y2="200" stroke="${roadColor}" stroke-width="16" stroke-linecap="round"/>
      <line x1="50" y1="350" x2="700" y2="350" stroke="${roadColor}" stroke-width="12" stroke-linecap="round"/>
      <line x1="300" y1="50" x2="300" y2="550" stroke="${roadColor}" stroke-width="12" stroke-linecap="round"/>
      <line x1="600" y1="50" x2="600" y2="550" stroke="${roadColor}" stroke-width="12" stroke-linecap="round"/>
      <line x1="50" y1="500" x2="750" y2="500" stroke="${roadColor}" stroke-width="10" stroke-linecap="round"/>
      
      <!-- Road markings -->
      <line x1="60" y1="200" x2="940" y2="200" stroke="${roadStroke}" stroke-width="1" stroke-dasharray="10,8"/>
      <line x1="300" y1="60" x2="300" y2="540" stroke="${roadStroke}" stroke-width="1" stroke-dasharray="10,8"/>
      <line x1="600" y1="60" x2="600" y2="540" stroke="${roadStroke}" stroke-width="1" stroke-dasharray="10,8"/>
      
      <!-- Road labels -->
      <text x="460" y="220" font-size="9" fill="${textColor}" font-family="Inter" font-weight="600" letter-spacing="1">MAIN HIGHWAY</text>
      <text x="306" y="280" font-size="9" fill="${textColor}" font-family="Inter" font-weight="600" transform="rotate(90, 306, 280)" letter-spacing="1">CENTRAL AVE</text>

      <!-- Location markers -->
      ${mapLocations.map(loc => `
        <g class="map-marker" data-id="${loc.id}" style="cursor:pointer" role="button" tabindex="0">
          <circle cx="${loc.x}" cy="${loc.y}" r="24" fill="${loc.color}22" stroke="${loc.color}" stroke-width="2">
            <animate attributeName="r" values="24;28;24" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="${loc.x}" cy="${loc.y}" r="16" fill="${loc.color}55"/>
          <text x="${loc.x}" y="${loc.y + 5}" text-anchor="middle" font-size="16">${loc.icon}</text>
          <text x="${loc.x}" y="${loc.y + 40}" text-anchor="middle" font-size="10" fill="${textColor}" font-family="Inter" font-weight="600">${loc.label}</text>
        </g>
      `).join('')}
    `;

    /* Click handlers */
    $$('.map-marker', svg).forEach(marker => {
      marker.addEventListener('click', () => {
        const id = marker.dataset.id;
        const loc = mapLocations.find(l => l.id === id);
        if (loc) {
          $('#map-popup-title').textContent = loc.label;
          $('#map-popup-body').innerHTML = loc.details;
          $('#map-popup').style.display = 'block';
        }
      });
    });
  }

  /* ----------------------------------------
     ENERGY MANAGEMENT
     ---------------------------------------- */
  function updateEnergy() {
    const total = rand(2200, 2800);
    const solar = rand(500, 900);
    const grid = total - solar - rand(100, 400);
    const battery = rand(60, 95);

    $('#energy-total').textContent = `${formatNum(total)} MWh`;
    const totalPct = Math.round((total / 3500) * 100);
    $('#energy-total-bar').style.width = `${totalPct}%`;
    $('#energy-total-pct').textContent = `${totalPct}% of capacity`;

    const solarPct = Math.round((solar / total) * 100);
    $('#energy-solar').textContent = `${formatNum(solar)} MWh`;
    $('#energy-solar-bar').style.width = `${solarPct}%`;
    $('#energy-solar-pct').textContent = `${solarPct}% of total`;

    const gridVal = Math.max(grid, 0);
    const gridPct = Math.round((gridVal / total) * 100);
    $('#energy-grid').textContent = `${formatNum(gridVal)} MWh`;
    $('#energy-grid-bar').style.width = `${gridPct}%`;
    $('#energy-grid-pct').textContent = `${gridPct}% of total`;

    $('#energy-battery').textContent = `${battery}%`;
    $('#energy-battery-bar').style.width = `${battery}%`;
    $('#energy-battery-pct').textContent = battery > 80 ? 'Fully Charged' : battery > 40 ? 'Charging' : 'Low';
  }

  /* ----------------------------------------
     WATER MANAGEMENT
     ---------------------------------------- */
  function updateWater() {
    const tankLevel = rand(45, 95);
    const daily = randFloat(3.0, 6.0);
    const quality = rand(88, 99);
    const leaks = rand(0, 5);
    const flow = rand(800, 1800);

    $('#water-tank-level').style.height = `${tankLevel}%`;
    $('#water-tank-pct').textContent = `${tankLevel}%`;
    $('#water-daily').textContent = `${daily} ML`;
    $('#water-quality').textContent = `${quality}% Pure`;
    $('#water-leaks').textContent = leaks === 0 ? 'None Detected' : `${leaks} Active`;
    $('#water-leaks').style.color = leaks > 2 ? 'var(--danger)' : leaks > 0 ? 'var(--warning)' : 'var(--success)';
    $('#water-flow').textContent = `${formatNum(flow)} L/min`;

    if (leaks > 3) {
      addNotification(`Water leak alert: ${leaks} active leaks detected!`, 'fa-tint');
      showToast(`Water leak alert: ${leaks} leaks detected`, 'warning');
    }
  }

  /* ----------------------------------------
     WASTE MANAGEMENT
     ---------------------------------------- */
  function updateWaste() {
    const collected = rand(1200, 1800);
    const totalBins = 2000;
    const recycling = rand(35, 65);
    const fleet = rand(70, 95);

    const wc = $('#waste-collected');
    if(wc) {
      wc.textContent = `${formatNum(collected)} / ${formatNum(totalBins)}`;
      const collectedPct = (collected / totalBins) * 100;
      $('#waste-collected-bar').style.width = `${collectedPct}%`;

      $('#waste-recycling').textContent = `${recycling}%`;
      $('#waste-recycling-bar').style.width = `${recycling}%`;

      $('#waste-fleet').textContent = `${fleet} Trucks`;
      $('#waste-fleet-bar').style.width = `${fleet}%`;
    }
  }

  /* ----------------------------------------
     SMART LIGHTING
     ---------------------------------------- */
  function updateLighting() {
    const total = 20000;
    const active = rand(18000, 19800);
    const faulty = rand(5, 45);
    const saved = rand(300, 600);

    const la = $('#lighting-active');
    if(la) {
      la.textContent = `${formatNum(active)} / ${formatNum(total)}`;
      const activePct = (active / total) * 100;
      $('#lighting-active-bar').style.width = `${activePct}%`;

      $('#lighting-saved').textContent = `${saved} kWh`;
      $('#lighting-saved-bar').style.width = `${clamp((saved / 800) * 100, 10, 100)}%`;

      $('#lighting-faulty').textContent = faulty;
      $('#lighting-faulty-bar').style.width = `${clamp((faulty / 100) * 100, 2, 100)}%`;
    }
  }

  /* ----------------------------------------
     SYSTEM HEALTH
     ---------------------------------------- */
  function updateSystemHealth() {
    const totalSensors = 5000;
    const active = rand(4500, 5000);
    const offline = totalSensors - active;
    const network = rand(92, 100);
    const server = rand(60, 98);

    const activePct = Math.round((active / totalSensors) * 100);
    const offlinePct = Math.round((offline / totalSensors) * 100);

    $('#health-sensors-bar').style.width = `${activePct}%`;
    $('#health-sensors-val').textContent = `${formatNum(active)} / ${formatNum(totalSensors)}`;
    $('#health-sensors-status').textContent = activePct > 90 ? 'Operational' : 'Degraded';

    $('#health-offline-bar').style.width = `${Math.max(offlinePct, 2)}%`;
    $('#health-offline-val').textContent = `${formatNum(offline)} / ${formatNum(totalSensors)}`;
    $('#health-offline-status').textContent = offline > 200 ? 'Needs Attention' : 'Acceptable';

    $('#health-network-bar').style.width = `${network}%`;
    $('#health-network-val').textContent = `${network}% Uptime`;
    $('#health-network-status').textContent = network > 95 ? 'Excellent' : 'Good';

    $('#health-server-bar').style.width = `${server}%`;
    $('#health-server-val').textContent = `${server}% Load`;
    const serverStatus = $('#health-server-status');
    if (server > 90) {
      serverStatus.textContent = 'High Load';
      serverStatus.className = 'health-status warning';
    } else {
      serverStatus.textContent = 'Running';
      serverStatus.className = 'health-status online';
    }

    $('#health-monitor-bar').style.width = '100%';
    $('#health-monitor-val').textContent = 'All Systems Active';
    $('#health-monitor-status').textContent = 'Active';
  }

  /* ----------------------------------------
     SEARCH
     ---------------------------------------- */
  const searchDB = [
    { name: 'City Hospital', icon: 'fa-hospital', section: 'city-map', type: 'Hospital' },
    { name: 'Emergency Hospital Wing', icon: 'fa-hospital', section: 'city-map', type: 'Hospital' },
    { name: 'Children\'s Hospital', icon: 'fa-hospital', section: 'city-map', type: 'Hospital' },
    { name: 'Metro School', icon: 'fa-school', section: 'city-map', type: 'School' },
    { name: 'Central High School', icon: 'fa-school', section: 'city-map', type: 'School' },
    { name: 'Technical University', icon: 'fa-university', section: 'city-map', type: 'School' },
    { name: 'Police Headquarters', icon: 'fa-shield-alt', section: 'city-map', type: 'Police Station' },
    { name: 'South Police Station', icon: 'fa-shield-alt', section: 'city-map', type: 'Police Station' },
    { name: 'Traffic Police Hub', icon: 'fa-shield-alt', section: 'city-map', type: 'Police Station' },
    { name: 'Emergency Alerts', icon: 'fa-exclamation-triangle', section: 'emergency', type: 'Alert' },
    { name: 'Fire Emergency Alerts', icon: 'fa-fire', section: 'emergency', type: 'Alert' },
    { name: 'Medical Alerts', icon: 'fa-ambulance', section: 'emergency', type: 'Alert' },
    { name: 'City Analytics', icon: 'fa-chart-line', section: 'analytics', type: 'Analytics' },
    { name: 'Population Analytics', icon: 'fa-users', section: 'analytics', type: 'Analytics' },
    { name: 'Energy Analytics', icon: 'fa-bolt', section: 'analytics', type: 'Analytics' },
    { name: 'Traffic Analytics', icon: 'fa-car', section: 'analytics', type: 'Analytics' },
    { name: 'Water Management', icon: 'fa-tint', section: 'water', type: 'Analytics' },
    { name: 'Air Quality Monitor', icon: 'fa-wind', section: 'air-quality', type: 'Analytics' },
    { name: 'Weather System', icon: 'fa-cloud-sun', section: 'weather', type: 'Analytics' },
    { name: 'System Health', icon: 'fa-heartbeat', section: 'system-health', type: 'Analytics' },
    { name: 'Energy Management', icon: 'fa-bolt', section: 'energy', type: 'Analytics' },
    { name: 'Waste Management', icon: 'fa-trash', section: 'waste', type: 'Analytics' },
    { name: 'Smart Lighting', icon: 'fa-lightbulb', section: 'lighting', type: 'Analytics' },
    { name: 'City Overview', icon: 'fa-tachometer-alt', section: 'overview', type: 'Analytics' },
  ];

  function performSearch(query) {
    const container = $('#search-results');
    if (!query.trim()) {
      container.innerHTML = '<div class="search-no-results">Type to search…</div>';
      return;
    }
    const q = query.toLowerCase();
    const results = searchDB.filter(item =>
      item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
    );
    if (results.length === 0) {
      container.innerHTML = '<div class="search-no-results">No results found</div>';
      return;
    }
    container.innerHTML = results.map(r =>
      `<div class="search-result-item" data-section="${r.section}">
        <i class="fas ${r.icon}"></i>
        <span>${r.name} <small style="color:var(--text-muted);margin-left:8px;">${r.type}</small></span>
      </div>`
    ).join('');
    $$('.search-result-item', container).forEach(item => {
      item.addEventListener('click', () => {
        navigateTo(item.dataset.section);
        closeSearch();
      });
    });
  }

  function openSearch() {
    $('#search-overlay').classList.add('open');
    setTimeout(() => $('#search-input').focus(), 100);
  }

  function closeSearch() {
    $('#search-overlay').classList.remove('open');
    $('#search-input').value = '';
    $('#search-results').innerHTML = '';
  }

  /* ----------------------------------------
     EXPORT
     ---------------------------------------- */
  function exportPDF() {
    showToast('Generating PDF export…', 'info');
    setTimeout(() => {
      const content = document.querySelector('.page-content').innerText;
      const blob = new Blob([`Smart City Dashboard Report\n${'='.repeat(50)}\nGenerated: ${new Date().toLocaleString()}\n\n${content}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SmartCityDashboard_Report.txt';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Report exported successfully!', 'success');
    }, 1000);
  }

  function exportReport() {
    showToast('Compiling analytics report…', 'info');
    setTimeout(() => {
      const report = {
        generated: new Date().toISOString(),
        overview: {
          population: $('#stat-population')?.textContent,
          vehicles: $('#stat-vehicles')?.textContent,
          power: $('#stat-power')?.textContent,
          water: $('#stat-water')?.textContent,
          emergencies: $('#stat-emergency')?.textContent,
          sensors: $('#stat-sensors')?.textContent,
          aqi: $('#stat-aqi')?.textContent,
          traffic: $('#stat-traffic')?.textContent,
        },
        alerts: state.alerts,
        notifications: state.notifications.slice(0, 20),
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SmartCity_Analytics_Report.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Analytics report downloaded!', 'success');
    }, 800);
  }

  function exportCharts() {
    showToast('Exporting chart images…', 'info');
    let count = 0;
    Object.entries(state.charts).forEach(([name, chart]) => {
      if (chart && chart.toBase64Image) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = chart.toBase64Image();
          a.download = `chart_${name}.png`;
          a.click();
          count++;
          if (count === Object.keys(state.charts).length) {
            showToast('All charts exported!', 'success');
          }
        }, count * 300);
      }
    });
  }

  /* ----------------------------------------
     EVENT BINDINGS
     ---------------------------------------- */
  function bindEvents() {
    /* Sidebar toggle */
    $('#sidebar-toggle').addEventListener('click', () => {
      const sb = $('#sidebar');
      if (window.innerWidth < 768) {
        sb.classList.toggle('mobile-open');
      } else {
        sb.classList.toggle('collapsed');
      }
    });

    /* Nav links */
    $$('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.dataset.section);
      });
    });

    /* Theme toggle */
    $('#theme-toggle').addEventListener('click', () => {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    /* Search */
    $('#search-btn').addEventListener('click', openSearch);
    $('#search-input').addEventListener('input', (e) => performSearch(e.target.value));
    $('#search-overlay').addEventListener('click', (e) => {
      if (e.target === $('#search-overlay')) closeSearch();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') {
        closeSearch();
        $('#notification-panel').classList.remove('open');
        $('#settings-panel').classList.remove('open');
        $('#add-alert-modal').style.display = 'none';
        $('#export-menu').style.display = 'none';
      }
    });

    /* Notifications */
    $('#notif-btn').addEventListener('click', () => {
      $('#notification-panel').classList.toggle('open');
      $('#settings-panel').classList.remove('open');
    });
    $('#clear-notifications-btn').addEventListener('click', () => {
      state.notifications = [];
      saveNotifications();
      updateNotifUI();
      showToast('Notifications cleared', 'info');
    });

    /* Settings */
    $('#settings-btn').addEventListener('click', () => {
      $('#settings-panel').classList.toggle('open');
      $('#notification-panel').classList.remove('open');
    });
    $('#close-settings-btn').addEventListener('click', () => {
      $('#settings-panel').classList.remove('open');
    });

    /* Settings controls */
    $$('.toggle-btn[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    $('#auto-refresh-on').addEventListener('click', () => {
      state.autoRefresh = true;
      $('#auto-refresh-on').classList.add('active');
      $('#auto-refresh-off').classList.remove('active');
      saveSettings();
      startAutoRefresh();
      showToast('Auto refresh enabled', 'success');
    });
    $('#auto-refresh-off').addEventListener('click', () => {
      state.autoRefresh = false;
      $('#auto-refresh-off').classList.add('active');
      $('#auto-refresh-on').classList.remove('active');
      saveSettings();
      stopAutoRefresh();
      showToast('Auto refresh paused', 'info');
    });

    $('#layout-grid').addEventListener('click', () => {
      state.layout = 'grid';
      $('#layout-grid').classList.add('active');
      $('#layout-list').classList.remove('active');
      saveSettings();
    });
    $('#layout-list').addEventListener('click', () => {
      state.layout = 'list';
      $('#layout-list').classList.add('active');
      $('#layout-grid').classList.remove('active');
      saveSettings();
    });

    $('#notif-sound-on').addEventListener('click', () => {
      state.notifSound = true;
      $('#notif-sound-on').classList.add('active');
      $('#notif-sound-off').classList.remove('active');
      saveSettings();
    });
    $('#notif-sound-off').addEventListener('click', () => {
      state.notifSound = false;
      $('#notif-sound-off').classList.add('active');
      $('#notif-sound-on').classList.remove('active');
      saveSettings();
    });

    /* Export */
    $('#export-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = $('#export-menu');
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => { $('#export-menu').style.display = 'none'; });
    $('#export-pdf').addEventListener('click', exportPDF);
    $('#export-report').addEventListener('click', exportReport);
    $('#export-charts').addEventListener('click', exportCharts);

    /* Emergency Alerts */
    $('#add-alert-btn').addEventListener('click', () => {
      $('#add-alert-modal').style.display = 'flex';
    });
    $('#close-alert-modal').addEventListener('click', () => {
      $('#add-alert-modal').style.display = 'none';
    });
    $('#submit-alert-btn').addEventListener('click', () => {
      const type = $('#alert-type-select').value;
      const severity = $('#alert-severity-select').value;
      const location = $('#alert-location-input').value || 'Unknown Location';
      const desc = $('#alert-desc-input').value || 'No description provided.';
      addAlert(type, severity, location, desc);
      $('#add-alert-modal').style.display = 'none';
      $('#alert-location-input').value = '';
      $('#alert-desc-input').value = '';
    });

    /* Map controls */
    $('#close-map-popup').addEventListener('click', () => {
      $('#map-popup').style.display = 'none';
    });
    $('#map-zoom-in').addEventListener('click', () => {
      state.mapScale = Math.min(state.mapScale + 0.2, 2);
      $('#city-map-svg').style.transform = `scale(${state.mapScale})`;
    });
    $('#map-zoom-out').addEventListener('click', () => {
      state.mapScale = Math.max(state.mapScale - 0.2, 0.5);
      $('#city-map-svg').style.transform = `scale(${state.mapScale})`;
    });
    $('#map-reset').addEventListener('click', () => {
      state.mapScale = 1;
      $('#city-map-svg').style.transform = 'scale(1)';
    });

    /* Close panels on outside click */
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notification-panel') && !e.target.closest('#notif-btn')) {
        $('#notification-panel').classList.remove('open');
      }
      if (!e.target.closest('.settings-panel') && !e.target.closest('#settings-btn')) {
        $('#settings-panel').classList.remove('open');
      }
    });
  }

  /* ----------------------------------------
     AUTO REFRESH
     ---------------------------------------- */
  function startAutoRefresh() {
    stopAutoRefresh();
    if (!state.autoRefresh) return;
    state.intervals.push(setInterval(updateOverview, 4000));
    state.intervals.push(setInterval(updateWeather, 10000));
    state.intervals.push(setInterval(updateTrafficStats, 5000));
    state.intervals.push(setInterval(updateAirQuality, 8000));
    state.intervals.push(setInterval(updateEnergy, 7000));
    state.intervals.push(setInterval(updateWater, 9000));
    state.intervals.push(setInterval(updateWaste, 8500));
    state.intervals.push(setInterval(updateLighting, 9500));
    state.intervals.push(setInterval(updateSystemHealth, 6000));
  }

  function stopAutoRefresh() {
    state.intervals.forEach(id => clearInterval(id));
    state.intervals = [];
  }

  /* ----------------------------------------
     SEED DEFAULT ALERTS
     ---------------------------------------- */
  function seedAlerts() {
    if (state.alerts.length > 0) return;
    const defaults = [
      { type: 'fire', severity: 'critical', location: 'Sector 7, Industrial Zone', description: 'Major fire reported at warehouse complex. Multiple units dispatched.' },
      { type: 'medical', severity: 'high', location: 'Downtown Medical Center', description: 'Mass casualty incident. Additional ambulances requested.' },
      { type: 'accident', severity: 'medium', location: 'Highway 9, Exit 14', description: 'Multi-vehicle collision. Traffic diverted. Minor injuries reported.' },
      { type: 'power', severity: 'low', location: 'Residential Block C', description: 'Scheduled power maintenance. Expected restoration in 2 hours.' },
      { type: 'water-leak', severity: 'medium', location: 'Sector 3, Pipeline Junction', description: 'Water main break detected. Repair crew dispatched.' },
    ];
    defaults.forEach(a => {
      a.id = Date.now() + Math.random() * 1000;
      a.time = new Date().toLocaleTimeString();
      state.alerts.push(a);
    });
    saveAlerts();
  }

  /* ----------------------------------------
     INIT
     ---------------------------------------- */
  function init() {
    loadSettings();
    setTheme(state.theme);

    /* Apply saved settings to UI */
    if (!state.autoRefresh) {
      $('#auto-refresh-off').classList.add('active');
      $('#auto-refresh-on').classList.remove('active');
    }
    if (state.layout === 'list') {
      $('#layout-list').classList.add('active');
      $('#layout-grid').classList.remove('active');
    }
    if (!state.notifSound) {
      $('#notif-sound-off').classList.add('active');
      $('#notif-sound-on').classList.remove('active');
    }

    bindEvents();

    /* Clock */
    updateClock();
    setInterval(updateClock, 1000);

    /* Seed default alerts */
    seedAlerts();

    /* Initial data */
    updateOverview();
    updateWeather();
    initTrafficVehicles();
    animateTraffic();
    updateTrafficStats();
    updateAirQuality();
    renderAlerts();
    updateNotifUI();
    buildCharts();
    buildCityMap();
    updateEnergy();
    updateWater();
    updateWaste();
    updateLighting();
    updateSystemHealth();

    /* Start auto refresh */
    startAutoRefresh();

    /* Welcome notification */
    addNotification('Smart City Dashboard initialized successfully', 'fa-check-circle');

    /* Dashboard ready */
    showToast('Dashboard ready — all systems operational', 'success');
  }

  /* Start */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
