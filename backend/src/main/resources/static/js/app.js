// API Configuration - Using relative URL to work in both local and production
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogin = urlParams.get('login') !== null;
    
    // If forcing login from landing page, clear any existing session
    if (forceLogin && authToken) {
        authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
    }
    
    // Only auto-redirect if token exists AND we're not forcing login
    if (authToken && !forceLogin) {
        const userRole = localStorage.getItem('userRole');
        
        // Redirect based on role
        if (userRole === 'Caregiver') {
            window.location.href = '/caretaker';
            return;
        } else {
            showDashboard();
        }
    }
    
    // Setup form handlers with null checks
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const medicationForm = document.getElementById('medication-form');
    const wellnessForm = document.getElementById('wellness-form');
    
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (medicationForm) medicationForm.addEventListener('submit', handleAddMedication);
    if (wellnessForm) wellnessForm.addEventListener('submit', handleAddWellness);
});

// Auth Functions
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const status = document.getElementById('login-status');
    
    // Client-side validation
    if (!username) {
        status.textContent = '✗ Username is required';
        status.className = 'status-message error';
        return;
    }
    
    if (!password) {
        status.textContent = '✗ Password is required';
        status.className = 'status-message error';
        return;
    }
    
    status.textContent = 'Logging in...';
    status.className = 'status-message';
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('username', data.username);
            
            status.textContent = '✓ Login successful! Redirecting...';
            status.className = 'status-message success';
            
            // Role-based redirection
            setTimeout(() => {
                if (data.role === 'Caregiver') {
                    window.location.href = '/caretaker';
                } else {
                    // Redirect elderly users to the proper dashboard page
                    window.location.href = '/dashboard';
                }
            }, 800);
        } else {
            status.textContent = '✗ ' + (data.error || 'Invalid username or password');
            status.className = 'status-message error';
        }
    } catch (error) {
        status.textContent = '✗ Error connecting to server. Please try again.';
        status.className = 'status-message error';
        console.error('Login error:', error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('register-fullname').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const role = document.getElementById('register-role').value;
    const status = document.getElementById('register-status');
    
    // Client-side validation
    if (!fullName) {
        status.textContent = '✗ Full name is required';
        status.className = 'status-message error';
        return;
    }
    
    if (!email) {
        status.textContent = '✗ Email is required';
        status.className = 'status-message error';
        return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        status.textContent = '✗ Please enter a valid email address';
        status.className = 'status-message error';
        return;
    }
    
    if (!username) {
        status.textContent = '✗ Username is required';
        status.className = 'status-message error';
        return;
    }
    
    if (username.length < 3) {
        status.textContent = '✗ Username must be at least 3 characters';
        status.className = 'status-message error';
        return;
    }
    
    if (!password) {
        status.textContent = '✗ Password is required';
        status.className = 'status-message error';
        return;
    }
    
    if (password.length < 6) {
        status.textContent = '✗ Password must be at least 6 characters';
        status.className = 'status-message error';
        return;
    }
    
    if (password !== confirmPassword) {
        status.textContent = '✗ Passwords do not match';
        status.className = 'status-message error';
        return;
    }
    
    if (!role) {
        status.textContent = '✗ Please select a role';
        status.className = 'status-message error';
        return;
    }
    
    status.textContent = 'Creating account...';
    status.className = 'status-message';
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, username, password, confirmPassword, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            status.textContent = '✓ Account created successfully! Redirecting to login...';
            status.className = 'status-message success';
            e.target.reset();
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            status.textContent = '✗ ' + (data.error || 'Registration failed');
            status.className = 'status-message error';
        }
    } catch (error) {
        status.textContent = '✗ Error: ' + error.message;
        status.className = 'status-message error';
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    document.getElementById('dashboard-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
}

// Dashboard Functions
function showDashboard() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
    loadDashboardData();
}

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Load data for specific views
    if (viewName === 'dashboard') loadDashboardData();
    if (viewName === 'medications') loadDoseEvents();
    if (viewName === 'wellness') loadWellness();
    if (viewName === 'analytics') loadAnalytics();
    if (viewName === 'insights') loadAIInsights();
    if (viewName === 'emergency') loadEmergencyServices();
    if (viewName === 'settings') loadProfileSettings();
}

async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const stats = await statsResponse.json();
        
        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h4>🎯 Streak</h4>
                <div class="value">${stats.streak || 0}</div>
            </div>
            <div class="stat-card">
                <h4>💊 Medications</h4>
                <div class="value">${stats.medicationCount || 0}</div>
            </div>
            <div class="stat-card">
                <h4>😊 Mood</h4>
                <div class="value">${stats.mood || 'N/A'}</div>
            </div>
            <div class="stat-card">
                <h4>⚡ Energy</h4>
                <div class="value">${stats.energy || 0}/10</div>
            </div>
        `;
        
        // Load mood chart
        loadMoodChart();
        
        // Load upcoming medications
        loadUpcomingMeds();
        
        // Load dose events
        loadDoseEvents();
        
        // Load notifications
        loadNotifications();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

let _moodChartInstance = null;
async function loadMoodChart() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/mood-trends`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const trends = await response.json();
        
        const ctx = document.getElementById('mood-chart').getContext('2d');
        if (_moodChartInstance) { _moodChartInstance.destroy(); }
        _moodChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(trends),
                datasets: [{
                    label: 'Mood Score',
                    data: Object.values(trends),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, max: 10 }
                }
            }
        });
    } catch (error) {
        console.error('Error loading mood chart:', error);
    }
}

async function loadUpcomingMeds() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/upcoming-medications`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const meds = await response.json();
        
        const container = document.getElementById('upcoming-meds');
        if (meds.length === 0) {
            container.innerHTML = '<p>No upcoming medications</p>';
        } else {
            container.innerHTML = meds.map(med => `
                <div class="list-item">
                    <div>
                        <strong>${med.name}</strong><br>
                        <small>${med.time} • ${med.countdown}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading medications:', error);
    }
}

let allNotificationsApp = [];

function toggleNotificationsApp() {
    const dropdown = document.getElementById('notif-dropdown-app');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        renderNotificationsDropdownApp();
    } else {
        dropdown.style.display = 'none';
    }
}

function updateNotifBadgeApp() {
    const badge = document.getElementById('notif-badge-app');
    const unreadCount = allNotificationsApp.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotificationsDropdownApp() {
    const dropdown = document.getElementById('notif-dropdown-app');
    if (!allNotificationsApp || allNotificationsApp.length === 0) {
        dropdown.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">No notifications</p>';
        return;
    }
    
    dropdown.innerHTML = `
        <div style="padding:8px 12px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
            <strong style="font-size:14px;">Notifications</strong>
            <button onclick="markAllNotificationsReadApp()" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:12px; font-weight:600;">Mark all read</button>
        </div>
        ${allNotificationsApp.map(n => `
            <div style="padding:10px 12px; border-bottom:1px solid #f1f5f9; background:${n.read ? '#fafafa' : 'white'}; transition:background 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:4px;">
                    <strong style="color:${n.read ? '#94a3b8' : '#1e293b'}; font-size:13px; flex:1;">${n.icon || '🔔'} ${n.title || 'Notification'}</strong>
                    <button onclick="deleteNotificationApp('${n.id}')" style="background:none; border:none; cursor:pointer; color:#cbd5e1; font-size:20px; line-height:1; padding:0; margin-left:8px;" title="Delete">×</button>
                </div>
                <p style="margin:0 0 8px 0; font-size:13px; color:${n.read ? '#94a3b8' : '#64748b'}; line-height:1.4;">${n.message || ''}</p>
                ${!n.read ? `<button onclick="markNotificationReadApp('${n.id}')" style="padding:4px 12px; background:#3b82f6; color:white; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:500;">Mark as Read</button>` : `<small style="color:#94a3b8; font-size:11px;">Read</small>`}
            </div>
        `).join('')}
    `;
}

async function markNotificationReadApp(id) {
    try {
        const res = await fetch(`${API_BASE}/dashboard/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            const notif = allNotificationsApp.find(n => n.id === id);
            if (notif) notif.read = true;
            updateNotifBadgeApp();
            renderNotificationsDropdownApp();
        }
    } catch (e) { console.error('markNotificationReadApp error', e); }
}

async function markAllNotificationsReadApp() {
    try {
        const res = await fetch(`${API_BASE}/dashboard/notifications/mark-all-read`, {
            method: 'POST',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            allNotificationsApp.forEach(n => n.read = true);
            updateNotifBadgeApp();
            renderNotificationsDropdownApp();
        }
    } catch (e) { console.error('markAllNotificationsReadApp error', e); }
}

async function deleteNotificationApp(id) {
    try {
        const res = await fetch(`${API_BASE}/dashboard/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            allNotificationsApp = allNotificationsApp.filter(n => n.id !== id);
            updateNotifBadgeApp();
            renderNotificationsDropdownApp();
        }
    } catch (e) { console.error('deleteNotificationApp error', e); }
}

async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/notifications`, {
            headers: { 'X-Auth-Token': authToken }
        });
        allNotificationsApp = await response.json();
        updateNotifBadgeApp();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Medications (dose events)
async function loadDoseEvents() {
    console.log('[loadDoseEvents] Starting to load medications...');
    console.log('[loadDoseEvents] Auth token:', authToken ? 'Present' : 'Missing');
    console.log('[loadDoseEvents] User ID from localStorage:', localStorage.getItem('username'));
    
    try {
        const response = await fetch(`${API_BASE}/doses`, { headers: { 'X-Auth-Token': authToken } });
        console.log('[loadDoseEvents] Response status:', response.status);
        
        if (!response.ok) {
            console.error('[loadDoseEvents] Failed to fetch doses:', response.status, response.statusText);
            return;
        }
        const events = await response.json();
        console.log('[loadDoseEvents] Received events:', events);
        console.log('[loadDoseEvents] Number of doses:', events ? events.length : 0);
        
        const container = document.getElementById('medications-list');
        if (!container) {
            console.error('[loadDoseEvents] medications-list container not found in DOM');
            return;
        }
        if (!events || events.length === 0) {
            console.warn('[loadDoseEvents] No dose events found for this user');
            container.innerHTML = '<p style="padding:20px; text-align:center; color:#64748b;">No doses scheduled. Your caretaker will assign them.</p>';
            return;
        }
        console.log('[loadDoseEvents] Rendering', events.length, 'dose events');
        container.innerHTML = events.map(ev => {
            const status = ev.status || 'PENDING';
            const dueStr = ev.dueAt ? new Date(ev.dueAt).toLocaleString() : '';
            const isTaken = status === 'TAKEN';
            const isSkipped = status === 'SKIPPED';
            const isMissed = status === 'MISSED';
            const isPending = status === 'PENDING';
            
            return `
                <div class="list-item" style="background:${isTaken ? '#f0fdf4' : isSkipped ? '#fef2f2' : isMissed ? '#fef3c7' : '#fff'}; border-left:4px solid ${isTaken ? '#10b981' : isSkipped ? '#ef4444' : isMissed ? '#f59e0b' : '#3b82f6'}; padding:12px; margin-bottom:8px; border-radius:8px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <input type="checkbox" ${isTaken ? 'checked' : ''} ${!isPending ? 'disabled' : ''} onchange="if(this.checked) markDoseTaken('${ev.id}'); else markDoseSkipped('${ev.id}');" style="width:20px; height:20px; cursor:${isPending ? 'pointer' : 'not-allowed'};">
                        <div style="flex:1;">
                            <strong style="${isTaken ? 'text-decoration:line-through; color:#64748b;' : ''}">${ev.medName || 'Medication'}</strong> ${ev.dosage ? '('+ev.dosage+')' : ''}<br>
                            <small style="color:#64748b;">${dueStr}</small><br>
                            <small style="color:${isTaken ? '#10b981' : isSkipped ? '#ef4444' : isMissed ? '#f59e0b' : '#3b82f6'}; font-weight:600;">${status}</small>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('Error loading dose events:', error);
    }
}

async function markDoseTaken(id) {
    try {
        const res = await fetch(`${API_BASE}/doses/${id}/taken`, { method: 'POST', headers: { 'X-Auth-Token': authToken } });
        if (res.ok) loadDoseEvents();
    } catch {}
}

async function markDoseSkipped(id) {
    try {
        const res = await fetch(`${API_BASE}/doses/${id}/skip`, { method: 'POST', headers: { 'X-Auth-Token': authToken } });
        if (res.ok) loadDoseEvents();
    } catch {}
}

// Wellness
async function handleAddWellness(e) {
    e.preventDefault();
    const mood = document.getElementById('wellness-mood').value;
    const energy = parseInt(document.getElementById('wellness-energy').value);
    const notes = document.getElementById('wellness-notes').value;
    
    try {
        const response = await fetch(`${API_BASE}/wellness`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ mood, energy, notes })
        });
        
        if (response.ok) {
            alert('✓ Wellness logged!');
            e.target.reset();
            document.getElementById('energy-value').textContent = '5';
            loadWellness();
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadWellness() {
    try {
        const response = await fetch(`${API_BASE}/wellness`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const logs = await response.json();
        
        const container = document.getElementById('wellness-list');
        if (logs.length === 0) {
            container.innerHTML = '<p>No wellness logs yet. Start logging above!</p>';
        } else {
            container.innerHTML = logs.map(log => `
                <div class="list-item">
                    <div>
                        <strong>${log.date}</strong>: ${log.mood} | Energy ${log.energy}/10<br>
                        <small>${log.notes || ''}</small>
                    </div>
                    <button class="btn-delete" onclick="deleteWellness(${log.id})">Delete</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading wellness:', error);
    }
}

async function deleteWellness(id) {
    if (!confirm('Delete this wellness log?')) return;
    
    try {
        await fetch(`${API_BASE}/wellness/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        loadWellness();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/wellness`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const logs = await response.json();
        
        const container = document.getElementById('analytics-summary');
        if (logs.length === 0) {
            container.innerHTML = '<h3>📊 Weekly Summary</h3><p>Start logging wellness to see analytics!</p>';
        } else {
            const avgEnergy = logs.reduce((sum, log) => sum + log.energy, 0) / logs.length;
            
            // Group by mood
            const moodCounts = {};
            logs.forEach(log => {
                moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
            });
            
            container.innerHTML = `
                <h3>📊 Weekly Summary</h3>
                <p>You've logged wellness ${logs.length} times.</p>
                <p>Average energy level: ${avgEnergy.toFixed(1)}/10</p>
                <div style="margin-top: 20px;">
                    <canvas id="analytics-mood-chart"></canvas>
                </div>
                <div style="margin-top: 20px;">
                    <canvas id="analytics-energy-chart"></canvas>
                </div>
            `;
            
            // Create mood distribution chart
            const moodCtx = document.getElementById('analytics-mood-chart').getContext('2d');
            new Chart(moodCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(moodCounts),
                    datasets: [{
                        data: Object.values(moodCounts),
                        backgroundColor: [
                            '#3b82f6', '#10b981', '#f59e0b', 
                            '#ef4444', '#8b5cf6', '#ec4899'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Mood Distribution'
                        }
                    }
                }
            });
            
            // Create energy trend chart
            const energyCtx = document.getElementById('analytics-energy-chart').getContext('2d');
            new Chart(energyCtx, {
                type: 'line',
                data: {
                    labels: logs.map((log, i) => `Day ${i + 1}`),
                    datasets: [{
                        label: 'Energy Level',
                        data: logs.map(log => log.energy),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Energy Trend'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 10
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// AI Insights
async function loadAIInsights() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/ai-insights`, {
            headers: { 'X-Auth-Token': authToken }
        });
        const data = await response.json();
        
        const container = document.getElementById('ai-insights-container');
        container.innerHTML = `
            <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <h3>🧠 AI Analysis</h3>
                <p>${data.insight}</p>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
                <h3>💡 Hydration Reminder</h3>
                <p>💧 Drink 8 glasses of water daily. Staying hydrated improves energy levels and mood!</p>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white;">
                <h3>😴 Sleep Schedule</h3>
                <p>⏰ Aim for 7-8 hours of sleep. Consistent sleep schedules boost energy and mental clarity!</p>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white;">
                <h3>🏋️ Exercise Tip</h3>
                <p>🚶 30 minutes of daily exercise can significantly improve your mood and overall wellness!</p>
            </div>
        `;
    } catch (error) {
        console.error('Error loading AI insights:', error);
    }
}

// Emergency Services
function loadEmergencyServices() {
    const container = document.getElementById('emergency-services-list');
    container.innerHTML = '<p>Detecting your location...</p>';
    if (!navigator.geolocation) { container.innerHTML = '<p>Geolocation not available</p>'; return; }
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;
        try {
            const query = `data=[out:json];(node["amenity"~"hospital|clinic|police"](around:5000,${latitude},${longitude});way["amenity"~"hospital|clinic|police"](around:5000,${latitude},${longitude}););out center 20;`;
            const url = `https://overpass-api.de/api/interpreter?${query}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Overpass error');
            const data = await res.json();
            const items = (data.elements || []).slice(0, 20).map(el => {
                const name = (el.tags && (el.tags.name || el.tags['name:en'])) || 'Unknown';
                const type = (el.tags && el.tags.amenity) || 'place';
                const lat = el.lat || (el.center && el.center.lat);
                const lon = el.lon || (el.center && el.center.lon);
                const maps = (lat && lon) ? `https://www.google.com/maps?q=${lat},${lon}` : '#';
                return `<div class="service-item"><h4>${name}</h4><p>${type}</p><a href="${maps}" target="_blank">Map</a></div>`;
            });
            container.innerHTML = items.join('') || '<p>No nearby services found.</p>';
        } catch (e) { container.innerHTML = '<p>Unable to load nearby services.</p>'; }
    }, () => container.innerHTML = '<p>Location permission denied.</p>', { enableHighAccuracy: true, timeout: 10000 });
}

// Settings: Profile
async function loadProfileSettings() {
    try {
        // Basic user profile
        const resUser = await fetch(`${API_BASE}/user/profile`, { headers: { 'X-Auth-Token': authToken } });
        if (resUser.ok) {
            const u = await resUser.json();
            const fn = document.getElementById('set-fullname');
            const em = document.getElementById('set-email');
            if (fn) fn.value = u.fullName || '';
            if (em) em.value = u.email || '';
        }
        // Patient profile extras
        const resPat = await fetch(`${API_BASE}/user/patient-profile`, { headers: { 'X-Auth-Token': authToken } });
        if (resPat.ok) {
            const p = await resPat.json();
            const ph = document.getElementById('set-phone');
            const dob = document.getElementById('set-dob');
            const addr = document.getElementById('set-address');
            if (ph) ph.value = p.phone || '';
            if (dob) dob.value = p.dob || '';
            if (addr) addr.value = p.address || '';
        }
    } catch {}
}

async function saveProfileSettings() {
    const fn = document.getElementById('set-fullname')?.value?.trim() || '';
    const em = document.getElementById('set-email')?.value?.trim() || '';
    const phone = document.getElementById('set-phone')?.value?.trim() || '';
    const dob = document.getElementById('set-dob')?.value?.trim() || '';
    const address = document.getElementById('set-address')?.value?.trim() || '';
    try {
        const [resUser, resPat] = await Promise.all([
            fetch(`${API_BASE}/user/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken }, body: JSON.stringify({ fullName: fn, email: em }) }),
            fetch(`${API_BASE}/user/patient-profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken }, body: JSON.stringify({ phone, dob, address }) })
        ]);
        if (resUser.ok && resPat.ok) { alert('Profile saved'); loadProfileSettings(); }
        else { alert('Failed to save profile'); }
    } catch { alert('Error saving profile'); }
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Load theme preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}
