// API Configuration - Using relative URL to work in both local and production
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');
let userName = localStorage.getItem('username') || 'Patient';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!authToken) {
        window.location.href = '/app';
        return;
    }

// ========== PROFILE ==========
async function loadProfile() {
    try {
        const resUser = await fetch(`${API_BASE}/user/profile`, { headers: { 'X-Auth-Token': authToken } });
        if (resUser.ok) {
            const u = await resUser.json();
            const fn = document.getElementById('pf-fullname');
            const em = document.getElementById('pf-email');
            if (fn) fn.value = u.fullName || '';
            if (em) em.value = u.email || '';
        }
        const resPat = await fetch(`${API_BASE}/user/patient-profile`, { headers: { 'X-Auth-Token': authToken } });
        if (resPat.ok) {
            const p = await resPat.json();
            const ph = document.getElementById('pf-phone');
            const dob = document.getElementById('pf-dob');
            const addr = document.getElementById('pf-address');
            if (ph) ph.value = p.phone || '';
            if (dob) dob.value = p.dob || '';
            if (addr) addr.value = p.address || '';
        }
    } catch (e) { console.error('loadProfile', e); }
}

async function saveProfile() {
    const fn = document.getElementById('pf-fullname')?.value?.trim() || '';
    const em = document.getElementById('pf-email')?.value?.trim() || '';
    const phone = document.getElementById('pf-phone')?.value?.trim() || '';
    const dob = document.getElementById('pf-dob')?.value?.trim() || '';
    const address = document.getElementById('pf-address')?.value?.trim() || '';
    try {
        const [resUser, resPat] = await Promise.all([
            fetch(`${API_BASE}/user/profile`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
                body: JSON.stringify({ fullName: fn, email: em })
            }),
            fetch(`${API_BASE}/user/patient-profile`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
                body: JSON.stringify({ phone, dob, address })
            })
        ]);
        if (resUser.ok && resPat.ok) { alert('Profile saved'); await loadProfile(); }
        else { alert('Failed to save profile'); }
    } catch (e) { console.error('saveProfile', e); alert('Error saving profile'); }
}

// ========== EMERGENCY (INDIA) ==========
async function loadEmergency() {
    const box = document.getElementById('nearby-list');
    if (box) box.innerHTML = '<p class="loading">Detecting your location...</p>';
    if (!navigator.geolocation) { if (box) box.innerHTML = '<p>Geolocation not available</p>'; return; }
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;
        try {
            // Overpass: find hospitals and police within 5km
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
                return `<li><strong>${name}</strong> — ${type} · <a href="${maps}" target="_blank">Map</a></li>`;
            });
            if (box) box.innerHTML = `<ul>${items.join('')}</ul>`;
        } catch (e) {
            console.error('loadEmergency', e);
            if (box) box.innerHTML = '<p>Unable to load nearby services now.</p>';
        }
    }, err => {
        if (box) box.innerHTML = '<p>Location permission denied.</p>';
    }, { enableHighAccuracy: true, timeout: 10000 });
}
    
    document.getElementById('user-name').textContent = userName;
    loadDashboard();
});

// ========== DASHBOARD LOADING ==========

async function loadDashboard() {
    await Promise.all([
        loadStats(),
        loadMoodTrends(),
        loadUpcomingMedications(),
        loadNotifications(),
        loadAIInsights(),
        loadDoseEvents(),
        loadWellnessHistory(),
        loadProfile()
    ]);
    
    // Poll for new notifications every 10 seconds to catch ring alerts
    setInterval(() => {
        loadNotifications();
    }, 10000);
}

async function refreshDashboard() {
    await loadDashboard();
    alert('Dashboard refreshed!');
}

// ========== STATISTICS ==========

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-streak').textContent = stats.streak || 0;
            document.getElementById('stat-medications').textContent = stats.totalMedications || 0;
            document.getElementById('stat-mood').textContent = stats.mood || 'Good';
            document.getElementById('stat-energy').textContent = stats.energy || 7;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========== MOOD TRENDS ==========

async function loadMoodTrends() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/mood-trends`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const trends = await response.json();
            renderMoodChart(trends);
        }
    } catch (error) {
        console.error('Error loading mood trends:', error);
    }
}

function renderMoodChart(trends) {
    const canvas = document.getElementById('moodCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 250;
    
    const days = Object.keys(trends);
    const values = Object.values(trends);
    
    if (days.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet. Log your wellness to see trends!', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const maxValue = 10;
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / days.length;
    
    // Draw bars
    values.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barWidth + barWidth * 0.2;
        const y = canvas.height - padding - barHeight;
        const width = barWidth * 0.6;
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, barHeight);
        
        // Day label
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(days[index], x + width / 2, canvas.height - padding + 20);
        
        // Value label
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(value.toFixed(1), x + width / 2, y - 5);
    });
    
    // Y-axis
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
}

// ========== UPCOMING MEDICATIONS ==========

async function loadUpcomingMedications() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/upcoming-medications`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const medications = await response.json();
            renderUpcomingMedications(medications);
        }
    } catch (error) {
        console.error('Error loading upcoming medications:', error);
    }
}

function renderUpcomingMedications(medications) {
    const container = document.getElementById('upcoming-medications');
    
    if (medications.length === 0) {
        container.innerHTML = '<p class="empty-state">No medications scheduled</p>';
        return;
    }
    
    container.innerHTML = medications.map(med => `
        <div class="upcoming-item">
            <strong>${med.name}</strong>
            <span>⏰ ${med.time} - ${med.countdown}</span>
        </div>
    `).join('');
}

// ========== NOTIFICATIONS ==========

let allNotifications = [];

function toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        renderNotificationsDropdown();
    } else {
        dropdown.style.display = 'none';
    }
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    const unreadCount = allNotifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotificationsDropdown() {
    const dropdown = document.getElementById('notif-dropdown');
    if (!allNotifications || allNotifications.length === 0) {
        dropdown.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">No notifications</p>';
        return;
    }
    
    dropdown.innerHTML = `
        <div style="padding:12px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
            <strong>Notifications</strong>
            <button onclick="markAllNotificationsRead()" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:12px;">Mark all read</button>
        </div>
        ${allNotifications.map(n => {
            const isRing = n.type === 'RING';
            const bgColor = isRing && !n.read ? '#fef3c7' : (n.read ? '#f8fafc' : 'white');
            const borderColor = isRing && !n.read ? '3px solid #f59e0b' : 'none';
            
            return `
            <div style="padding:12px; border-bottom:1px solid #e5e7eb; background:${bgColor}; border-left:${borderColor}; position:relative;">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:${n.read ? '#94a3b8' : '#1e293b'};">${isRing ? '🔔 ' : ''}${n.title || 'Notification'}</strong>
                    <button onclick="deleteNotification('${n.id}')" style="background:none; border:none; cursor:pointer; color:#94a3b8; font-size:16px;">×</button>
                </div>
                <p style="margin:4px 0; font-size:14px; color:${n.read ? '#94a3b8' : '#64748b'};">${n.message || ''}</p>
                ${!n.read ? `<button onclick="markNotificationRead('${n.id}')" style="margin-top:4px; padding:4px 8px; background:${isRing ? '#f59e0b' : '#3b82f6'}; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Mark as Read</button>` : ''}
            </div>
            `;
        }).join('')}
    `;
}

function showRingAlert(notification) {
    // Create a prominent modal alert
    const alertDiv = document.createElement('div');
    alertDiv.id = 'ring-alert-modal';
    alertDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; align-items:center; justify-content:center;';
    
    alertDiv.innerHTML = `
        <div style="background:white; padding:32px; border-radius:16px; max-width:400px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.3); animation:ringPulse 1s infinite;">
            <div style="font-size:64px; margin-bottom:16px; animation:ringBell 0.5s infinite;">🔔</div>
            <h2 style="margin:0 0 8px; color:#1e293b; font-size:24px;">${notification.title}</h2>
            <p style="margin:0 0 24px; color:#64748b; font-size:16px;">${notification.message}</p>
            <button onclick="dismissRingAlert('${notification.id}')" style="background:#f59e0b; color:white; border:none; padding:12px 32px; border-radius:8px; cursor:pointer; font-size:16px; font-weight:600;">OK, I'm Here!</button>
        </div>
        <style>
            @keyframes ringBell {
                0%, 100% { transform: rotate(-15deg); }
                50% { transform: rotate(15deg); }
            }
            @keyframes ringPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
        </style>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Play a beep sound (if browser supports it)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Repeat beep 3 times
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 800;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.5);
        }, 600);
        
        setTimeout(() => {
            const osc3 = audioContext.createOscillator();
            const gain3 = audioContext.createGain();
            osc3.connect(gain3);
            gain3.connect(audioContext.destination);
            osc3.frequency.value = 800;
            osc3.type = 'sine';
            gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc3.start(audioContext.currentTime);
            osc3.stop(audioContext.currentTime + 0.5);
        }, 1200);
    } catch (e) {
        console.log('Audio not supported');
    }
}

async function dismissRingAlert(notificationId) {
    // Mark the notification as read
    await markNotificationRead(notificationId);
    
    // Remove the alert modal
    const alertDiv = document.getElementById('ring-alert-modal');
    if (alertDiv) {
        alertDiv.remove();
    }
}

async function markNotificationRead(id) {
    try {
        const res = await fetch(`${API_BASE}/dashboard/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            const notif = allNotifications.find(n => n.id === id);
            if (notif) notif.read = true;
            updateNotifBadge();
            renderNotificationsDropdown();
        }
    } catch (e) { console.error('markNotificationRead error', e); }
}

async function markAllNotificationsRead() {
    try {
        const res = await fetch(`${API_BASE}/dashboard/notifications/mark-all-read`, {
            method: 'POST',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            allNotifications.forEach(n => n.read = true);
            updateNotifBadge();
            renderNotificationsDropdown();
        }
    } catch (e) { console.error('markAllNotificationsRead error', e); }
}

async function deleteNotification(id) {
    try {
        const res = await fetch(`${API_BASE}/dashboard/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            allNotifications = allNotifications.filter(n => n.id !== id);
            updateNotifBadge();
            renderNotificationsDropdown();
        }
    } catch (e) { console.error('deleteNotification error', e); }
}

async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/notifications`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const newNotifications = await response.json();
            console.log('📬 Loaded notifications:', newNotifications);
            
            // Check for new RING notifications
            const newRings = newNotifications.filter(n => n.type === 'RING' && !n.read && 
                !allNotifications.some(old => old.id === n.id));
            
            console.log('🔔 New RING notifications found:', newRings.length);
            
            allNotifications = newNotifications;
            updateNotifBadge();
            
            // Show ring alert for new ring notifications
            if (newRings.length > 0) {
                console.log('🚨 Showing ring alert for:', newRings[0]);
                showRingAlert(newRings[0]);
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// ========== AI INSIGHTS ==========

async function loadAIInsights() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/ai-insights`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('ai-insights').innerHTML = `<p>${data.insight}</p>`;
            document.getElementById('ai-insights-full').innerHTML = `<p>${data.insight}</p>`;
        }
    } catch (error) {
        console.error('Error loading AI insights:', error);
        document.getElementById('ai-insights').innerHTML = '<p>Unable to load insights at this time.</p>';
        document.getElementById('ai-insights-full').innerHTML = '<p>Unable to load insights at this time.</p>';
    }
}

// ========== MEDICATIONS ==========

async function loadDoseEvents() {
    try {
        const response = await fetch(`${API_BASE}/doses`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const events = await response.json();
            renderDoseEvents(events);
        }
    } catch (error) {
        console.error('Error loading dose events:', error);
    }
}

function renderDoseEvents(events) {
    const container = document.getElementById('medications-list');
    
    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💊</div>
                <h3>No doses scheduled</h3>
                <p>Your caretaker will assign medications here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = events.map(ev => {
        const status = ev.status || 'PENDING';
        const due = ev.dueAt ? new Date(ev.dueAt) : null;
        const dueStr = due ? due.toLocaleString() : '';
        const isTaken = status === 'TAKEN';
        const isSkipped = status === 'SKIPPED';
        const isMissed = status === 'MISSED';
        const isPending = status === 'PENDING';
        
        return `
        <div class="medication-card" style="background:${isTaken ? '#f0fdf4' : isSkipped ? '#fef2f2' : isMissed ? '#fef3c7' : '#fff'}; border-left:4px solid ${isTaken ? '#10b981' : isSkipped ? '#ef4444' : isMissed ? '#f59e0b' : '#3b82f6'};">
            <div style="display:flex; align-items:center; gap:12px;">
                <input type="checkbox" ${isTaken ? 'checked' : ''} ${!isPending ? 'disabled' : ''} onchange="if(this.checked) markDoseTaken('${ev.id}'); else markDoseSkipped('${ev.id}');" style="width:20px; height:20px; cursor:${isPending ? 'pointer' : 'not-allowed'};">
                <div style="flex:1;">
                    <h4 style="margin:0; ${isTaken ? 'text-decoration:line-through; color:#64748b;' : ''}">${ev.medName || 'Medication'} ${ev.dosage ? '('+ev.dosage+')' : ''}</h4>
                    <p style="margin:4px 0; font-size:14px; color:#64748b;"><strong>Due:</strong> ${dueStr}</p>
                    <p style="margin:4px 0; font-size:14px;"><strong>Status:</strong> <span style="color:${isTaken ? '#10b981' : isSkipped ? '#ef4444' : isMissed ? '#f59e0b' : '#3b82f6'}; font-weight:600;">${status}</span></p>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function markDoseTaken(id) {
    try {
        const res = await fetch(`${API_BASE}/doses/${id}/taken`, { method: 'POST', headers: { 'X-Auth-Token': authToken } });
        if (res.ok) { await loadDoseEvents(); await loadNotifications(); }
    } catch (e) { console.error('markDoseTaken error', e); }
}

async function markDoseSkipped(id) {
    try {
        const res = await fetch(`${API_BASE}/doses/${id}/skip`, { method: 'POST', headers: { 'X-Auth-Token': authToken } });
        if (res.ok) { await loadDoseEvents(); await loadNotifications(); }
    } catch (e) { console.error('markDoseSkipped error', e); }
}

async function addMedication() {
    const name = prompt('Medication Name:');
    if (!name) return;
    
    const dosage = prompt('Dosage (e.g., 10mg):');
    if (!dosage) return;
    
    const schedule = prompt('Schedule (e.g., 08:00, 20:00):');
    if (!schedule) return;
    
    try {
        const response = await fetch(`${API_BASE}/medications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ name, dosage, schedule, active: true })
        });
        
        if (response.ok) {
            alert('Medication added successfully!');
            loadMedications();
            loadStats();
            loadUpcomingMedications();
        } else {
            alert('Failed to add medication');
        }
    } catch (error) {
        console.error('Error adding medication:', error);
        alert('Error adding medication');
    }
}

async function editMedication(id) {
    // For simplicity, we'll just allow editing the schedule
    const schedule = prompt('New Schedule (e.g., 08:00, 20:00):');
    if (!schedule) return;
    
    try {
        const response = await fetch(`${API_BASE}/medications/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ schedule })
        });
        
        if (response.ok) {
            alert('Medication updated successfully!');
            loadMedications();
        } else {
            alert('Failed to update medication');
        }
    } catch (error) {
        console.error('Error updating medication:', error);
        alert('Error updating medication');
    }
}

async function deleteMedication(id) {
    if (!confirm('Are you sure you want to delete this medication?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/medications/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            alert('Medication deleted successfully!');
            loadMedications();
            loadStats();
            loadUpcomingMedications();
        } else {
            alert('Failed to delete medication');
        }
    } catch (error) {
        console.error('Error deleting medication:', error);
        alert('Error deleting medication');
    }
}

// ========== WELLNESS ==========

async function loadWellnessHistory() {
    try {
        const response = await fetch(`${API_BASE}/wellness`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const logs = await response.json();
            renderWellnessHistory(logs);
        }
    } catch (error) {
        console.error('Error loading wellness history:', error);
    }
}

function renderWellnessHistory(logs) {
    const container = document.getElementById('wellness-history');
    
    if (logs.length === 0) {
        container.innerHTML = '<p class="empty-state">No wellness logs yet</p>';
        return;
    }
    
    container.innerHTML = logs.slice(0, 10).map(log => `
        <div class="wellness-entry">
            <div class="wellness-entry-header">
                <div class="wellness-entry-mood">${getMoodEmoji(log.mood)} ${log.mood}</div>
                <div class="wellness-entry-date">${log.date}</div>
            </div>
            <div class="wellness-entry-details">
                <span>⚡ Energy: ${log.energy}/10</span>
                ${log.notes ? `<span>📝 ${log.notes}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function getMoodEmoji(mood) {
    const emojis = {
        'Excellent': '😄',
        'Good': '😊',
        'Okay': '😐',
        'Low': '😔',
        'Tired': '😴'
    };
    return emojis[mood] || '😊';
}

async function submitWellness(event) {
    event.preventDefault();
    
    const mood = document.getElementById('mood-select').value;
    const energy = parseInt(document.getElementById('energy-slider').value);
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
            alert('Wellness log submitted successfully!');
            document.getElementById('wellness-form').reset();
            document.getElementById('energy-value').textContent = '5';
            loadWellnessHistory();
            loadStats();
            loadMoodTrends();
        } else {
            alert('Failed to submit wellness log');
        }
    } catch (error) {
        console.error('Error submitting wellness log:', error);
        alert('Error submitting wellness log');
    }
}

function updateEnergyValue(value) {
    document.getElementById('energy-value').textContent = value;
}

// ========== NAVIGATION ==========

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Add active class to clicked nav item
    event.target.closest('.nav-item').classList.add('active');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/app';
    }
}
