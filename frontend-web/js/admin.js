const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');
let allUsers = [];
let allCaretakers = [];
let allMedications = [];
let allAppointments = [];
let appointmentsChartRef = null;
let caretakersChartRef = null;
let usersChartRef = null;
let adherenceChartRef = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!authToken) {
        window.location.href = '/app';
        return;
    }
    const isAdmin = await ensureAdmin();
    if (!isAdmin) return;
    bindSearch();
    await Promise.all([
        loadDashboardStats(),
        loadUsersFromBackend(),
        loadCaretakers(),
        loadMedications(),
        loadAppointments(),
        loadActivityFeed()
    ]);
    renderDashboardCharts();
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
        if (!me.role || me.role.toLowerCase() !== 'admin') {
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

function switchSection(sectionName) {
    document.querySelectorAll('.section').forEach((section) => section.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    document.getElementById(`${sectionName}-section`).classList.add('active');

    const navButton = Array.from(document.querySelectorAll('.sidebar-nav .nav-item'))
        .find((btn) => btn.getAttribute('onclick') === `switchSection('${sectionName}')`);
    if (navButton) navButton.classList.add('active');

    if (sectionName === 'reports') {
        loadReports();
    }
}

async function loadDashboardStats() {
    try {
        const response = await api('/admin/stats');
        if (!response.ok) return;
        const stats = await response.json();
        document.querySelector('.stat-card.patients h3').textContent = stats.elderlyUsers || 0;
        document.querySelector('.stat-card.caretakers h3').textContent = stats.caretakers || 0;
        document.querySelector('.stat-card.appointments h3').textContent = stats.appointments || 0;
        document.querySelector('.stat-card.medications h3').textContent = stats.medications || 0;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadActivityFeed() {
    const feed = document.getElementById('activity-feed');
    try {
        const response = await api('/admin/activity');
        const activities = response.ok ? await response.json() : [];
        feed.innerHTML = activities.map((activity) => `
            <div class="activity-item">
                <strong>${activity.action}${activity.user ? `: ${activity.user}` : ''}</strong>
                <p class="activity-time">${activity.time || 'Recently'}</p>
            </div>
        `).join('') || '<p>No recent activity.</p>';
    } catch (error) {
        console.error('Error loading activity feed:', error);
        feed.innerHTML = '<p>Unable to load activity.</p>';
    }
}

function renderDashboardCharts() {
    renderAppointmentsChart();
    renderCaretakersChart();
}

function renderAppointmentsChart() {
    const ctx = document.getElementById('appointments-chart').getContext('2d');
    if (appointmentsChartRef) appointmentsChartRef.destroy();

    const byDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    allAppointments.forEach((apt) => {
        if (!apt.date) return;
        const day = new Date(`${apt.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderCaretakersChart() {
    const ctx = document.getElementById('caretakers-chart').getContext('2d');
    if (caretakersChartRef) caretakersChartRef.destroy();

    const labels = allCaretakers.map((c) => c.fullName || c.username || 'Caretaker');
    const data = allCaretakers.map(() => 1);
    caretakersChartRef = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['No caretakers'],
            datasets: [{ data: data.length ? data : [1], backgroundColor: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

async function loadUsersFromBackend() {
    try {
        const response = await api('/admin/users');
        if (!response.ok) return;
        allUsers = await response.json();
        renderUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map((user) => `
        <tr>
            <td>#${(user.id || '').substring(0, 8)}</td>
            <td><strong>${user.fullName || user.username || 'Unknown'}</strong></td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="role-badge ${user.role === 'Caregiver' ? 'caregiver' : 'elderly'}">${user.role || 'N/A'}</span></td>
            <td><span class="status-badge ${(user.status || 'Active').toLowerCase()}">${user.status || 'Active'}</span></td>
            <td>${user.joinedDate || 'N/A'}</td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteUserConfirm('${user.id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function loadCaretakers() {
    const grid = document.getElementById('caretakers-grid');
    try {
        const response = await api('/admin/caretakers');
        allCaretakers = response.ok ? await response.json() : [];
        grid.innerHTML = allCaretakers.map((caretaker) => `
            <div class="caretaker-card">
                <h4>${caretaker.fullName || caretaker.username || 'Unknown'}</h4>
                <p>${caretaker.email || 'No email'}</p>
                <div style="display:flex; justify-content:space-around; margin-top:16px;">
                    <div>
                        <strong style="font-size:24px; color:var(--primary);">${caretaker.status || 'Active'}</strong>
                        <p style="font-size:12px; color:var(--text-secondary); margin:0;">Status</p>
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:16px;">
                    <button class="btn-icon" onclick="viewCaretaker('${caretaker.id}')" style="flex:1;">👁️ View</button>
                    <button class="btn-icon" onclick="editUser('${caretaker.id}')" style="flex:1;">✏️ Edit</button>
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
                <td><strong>${med.medication}</strong></td>
                <td>${med.patient}</td>
                <td>${med.dosage || ''}</td>
                <td>${med.schedule || ''}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                            <div style="width:${med.adherence}%; height:100%; background:${med.adherence >= 90 ? '#10b981' : med.adherence >= 75 ? '#f59e0b' : '#ef4444'};"></div>
                        </div>
                        <span style="font-weight:700; font-size:13px;">${med.adherence}%</span>
                    </div>
                </td>
                <td class="table-actions">
                    <button class="btn-icon" onclick="editMedication('${med.id}')" title="Edit">✏️</button>
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
        container.innerHTML = allAppointments.map((apt) => `
            <div class="list-item">
                <strong>${apt.patientName || 'Unknown Patient'}</strong> - ${apt.date || ''} ${apt.time || ''}<br>
                <small>${apt.type || 'General'} | ${apt.status || 'Scheduled'}</small>
            </div>
        `).join('') || '<p>No appointments available.</p>';
    } catch (error) {
        console.error('Error loading appointments:', error);
        container.innerHTML = '<p>Unable to load appointments.</p>';
    }
}

async function loadReports() {
    try {
        const response = await api('/admin/reports');
        if (!response.ok) return;
        const report = await response.json();

        const usersCtx = document.getElementById('users-chart').getContext('2d');
        if (usersChartRef) usersChartRef.destroy();
        usersChartRef = new Chart(usersCtx, {
            type: 'bar',
            data: {
                labels: ['Total Users', 'Active Users', 'Caretakers', 'Patients'],
                datasets: [{ label: 'Users', data: [report.users.total, report.users.active, allCaretakers.length, Number(document.querySelector('.stat-card.patients h3').textContent) || 0], backgroundColor: '#3b82f6' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        const adherenceCtx = document.getElementById('adherence-chart').getContext('2d');
        if (adherenceChartRef) adherenceChartRef.destroy();
        adherenceChartRef = new Chart(adherenceCtx, {
            type: 'line',
            data: {
                labels: ['Taken', 'Pending', 'Missed', 'Adherence %'],
                datasets: [{ label: 'Medication Metrics', data: [report.adherence.taken, report.adherence.pending, report.adherence.missed, report.adherence.rate], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
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
    const role = prompt('Role (Elderly User/Caregiver/Admin):', 'Elderly User') || 'Elderly User';

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
    const user = allUsers.find((u) => u.id === id);
    if (!user) return;
    const fullName = prompt('Full Name:', user.fullName || user.username || '');
    if (fullName === null) return;
    const email = prompt('Email:', user.email || '');
    if (email === null) return;
    const status = prompt('Status (Active/Inactive):', user.status || 'Active');
    if (status === null) return;
    const role = prompt('Role (Elderly User/Caregiver/Admin):', user.role || 'Elderly User');
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
    alert(`Name: ${caretaker.fullName || caretaker.username}\nEmail: ${caretaker.email || 'N/A'}\nStatus: ${caretaker.status || 'Active'}`);
}

function editCaretaker(id) {
    editUser(id);
}

function addMedication() {
    alert('Use caretaker portal to assign medications to patients.');
}

function editMedication(id) {
    alert(`Medication ID: ${id}\nMedication edits are managed in patient/caretaker flows.`);
}

function deleteMedication() {
    alert('Medication removal is restricted to caretaker/patient workflow.');
}

function scheduleAppointment() {
    alert('Appointment scheduling is handled by caretaker portal.');
}

async function generateReport() {
    await loadReports();
    alert('Report refreshed with latest backend data.');
}

function toggleNotifications() {
    switchSection('dashboard');
    document.getElementById('activity-feed').scrollIntoView({ behavior: 'smooth' });
}

function toggleProfileMenu() {
    alert('Admin profile menu coming soon.');
}

async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
        await api('/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout call failed:', err);
    }
    localStorage.removeItem('authToken');
    window.location.href = '/';
}

function bindSearch() {
    const input = document.getElementById('admin-search');
    if (!input) return;
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderUsers(allUsers);
            return;
        }
        const filtered = allUsers.filter((u) =>
            (u.username || '').toLowerCase().includes(query) ||
            (u.fullName || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query)
        );
        renderUsers(filtered);
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
}
