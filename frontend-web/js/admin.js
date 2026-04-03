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

let adminModalConfirmFn = null;

function closeAdminModal() {
    const overlay = document.getElementById('admin-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    adminModalConfirmFn = null;
}

function openAdminModal({ title, bodyHtml, confirmText = 'Confirm', showCancel = true, confirmFn = null }) {
    const overlay = document.getElementById('admin-modal-overlay');
    const titleEl = document.getElementById('admin-modal-title');
    const bodyEl = document.getElementById('admin-modal-body');
    const cancelBtn = document.getElementById('admin-modal-cancel');
    const confirmBtn = document.getElementById('admin-modal-confirm');

    if (!overlay || !titleEl || !bodyEl || !confirmBtn) return;

    titleEl.textContent = title || 'Modal';
    bodyEl.innerHTML = bodyHtml || '';
    confirmBtn.textContent = confirmText;

    if (cancelBtn) cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';

    adminModalConfirmFn = typeof confirmFn === 'function' ? confirmFn : null;
    confirmBtn.onclick = async () => {
        if (adminModalConfirmFn) {
            try {
                await adminModalConfirmFn();
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Close on overlay click (not inside modal content).
    if (!overlay.__wiredClose) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAdminModal();
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAdminModal();
        });
        overlay.__wiredClose = true;
    }

    overlay.style.display = 'flex';
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
        openAdminModal({
            title: 'Session expired',
            bodyHtml: '<p>Your session has expired or access is denied. Please login again.</p>',
            confirmText: 'Go to login',
            showCancel: false,
            confirmFn: () => {
                closeAdminModal();
                localStorage.removeItem('authToken');
                localStorage.removeItem('userRole');
                window.location.href = '/app';
            }
        });
        // Do not throw here: callers already check `response.ok` and we want to avoid
        // console/runtime exceptions surfacing during admin actions.
        return response;
    }

    return response;
}

async function ensureAdmin() {
    try {
        const res = await api('/auth/me', { headers: {} });
        if (!res.ok) return false;
        const me = await res.json();
        if (!me.role || String(me.role).toLowerCase() !== 'admin') {
            openAdminModal({
                title: 'Admin access required',
                bodyHtml: '<p>This page is for Admin users only.</p>',
                confirmText: 'Go back',
                showCancel: false,
                confirmFn: () => {
                    closeAdminModal();
                    window.location.href = '/app';
                }
            });
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
        // Avoid re-creating heavy charts on every navigation click.
        // Only render if they haven't been created yet.
        if (!appointmentsChartRef || !caretakersChartRef) {
            renderDashboardCharts();
        }
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
                <div style="margin-top:8px;">
                    <span class="status-badge ${(activity.status || 'Active').toLowerCase()}">${escapeHtml(activity.status || 'Active')}</span>
                </div>
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
    const bodyHtml = `
        <label>Username
            <input id="modal-new-username" />
        </label>
        <label>Full name
            <input id="modal-new-fullName" />
        </label>
        <label>Email
            <input id="modal-new-email" />
        </label>
        <label>Temporary password
            <input id="modal-new-password" type="password" />
        </label>
        <label>Role
            <select id="modal-new-role">
                ${['Elderly User', 'Caregiver', 'Admin'].map((r) => `
                    <option value="${r}" ${r === 'Elderly User' ? 'selected' : ''}>${r}</option>
                `).join('')}
            </select>
        </label>
    `;

    openAdminModal({
        title: 'Add new user',
        bodyHtml,
        confirmText: 'Create user',
        showCancel: true,
        confirmFn: async () => {
            const username = document.getElementById('modal-new-username')?.value?.trim();
            const fullName = document.getElementById('modal-new-fullName')?.value?.trim() || '';
            const email = document.getElementById('modal-new-email')?.value?.trim();
            const password = document.getElementById('modal-new-password')?.value;
            const role = document.getElementById('modal-new-role')?.value || 'Elderly User';

            if (!username || !email || !password) {
                openAdminModal({
                    title: 'Missing fields',
                    bodyHtml: '<p>Please enter Username, Email and Password.</p>',
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            const response = await api('/admin/users', {
                method: 'POST',
                body: JSON.stringify({ username, fullName, email, password, role })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                openAdminModal({
                    title: 'Create failed',
                    bodyHtml: `<p>${escapeHtml(data.error || 'Failed to create user.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            closeAdminModal();
            await refreshAdminData();
        }
    });
}

async function editUser(id) {
    const user = findUserById(id);
    if (!user) {
        openAdminModal({
            title: 'Edit user',
            bodyHtml: `<p>${escapeHtml('User not found. Try reloading the Users section.')}</p>`,
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
        return;
    }

    const roleVal = user.role || 'Elderly User';
    const statusVal = user.status || 'Active';
    const fullNameVal = user.fullName || '';
    const emailVal = user.email || '';

    const bodyHtml = `
        <label>Full name
            <input id="modal-fullName" value="${escapeHtml(fullNameVal)}" />
        </label>
        <label>Email
            <input id="modal-email" value="${escapeHtml(emailVal)}" />
        </label>
        <label>Role
            <select id="modal-role">
                ${['Elderly User', 'Caregiver', 'Admin'].map((r) => `
                    <option value="${r}" ${String(roleVal).toLowerCase() === r.toLowerCase() ? 'selected' : ''}>${r}</option>
                `).join('')}
            </select>
        </label>
        <label>Status
            <select id="modal-status">
                ${['Active', 'Inactive'].map((s) => `
                    <option value="${s}" ${String(statusVal).toLowerCase() === s.toLowerCase() ? 'selected' : ''}>${s}</option>
                `).join('')}
            </select>
        </label>
    `;

    openAdminModal({
        title: `Edit user ${escapeHtml(id || '')}`,
        bodyHtml,
        confirmText: 'Save changes',
        showCancel: true,
        confirmFn: async () => {
            const fullName = document.getElementById('modal-fullName')?.value?.trim() || '';
            const email = document.getElementById('modal-email')?.value?.trim() || '';
            const role = document.getElementById('modal-role')?.value || roleVal;
            const status = document.getElementById('modal-status')?.value || statusVal;

            const response = await api(`/admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ fullName, email, status, role })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Update failed',
                    bodyHtml: `<p>${escapeHtml(data.error || 'Failed to update user.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            closeAdminModal();
            await refreshAdminData();
        }
    });
}

async function deleteUserConfirm(id) {
    // Prevent deleting own account.
    let me = null;
    try {
        const meRes = await api('/auth/me');
        if (meRes.ok) me = await meRes.json();
    } catch (e) {
        // ignore; allow delete attempt anyway
    }
    if (me && me.id === id) {
        openAdminModal({
            title: 'Not allowed',
            bodyHtml: `<p>You cannot delete the account you are currently signed into.</p>`,
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
        return;
    }

    openAdminModal({
        title: 'Delete user',
        bodyHtml: `<p>Are you sure you want to delete this user?</p><p style="color:var(--text-secondary);margin-top:8px;">This cannot be undone.</p>`,
        confirmText: 'Delete',
        showCancel: true,
        confirmFn: async () => {
            const response = await api(`/admin/users/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Delete failed',
                    bodyHtml: `<p>${escapeHtml(data.error || 'Failed to delete user.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }
            closeAdminModal();
            await refreshAdminData();
        }
    });
}

function addCaretaker() {
    addUserWithRole('Caregiver');
}

async function addUserWithRole(role) {
    const fixedRole = role || 'Elderly User';
    const bodyHtml = `
        <label>Username
            <input id="modal-new-username" />
        </label>
        <label>Full name
            <input id="modal-new-fullName" />
        </label>
        <label>Email
            <input id="modal-new-email" />
        </label>
        <label>Temporary password
            <input id="modal-new-password" type="password" />
        </label>
        <label>Role
            <select id="modal-new-role" disabled>
                <option value="${fixedRole}" selected>${fixedRole}</option>
            </select>
        </label>
    `;

    openAdminModal({
        title: `Add ${fixedRole}`,
        bodyHtml,
        confirmText: 'Create user',
        showCancel: true,
        confirmFn: async () => {
            const username = document.getElementById('modal-new-username')?.value?.trim();
            const fullName = document.getElementById('modal-new-fullName')?.value?.trim() || '';
            const email = document.getElementById('modal-new-email')?.value?.trim();
            const password = document.getElementById('modal-new-password')?.value;
            const response = await api('/admin/users', {
                method: 'POST',
                body: JSON.stringify({ username, fullName, email, password, role: fixedRole })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                openAdminModal({
                    title: 'Create failed',
                    bodyHtml: `<p>${escapeHtml(data.error || `Failed to add ${fixedRole}.`)}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }
            closeAdminModal();
            await refreshAdminData();
        }
    });
}

function viewCaretaker(id) {
    const caretaker = allCaretakers.find((c) => c.id === id);
    if (!caretaker) return;
    openAdminModal({
        title: 'Caretaker details',
        bodyHtml: `
            <p><strong>Name:</strong> ${escapeHtml(caretaker.fullName || caretaker.username || 'Unknown')}</p>
            <p><strong>Email:</strong> ${escapeHtml(caretaker.email || 'N/A')}</p>
            <p><strong>Status:</strong> ${escapeHtml(caretaker.status || 'Active')}</p>
            <p><strong>Patients:</strong> ${escapeHtml(String(caretaker.patientCount ?? 0))}</p>
        `,
        confirmText: 'Close',
        showCancel: false,
        confirmFn: closeAdminModal
    });
}

function addMedication() {
    const bodyHtml = `
        <label>Patient email
            <input id="modal-med-add-email" placeholder="patient@example.com" />
        </label>
        <label>Medication name
            <input id="modal-med-add-name" placeholder="e.g., Metformin" />
        </label>
        <label>Dosage
            <input id="modal-med-add-dosage" placeholder="e.g., 500mg" />
        </label>
        <label>Schedule (HH:mm, comma-separated)
            <input id="modal-med-add-schedule" placeholder="e.g., 08:00,20:00" />
        </label>
        <p style="color:var(--text-secondary); font-size:12px; margin-top:10px;">
            This creates the medication as Active (default). Set active/inactive in the table after creation.
        </p>
    `;

    openAdminModal({
        title: 'Add new medication',
        bodyHtml,
        confirmText: 'Create medication',
        showCancel: true,
        confirmFn: async () => {
            const patientEmail = document.getElementById('modal-med-add-email')?.value?.trim();
            const name = document.getElementById('modal-med-add-name')?.value?.trim();
            const dosage = document.getElementById('modal-med-add-dosage')?.value?.trim();
            const schedule = document.getElementById('modal-med-add-schedule')?.value?.trim();

            if (!patientEmail || !name || !dosage || !schedule) {
                openAdminModal({
                    title: 'Missing fields',
                    bodyHtml: '<p>Please fill Patient email, Medication name, Dosage, and Schedule.</p>',
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            const response = await api('/caretaker/medications/assign', {
                method: 'POST',
                body: JSON.stringify({ patientEmail, name, dosage, schedule })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Create failed',
                    bodyHtml: `<p>${escapeHtml(data.error || 'Failed to create medication.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            closeAdminModal();
            await loadMedications();
            await loadDashboardStats();
        }
    });
}

async function editMedication(id) {
    const med = allMedications.find((m) => m.id === id);
    if (!med) {
        openAdminModal({
            title: 'Edit medication',
            bodyHtml: '<p>Medication not found in loaded data.</p>',
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
        return;
    }

    const bodyHtml = `
        <label>Medication name
            <input id="modal-med-name" value="${escapeHtml(med.medication || '')}" />
        </label>
        <label>Dosage
            <input id="modal-med-dosage" value="${escapeHtml(med.dosage || '')}" />
        </label>
        <label>Schedule
            <input id="modal-med-schedule" value="${escapeHtml(med.schedule || '')}" />
        </label>
        <label style="display:flex; align-items:center; gap:10px;">
            <input id="modal-med-active" type="checkbox" ${med.active === false ? '' : 'checked'} />
            Set as active
        </label>
    `;

    openAdminModal({
        title: `Edit medication ${escapeHtml(id || '')}`,
        bodyHtml,
        confirmText: 'Save medication',
        showCancel: true,
        confirmFn: async () => {
            const name = document.getElementById('modal-med-name')?.value?.trim() || '';
            const dosage = document.getElementById('modal-med-dosage')?.value?.trim() || '';
            const schedule = document.getElementById('modal-med-schedule')?.value?.trim() || '';
            const active = document.getElementById('modal-med-active')?.checked ?? true;

            const response = await api(`/admin/medications/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, dosage, schedule, active })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Update failed',
                    bodyHtml: `<p>${escapeHtml(err.error || 'Failed to update medication.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            closeAdminModal();
            await loadMedications();
            await loadDashboardStats();
            if (document.getElementById('reports-section')?.classList.contains('active')) {
                await loadReports();
            }
        }
    });
}

async function deleteMedicationConfirm(id) {
    openAdminModal({
        title: 'Delete medication',
        bodyHtml: '<p>Delete this medication record from the database?</p><p style="color:var(--text-secondary);margin-top:8px;">This action cannot be undone.</p>',
        confirmText: 'Delete',
        showCancel: true,
        confirmFn: async () => {
            const response = await api(`/admin/medications/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Delete failed',
                    bodyHtml: `<p>${escapeHtml(err.error || 'Could not delete medication.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }
            closeAdminModal();
            await loadMedications();
            await loadDashboardStats();
            if (lastReport) await loadReports();
        }
    });
}

async function scheduleAppointment() {
    if (!allCaretakers.length) {
        openAdminModal({
            title: 'Schedule appointment',
            bodyHtml: '<p>No caregivers in the system yet. Add a caregiver first.</p>',
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
        return;
    }

    const caretakerOptions = allCaretakers.map((c) => `
        <option value="${c.id}">${escapeHtml(c.fullName || c.username || 'Caregiver')}</option>
    `).join('');

    const today = new Date().toISOString().slice(0, 10);
    const bodyHtml = `
        <label>Caretaker
            <select id="modal-appt-caretaker">
                ${caretakerOptions}
            </select>
        </label>
        <label>Patient name
            <input id="modal-appt-patientName" />
        </label>
        <label>Date
            <input id="modal-appt-date" value="${today}" />
        </label>
        <label>Time
            <input id="modal-appt-time" value="09:00" />
        </label>
        <label>Type
            <select id="modal-appt-type">
                ${['Checkup', 'Follow-up', 'Emergency'].map((t) => `
                    <option value="${t}" ${t === 'Checkup' ? 'selected' : ''}>${t}</option>
                `).join('')}
            </select>
        </label>
        <label>Status
            <select id="modal-appt-status">
                ${['Scheduled', 'Completed', 'Cancelled'].map((s) => `
                    <option value="${s}" ${s === 'Scheduled' ? 'selected' : ''}>${s}</option>
                `).join('')}
            </select>
        </label>
        <label>Notes (optional)
            <textarea id="modal-appt-notes"></textarea>
        </label>
    `;

    openAdminModal({
        title: 'Schedule appointment',
        bodyHtml,
        confirmText: 'Create appointment',
        showCancel: true,
        confirmFn: async () => {
            const caretakerId = document.getElementById('modal-appt-caretaker')?.value;
            const patientName = document.getElementById('modal-appt-patientName')?.value?.trim();
            const date = document.getElementById('modal-appt-date')?.value?.trim();
            const time = document.getElementById('modal-appt-time')?.value?.trim() || '';
            const type = document.getElementById('modal-appt-type')?.value || 'Checkup';
            const status = document.getElementById('modal-appt-status')?.value || 'Scheduled';
            const notes = document.getElementById('modal-appt-notes')?.value?.trim();

            if (!caretakerId || !patientName || !date) {
                openAdminModal({
                    title: 'Missing fields',
                    bodyHtml: '<p>Please fill caretaker, patient name and date.</p>',
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            const response = await api('/admin/appointments', {
                method: 'POST',
                body: JSON.stringify({
                    caretakerId,
                    patientName,
                    date,
                    time,
                    type,
                    status,
                    notes
                })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Create failed',
                    bodyHtml: `<p>${escapeHtml(err.error || 'Failed to create appointment.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            closeAdminModal();
            await refreshAdminData();
            switchSection('appointments');
        }
    });
}

async function editAppointment(id) {
    const apt = allAppointments.find((a) => a.id === id);
    if (!apt) {
        openAdminModal({
            title: 'Edit appointment',
            bodyHtml: '<p>Appointment not found in loaded data.</p>',
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
        return;
    }

    const bodyHtml = `
        <label>Patient name
            <input id="modal-appt-edit-patientName" value="${escapeHtml(apt.patientName || '')}" />
        </label>
        <label>Date
            <input id="modal-appt-edit-date" value="${escapeHtml(apt.date || '')}" />
        </label>
        <label>Time
            <input id="modal-appt-edit-time" value="${escapeHtml(apt.time || '')}" />
        </label>
        <label>Type
            <select id="modal-appt-edit-type">
                ${['Checkup', 'Follow-up', 'Emergency'].map((t) => `
                    <option value="${t}" ${String(apt.type || 'Checkup').toLowerCase() === t.toLowerCase() ? 'selected' : ''}>${t}</option>
                `).join('')}
            </select>
        </label>
        <label>Status
            <select id="modal-appt-edit-status">
                ${['Scheduled', 'Completed', 'Cancelled'].map((s) => `
                    <option value="${s}" ${String(apt.status || 'Scheduled').toLowerCase() === s.toLowerCase() ? 'selected' : ''}>${s}</option>
                `).join('')}
            </select>
        </label>
        <label>Notes (optional)
            <textarea id="modal-appt-edit-notes">${escapeHtml(apt.notes || '')}</textarea>
        </label>
    `;

    openAdminModal({
        title: 'Edit appointment',
        bodyHtml,
        confirmText: 'Save appointment',
        showCancel: true,
        confirmFn: async () => {
            const patientName = document.getElementById('modal-appt-edit-patientName')?.value?.trim() || '';
            const date = document.getElementById('modal-appt-edit-date')?.value?.trim() || '';
            const time = document.getElementById('modal-appt-edit-time')?.value?.trim() || '';
            const type = document.getElementById('modal-appt-edit-type')?.value || 'Checkup';
            const status = document.getElementById('modal-appt-edit-status')?.value || 'Scheduled';
            const notes = document.getElementById('modal-appt-edit-notes')?.value?.trim() || '';

            const response = await api(`/admin/appointments/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ patientName, date, time, type, status, notes })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Update failed',
                    bodyHtml: `<p>${escapeHtml(err.error || 'Failed to update appointment.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }

            closeAdminModal();
            await refreshAdminData();
            switchSection('appointments');
        }
    });
}

async function deleteAppointmentConfirm(id) {
    openAdminModal({
        title: 'Delete appointment',
        bodyHtml: '<p>Delete this appointment?</p><p style="color:var(--text-secondary);margin-top:8px;">This cannot be undone.</p>',
        confirmText: 'Delete',
        showCancel: true,
        confirmFn: async () => {
            const response = await api(`/admin/appointments/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                openAdminModal({
                    title: 'Delete failed',
                    bodyHtml: `<p>${escapeHtml(err.error || 'Failed to delete appointment.')}</p>`,
                    confirmText: 'Close',
                    showCancel: false,
                    confirmFn: closeAdminModal
                });
                return;
            }
            closeAdminModal();
            await refreshAdminData();
            switchSection('appointments');
        }
    });
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
        openAdminModal({
            title: 'Admin profile',
            bodyHtml: `
                <p><strong>Name:</strong> ${escapeHtml(me.fullName || me.username || '')}</p>
                <p><strong>Email:</strong> ${escapeHtml(me.email || '—')}</p>
                <p><strong>Role:</strong> ${escapeHtml(me.role || '')}</p>
                <p><strong>Status:</strong> ${escapeHtml(me.status || '')}</p>
            `,
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
    } catch (e) {
        openAdminModal({
            title: 'Admin profile',
            bodyHtml: '<p>Could not load profile.</p>',
            confirmText: 'Close',
            showCancel: false,
            confirmFn: closeAdminModal
        });
    }
}

async function logout() {
    openAdminModal({
        title: 'Logout',
        bodyHtml: '<p>Are you sure you want to logout?</p>',
        confirmText: 'Logout',
        showCancel: true,
        confirmFn: async () => {
            try {
                await api('/auth/logout', { method: 'POST' });
            } catch (err) {
                console.error('Logout call failed:', err);
            }
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            closeAdminModal();
            window.location.href = '/';
        }
    });
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
    // Only re-render charts when the dashboard section is visible.
    if (document.getElementById('dashboard-section')?.classList.contains('active')) {
        renderDashboardCharts();
    }
    if (document.getElementById('reports-section')?.classList.contains('active')) {
        await loadReports();
    }
}
