const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');
let allUsers = [];
let allCaretakers = [];
let allMedications = [];
let allAppointments = [];
let appointmentsChartRef = null;
let caretakersChartRef = null;
let usersChartRef = null;
let adherenceBarChartRef = null;
let lastReport = null;

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
}

function roleBadgeClass(role) {
    if (!role) return 'elderly';
    const r = String(role).toLowerCase();
    if (r === 'caregiver') return 'caregiver';
    if (r === 'admin') return 'admin';
    return 'elderly';
}

function findUserById(id) {
    return allUsers.find((u) => u.id === id) || allCaretakers.find((c) => c.id === id);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!authToken) {
        window.location.href = '/app';
        return;
    }
    const isAdmin = await ensureAdmin();
    if (!isAdmin) return;
    await loadAdminProfile();
    bindSearch();
    bindUserFilters();
    bindChartFilters();
    bindSettingsPrefs();
    await Promise.all([
        loadDashboardStats(),
        loadUsersFromBackend(),
        loadCaretakers(),
        loadMedications(),
        loadAppointments(),
        loadActivityFeed()
    ]);
    renderDashboardCharts();

    // Close notifications dropdown on outside clicks.
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('admin-notif-dropdown');
        if (!dropdown) return;
        const btn = document.querySelector('.notification-btn');
        if (!btn) return;
        if (dropdown.style.display !== 'block') return;
        const clickedInside = dropdown.contains(e.target) || btn.contains(e.target);
        if (!clickedInside) dropdown.style.display = 'none';
    });
});

async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': authToken,
            ...(options.headers || {})
        }
    });

    if (response.status === 401 || response.status === 403) {
        alert('Your session has expired or access is denied. Please login again.');
        localStorage.removeItem('authToken');
        window.location.href = '/app';
        throw new Error('Unauthorized');
    }

    return response;
}

async function ensureAdmin() {
    try {
        const res = await api('/auth/me', { headers: {} });
        if (!res.ok) return false;
        const me = await res.json();
        if (!me.role || String(me.role).toLowerCase() !== 'admin') {
            alert('Admin access is required.');
            window.location.href = '/app';
            return false;
        }
        return true;
    } catch (err) {
        console.error('Admin validation failed:', err);
        return false;
    }
}

async function loadAdminProfile() {
    try {
        const res = await api('/auth/me');
        if (!res.ok) return;
        const me = await res.json();
        const name = me.fullName || me.username || 'Admin';
        const el = document.getElementById('admin-display-name');
        const lab = document.getElementById('admin-profile-label');
        if (el) el.textContent = name;
        if (lab) lab.textContent = name.split(' ')[0] || 'Admin';
    } catch (e) {
        console.warn('Profile load skipped', e);
    }
}

function switchSection(sectionName) {
    document.querySelectorAll('.section').forEach((section) => section.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    document.getElementById(`${sectionName}-section`).classList.add('active');

    const navButton = Array.from(document.querySelectorAll('.sidebar-nav .nav-item'))
        .find((btn) => btn.getAttribute('onclick') === `switchSection('${sectionName}')`);
    if (navButton) navButton.classList.add('active');

    if (sectionName === 'dashboard') {
        // Charts can look wrong after hidden -> visible transitions; re-render.
        renderDashboardCharts();
    }
    if (sectionName === 'reports') {
        loadReports();
    }
}

async function loadDashboardStats() {
    try {
        const response = await api('/admin/stats');
        if (!response.ok) return;
        const stats = await response.json();

        const elderly = stats.elderlyUsers ?? 0;
        const cg = stats.caretakers ?? 0;
        const ap = stats.appointments ?? 0;
        const med = stats.medications ?? 0;
        const total = stats.totalUsers ?? 0;
        const active = stats.activeUsers ?? 0;

        const set = (id, val) => {
            const n = document.getElementById(id);
            if (n) n.textContent = val;
        };
        set('stat-elderly', elderly);
        set('stat-caretakers', cg);
        set('stat-appointments', ap);
        set('stat-medications', med);

        set('stat-elderly-sub', `${total} total accounts`);
        set('stat-caretakers-sub', `${active} active users overall`);
        set('stat-appointments-sub', 'All appointment records');
        set('stat-medications-sub', 'Active + inactive med entries');
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadActivityFeed() {
    const feed = document.getElementById('activity-feed');
    const badge = document.getElementById('admin-notif-badge');
    try {
        const response = await api('/admin/activity');
        const activities = response.ok ? await response.json() : [];
        if (badge) badge.textContent = String(activities.length);
        feed.innerHTML = activities.map((activity) => `
            <div class="activity-item">
                <strong>${escapeHtml(activity.action)}${activity.user ? `: ${escapeHtml(activity.user)}` : ''}</strong>
                <p class="activity-time">${escapeHtml(activity.time || 'Recently')}</p>
            </div>
        `).join('') || '<p>No recent activity.</p>';
    } catch (error) {
        console.error('Error loading activity feed:', error);
        feed.innerHTML = '<p>Unable to load activity.</p>';
        if (badge) badge.textContent = '0';
    }
}

function appointmentInRange(apt, rangeVal) {
    if (rangeVal === 'all') return true;
    if (!apt.date) return false;
    const d = new Date(`${apt.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const days = Number(rangeVal);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return d >= cutoff && d <= now;
}

function renderDashboardCharts() {
    renderAppointmentsChart();
    renderCaretakersChart();
}

function renderAppointmentsChart() {
    const canvas = document.getElementById('appointments-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (appointmentsChartRef) appointmentsChartRef.destroy();

    const sel = document.getElementById('appointments-range-select');
    const rangeVal = sel ? sel.value : '7';

    const filtered = allAppointments.filter((a) => appointmentInRange(a, rangeVal));
    const byDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    filtered.forEach((apt) => {
        if (!apt.date) return;
        const day = new Date(`${apt.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
        if (Object.prototype.hasOwnProperty.call(byDay, day)) byDay[day] += 1;
    });

    appointmentsChartRef = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(byDay),
            datasets: [{
                label: 'Appointments',
                data: Object.values(byDay),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                title: { display: true, text: `${filtered.length} in selected range` }
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderCaretakersChart() {
    const canvas = document.getElementById('caretakers-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (caretakersChartRef) caretakersChartRef.destroy();

    const labels = allCaretakers.map((c) => c.fullName || c.username || 'Caregiver');
    const data = allCaretakers.map((c) => Number(c.patientCount) || 0);
    const colors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#f43f5e'];

    caretakersChartRef = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No caregivers yet'],
            datasets: [{
                data: data.length && data.some((n) => n > 0) ? data : [1],
                backgroundColor: labels.length ? colors.slice(0, labels.length) : ['#cbd5e1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Patients per caregiver' }
            }
        }
    });
}

async function loadUsersFromBackend() {
    try {
        const response = await api('/admin/users');
        if (!response.ok) return;
        allUsers = await response.json();
        applyUserFilters();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map((user) => `
        <tr>
            <td>#${escapeHtml((user.id || '').substring(0, 8))}</td>
            <td><strong>${escapeHtml(user.fullName || user.username || 'Unknown')}</strong></td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td><span class="role-badge ${roleBadgeClass(user.role)}">${escapeHtml(user.role || 'N/A')}</span></td>
            <td><span class="status-badge ${(user.status || 'Active').toLowerCase()}">${escapeHtml(user.status || 'Active')}</span></td>
            <td>${escapeHtml(user.joinedDate || 'N/A')}</td>
            <td class="table-actions">
                <button type="button" class="btn-icon" onclick="editUser('${user.id}')" title="Edit">✏️</button>
                <button type="button" class="btn-icon" onclick="deleteUserConfirm('${user.id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7">No users match filters.</td></tr>';
}

function applyUserFilters() {
    const q = (document.getElementById('users-search-input')?.value || '').toLowerCase().trim();
    const roleF = document.getElementById('users-filter-role')?.value || '';
    const statusF = document.getElementById('users-filter-status')?.value || '';

    let list = [...allUsers];
    if (roleF) {
        const r = roleF.toLowerCase();
        list = list.filter((u) => String(u.role || '').toLowerCase() === r);
    }
    if (statusF) list = list.filter((u) => (u.status || 'Active') === statusF);
    if (q) {
        list = list.filter(
            (u) =>
                (u.username || '').toLowerCase().includes(q) ||
                (u.fullName || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
        );
    }
    renderUsers(list);
}

function bindUserFilters() {
    const search = document.getElementById('users-search-input');
    const role = document.getElementById('users-filter-role');
    const status = document.getElementById('users-filter-status');
    if (search) search.addEventListener('input', applyUserFilters);
    if (role) role.addEventListener('change', applyUserFilters);
    if (status) status.addEventListener('change', applyUserFilters);
}

function bindChartFilters() {
    const sel = document.getElementById('appointments-range-select');
    if (sel) sel.addEventListener('change', () => renderAppointmentsChart());
}

function bindSettingsPrefs() {
    const keys = [
        ['pref-email-notif', 'admin_pref_email'],
        ['pref-sms-alerts', 'admin_pref_sms'],
        ['pref-maintenance', 'admin_pref_maint'],
        ['pref-dark-mode', 'admin_pref_dark_mode']
    ];
    keys.forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const saved = localStorage.getItem(key);
        if (saved !== null) el.checked = saved === '1';
        el.addEventListener('change', () => {
            localStorage.setItem(key, el.checked ? '1' : '0');
            if (id === 'pref-dark-mode') document.body.classList.toggle('dark', el.checked);
        });
    });

    // Apply initial dark mode preference.
    const darkPref = localStorage.getItem('admin_pref_dark_mode') === '1';
    if (darkPref) document.body.classList.add('dark');
}

async function loadCaretakers() {
    const grid = document.getElementById('caretakers-grid');
    try {
        const response = await api('/admin/caretakers/summary');
        allCaretakers = response.ok ? await response.json() : [];
        grid.innerHTML = allCaretakers.map((caretaker) => `
            <div class="caretaker-card">
                <h4>${escapeHtml(caretaker.fullName || caretaker.username || 'Unknown')}</h4>
                <p>${escapeHtml(caretaker.email || 'No email')}</p>
                <div style="display:flex; justify-content:space-around; margin-top:16px;">
                    <div>
                        <strong style="font-size:24px; color:var(--primary);">${caretaker.patientCount ?? 0}</strong>
                        <p style="font-size:12px; color:var(--text-secondary); margin:0;">Patients</p>
                    </div>
                    <div>
                        <strong style="font-size:18px; color:var(--text-secondary);">${escapeHtml(caretaker.status || 'Active')}</strong>
                        <p style="font-size:12px; color:var(--text-secondary); margin:0;">Status</p>
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:16px;">
                    <button type="button" class="btn-icon" onclick="viewCaretaker('${caretaker.id}')" style="flex:1;">👁️ View</button>
                    <button type="button" class="btn-icon" onclick="editUser('${caretaker.id}')" style="flex:1;">✏️ Edit</button>
                    <button type="button" class="btn-icon" onclick="deleteUserConfirm('${caretaker.id}')" style="flex:1;">🗑️ Delete</button>
                </div>
            </div>
        `).join('') || '<p>No caretakers found.</p>';
    } catch (error) {
        console.error('Error loading caretakers:', error);
        grid.innerHTML = '<p>Unable to load caretakers.</p>';
    }
}

async function loadMedications() {
    const tbody = document.getElementById('medications-tbody');
    try {
        const response = await api('/admin/medications');
        allMedications = response.ok ? await response.json() : [];
        tbody.innerHTML = allMedications.map((med) => `
            <tr>
                <td><strong>${escapeHtml(med.medication)}</strong></td>
                <td>${escapeHtml(med.patient)}</td>
                <td>${escapeHtml(med.dosage || '')}</td>
                <td>${escapeHtml(med.schedule || '')}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                            <div style="width:${med.adherence}%; height:100%; background:${med.adherence >= 90 ? '#10b981' : med.adherence >= 75 ? '#f59e0b' : '#ef4444'};"></div>
                        </div>
                        <span style="font-weight:700; font-size:13px;">${med.adherence}%</span>
                    </div>
                </td>
                <td class="table-actions">
                    <button type="button" class="btn-icon" onclick="editMedication('${med.id}')" title="Edit">✏️</button>
                    <button type="button" class="btn-icon" onclick="deleteMedicationConfirm('${med.id}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6">No medications found.</td></tr>';
    } catch (error) {
        console.error('Error loading medications:', error);
        tbody.innerHTML = '<tr><td colspan="6">Unable to load medications.</td></tr>';
    }
}

async function loadAppointments() {
    const container = document.getElementById('appointments-calendar');
    try {
        const response = await api('/admin/appointments');
        allAppointments = response.ok ? await response.json() : [];
        allAppointments.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        container.innerHTML = allAppointments.map((apt) => `
            <div class="list-item">
                <strong>${escapeHtml(apt.patientName || 'Unknown Patient')}</strong>
                — ${escapeHtml(apt.date || '')} ${escapeHtml(apt.time || '')}<br>
                <small>${escapeHtml(apt.type || 'General')} | ${escapeHtml(apt.status || 'Scheduled')}</small>
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button type="button" class="btn-icon" onclick="editAppointment('${apt.id}')" style="flex:1;">✏️ Edit</button>
                    <button type="button" class="btn-icon" onclick="deleteAppointmentConfirm('${apt.id}')" style="flex:1;">🗑️ Delete</button>
                </div>
            </div>
        `).join('') || '<p>No appointments yet.</p>';
    } catch (error) {
        console.error('Error loading appointments:', error);
        container.innerHTML = '<p>Unable to load appointments.</p>';
    }
}

async function loadReports() {
    try {
        const response = await api('/admin/reports');
        if (!response.ok) return;
        lastReport = await response.json();

        const usersCtx = document.getElementById('users-chart').getContext('2d');
        if (usersChartRef) usersChartRef.destroy();
        usersChartRef = new Chart(usersCtx, {
            type: 'bar',
            data: {
                labels: ['Total users', 'Active users', 'Medications (total)', 'Appointments (total)'],
                datasets: [{
                    label: 'Counts',
                    data: [
                        lastReport.users.total,
                        lastReport.users.active,
                        lastReport.medications.total,
                        lastReport.appointments.total
                    ],
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        const adherenceCtx = document.getElementById('adherence-chart').getContext('2d');
        if (adherenceBarChartRef) adherenceBarChartRef.destroy();
        adherenceBarChartRef = new Chart(adherenceCtx, {
            type: 'bar',
            data: {
                labels: ['Taken doses', 'Pending', 'Missed', 'Adherence %'],
                datasets: [{
                    label: 'Medication logs',
                    data: [
                        lastReport.adherence.taken,
                        lastReport.adherence.pending,
                        lastReport.adherence.missed,
                        lastReport.adherence.rate
                    ],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Generated ${lastReport.generatedAt || ''}`
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

async function addUser() {
    const username = prompt('Username:');
    if (!username) return;
    const fullName = prompt('Full Name:') || '';
    const email = prompt('Email:');
    if (!email) return;
    const password = prompt('Temporary Password (min 6 chars):');
    if (!password) return;
    const role = prompt('Role (Elderly User / Caregiver / Admin):', 'Elderly User') || 'Elderly User';

    try {
        const response = await api('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, fullName, email, password, role })
        });
        const data = await response.json();
        if (response.ok) {
            alert('User created successfully');
            await refreshAdminData();
        } else {
            alert(data.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
    }
}

async function editUser(id) {
    const user = findUserById(id);
    if (!user) {
        alert('User not found in loaded data. Open Users tab and try again.');
        return;
    }
    const fullName = prompt('Full Name:', user.fullName || user.username || '');
    if (fullName === null) return;
    const email = prompt('Email:', user.email || '');
    if (email === null) return;
    const status = prompt('Status (Active/Inactive):', user.status || 'Active');
    if (status === null) return;
    const role = prompt('Role (Elderly User / Caregiver / Admin):', user.role || 'Elderly User');
    if (role === null) return;

    try {
        const response = await api(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ fullName, email, status, role })
        });
        if (response.ok) {
            alert('User updated');
            await refreshAdminData();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
    }
}

async function deleteUserConfirm(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const meRes = await api('/auth/me');
        if (meRes.ok) {
            const me = await meRes.json();
            if (me.id === id) {
                alert('You cannot delete your own account while signed in.');
                return;
            }
        }
    } catch (e) {
        /* ignore */
    }
    try {
        const response = await api(`/admin/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert('User deleted successfully');
            await refreshAdminData();
        } else {
            alert('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

function addCaretaker() {
    addUserWithRole('Caregiver');
}

async function addUserWithRole(role) {
    const username = prompt(`${role} username:`);
    if (!username) return;
    const fullName = prompt(`${role} full name:`) || '';
    const email = prompt(`${role} email:`);
    if (!email) return;
    const password = prompt('Temporary Password (min 6 chars):');
    if (!password) return;
    try {
        const response = await api('/admin/users', {
            method: 'POST',
            body: JSON.stringify({ username, fullName, email, password, role })
        });
        if (response.ok) {
            alert(`${role} added`);
            await refreshAdminData();
        } else {
            const data = await response.json();
            alert(data.error || `Failed to add ${role}`);
        }
    } catch (err) {
        console.error(`Error adding ${role}:`, err);
    }
}

function viewCaretaker(id) {
    const caretaker = allCaretakers.find((c) => c.id === id);
    if (!caretaker) return;
    alert(
        `Name: ${caretaker.fullName || caretaker.username}\nEmail: ${caretaker.email || 'N/A'}\nStatus: ${caretaker.status || 'Active'}\nPatients: ${caretaker.patientCount ?? 0}`
    );
}

function addMedication() {
    window.open('/caretaker', '_blank');
}

async function editMedication(id) {
    const med = allMedications.find((m) => m.id === id);
    if (!med) {
        alert('Medication not found in loaded data.');
        return;
    }

    const name = prompt('Medication name:', med.medication);
    if (name === null) return;
    const dosage = prompt('Dosage:', med.dosage || '');
    if (dosage === null) return;
    const schedule = prompt('Schedule:', med.schedule || '');
    if (schedule === null) return;
    const active = confirm('Set medication as active? (OK = active, Cancel = inactive)');

    try {
        const response = await api(`/admin/medications/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name,
                dosage,
                schedule,
                active
            })
        });

        if (response.ok) {
            await loadMedications();
            await loadDashboardStats();
            if (document.getElementById('reports-section')?.classList.contains('active')) {
                await loadReports();
            }
        } else {
            const err = await response.json().catch(() => ({}));
            alert(err.error || 'Failed to update medication');
        }
    } catch (e) {
        console.error(e);
        alert('Error updating medication');
    }
}

async function deleteMedicationConfirm(id) {
    if (!confirm('Delete this medication record from the database?')) return;
    try {
        const response = await api(`/admin/medications/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadMedications();
            await loadDashboardStats();
            if (lastReport) await loadReports();
        } else {
            alert('Could not delete medication');
        }
    } catch (e) {
        console.error(e);
    }
}

async function scheduleAppointment() {
    if (!allCaretakers.length) {
        alert('No caregivers in the system yet. Add a caregiver first.');
        return;
    }
    const lines = allCaretakers.map((c, i) => `${i + 1}. ${c.fullName || c.username} (${c.email || 'no email'})`).join('\n');
    const pick = prompt(`Pick caregiver by number:\n${lines}`);
    if (!pick) return;
    const idx = parseInt(pick, 10) - 1;
    if (idx < 0 || idx >= allCaretakers.length) {
        alert('Invalid selection');
        return;
    }
    const cg = allCaretakers[idx];
    const patientName = prompt('Patient name for appointment:');
    if (!patientName) return;
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!date) return;
    const time = prompt('Time (e.g. 10:30 or 10:30 AM):', '09:00') || '';
    const type = prompt('Type (Checkup / Follow-up / Emergency):', 'Checkup') || 'Checkup';

    try {
        const response = await api('/admin/appointments', {
            method: 'POST',
            body: JSON.stringify({
                caretakerId: cg.id,
                patientName,
                date,
                time,
                type,
                status: 'Scheduled'
            })
        });
        if (response.ok) {
            alert('Appointment created');
            await refreshAdminData();
            switchSection('appointments');
        } else {
            const err = await response.json().catch(() => ({}));
            alert(err.error || 'Failed to create appointment');
        }
    } catch (e) {
        console.error(e);
    }
}

async function editAppointment(id) {
    const apt = allAppointments.find((a) => a.id === id);
    if (!apt) {
        alert('Appointment not found in loaded data.');
        return;
    }

    const patientName = prompt('Patient name:', apt.patientName || '');
    if (patientName === null) return;
    const date = prompt('Date (YYYY-MM-DD):', apt.date || '');
    if (date === null) return;
    const time = prompt('Time:', apt.time || '');
    if (time === null) return;
    const type = prompt('Type (Checkup / Follow-up / Emergency):', apt.type || 'Checkup');
    if (type === null) return;
    const status = prompt('Status (Scheduled / Completed / Cancelled):', apt.status || 'Scheduled');
    if (status === null) return;
    const notes = prompt('Notes (optional):', apt.notes || '');
    if (notes === null) return;

    try {
        const response = await api(`/admin/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                patientName,
                date,
                time,
                type,
                status,
                notes
            })
        });

        if (response.ok) {
            await loadAppointments();
            await loadDashboardStats();
            if (document.getElementById('reports-section')?.classList.contains('active')) {
                await loadReports();
            }
            renderDashboardCharts();
        } else {
            const err = await response.json().catch(() => ({}));
            alert(err.error || 'Failed to update appointment');
        }
    } catch (e) {
        console.error(e);
        alert('Error updating appointment');
    }
}

async function deleteAppointmentConfirm(id) {
    if (!confirm('Delete this appointment?')) return;
    try {
        const response = await api(`/admin/appointments/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadAppointments();
            await loadDashboardStats();
            if (document.getElementById('reports-section')?.classList.contains('active')) {
                await loadReports();
            }
            renderDashboardCharts();
        } else {
            alert('Failed to delete appointment');
        }
    } catch (e) {
        console.error(e);
        alert('Error deleting appointment');
    }
}

async function generateReport() {
    await loadReports();
    switchSection('reports');
}

function toggleNotifications() {
    switchSection('dashboard');
    const dropdown = document.getElementById('admin-notif-dropdown');
    if (!dropdown) return;

    const activityFeed = document.getElementById('activity-feed');
    if (activityFeed && dropdown.innerHTML.trim() === '') {
        dropdown.innerHTML = activityFeed.innerHTML;
    }

    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';

    // When opening, reset badge to 0 (no backend "read" endpoint for admin activity yet).
    const badge = document.getElementById('admin-notif-badge');
    if (badge && dropdown.style.display === 'block') badge.textContent = '0';
}

async function toggleProfileMenu() {
    try {
        const res = await api('/auth/me');
        if (!res.ok) return;
        const me = await res.json();
        alert(
            `Signed in as: ${me.fullName || me.username}\nEmail: ${me.email || '—'}\nRole: ${me.role}\nStatus: ${me.status || '—'}`
        );
    } catch (e) {
        alert('Could not load profile');
    }
}

async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
        await api('/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout call failed:', err);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    window.location.href = '/';
}

function bindSearch() {
    const input = document.getElementById('admin-search');
    const usersInput = document.getElementById('users-search-input');
    if (!input) return;
    input.addEventListener('input', (e) => {
        if (usersInput) usersInput.value = e.target.value;
        applyUserFilters();
    });
}

async function refreshAdminData() {
    await Promise.all([
        loadDashboardStats(),
        loadUsersFromBackend(),
        loadCaretakers(),
        loadMedications(),
        loadAppointments(),
        loadActivityFeed()
    ]);
    renderDashboardCharts();
    if (document.getElementById('reports-section')?.classList.contains('active')) {
        await loadReports();
    }
}
