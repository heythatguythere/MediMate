// API Configuration - Using relative URL to work in both local and production
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');

// Real data from backend
let allUsers = [];
let allCaretakers = [];

const mockCaretakers = [
    { id: 1, name: 'Dr. Sarah Wilson', department: 'Cardiology', patients: 12, avatar: 'SW' },
    { id: 2, name: 'Nurse Linda Davis', department: 'General Care', patients: 18, avatar: 'LD' },
    { id: 3, name: 'Dr. Michael Chen', department: 'Neurology', patients: 8, avatar: 'MC' },
    { id: 4, name: 'Nurse Emily Johnson', department: 'Pediatrics', patients: 15, avatar: 'EJ' },
    { id: 5, name: 'Dr. James Martinez', department: 'Orthopedics', patients: 10, avatar: 'JM' },
    { id: 6, name: 'Nurse Anna Lee', department: 'Geriatrics', patients: 20, avatar: 'AL' }
];

const mockMedications = [
    { medication: 'Metformin', patient: 'John Anderson', dosage: '500mg', schedule: '08:00, 20:00', adherence: 95 },
    { medication: 'Lisinopril', patient: 'Mary Thompson', dosage: '10mg', schedule: '09:00', adherence: 88 },
    { medication: 'Atorvastatin', patient: 'Robert Brown', dosage: '20mg', schedule: '21:00', adherence: 72 },
    { medication: 'Aspirin', patient: 'John Anderson', dosage: '81mg', schedule: '08:00', adherence: 98 },
    { medication: 'Levothyroxine', patient: 'Mary Thompson', dosage: '75mcg', schedule: '07:00', adherence: 91 }
];

const mockActivities = [
    { action: 'Caretaker John added patient #108', time: '5 minutes ago', type: 'info' },
    { action: 'Medication schedule updated for Mary Thompson', time: '15 minutes ago', type: 'success' },
    { action: 'Appointment confirmed with Dr. Meera', time: '1 hour ago', type: 'success' },
    { action: 'New user registration: Robert Wilson', time: '2 hours ago', type: 'info' },
    { action: 'Missed medication alert for Patient #45', time: '3 hours ago', type: 'warning' },
    { action: 'Weekly report generated successfully', time: '5 hours ago', type: 'success' },
    { action: 'System backup completed', time: '1 day ago', type: 'info' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!authToken) {
        window.location.href = '/app';
        return;
    }
    loadDashboardStats();
    loadDashboard();
    loadUsersFromBackend();
    loadCaretakers();
    loadMedications();
});

// Section Switching
function switchSection(sectionName) {
    // Remove active class from all sections and nav items
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Add active class to selected section and nav item
    document.getElementById(`${sectionName}-section`).classList.add('active');
    event.target.classList.add('active');
    
    // Load specific section data
    if (sectionName === 'reports') loadReports();
}

// Load Dashboard Statistics from Backend
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // Update stat cards
            document.querySelector('.stat-card.patients h3').textContent = stats.elderlyUsers || 0;
            document.querySelector('.stat-card.caretakers h3').textContent = stats.caretakers || 0;
            document.querySelector('.stat-card.appointments h3').textContent = stats.appointments || 0;
            document.querySelector('.stat-card.medications h3').textContent = stats.medications || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Dashboard Functions
function loadDashboard() {
    loadActivityFeed();
    loadAppointmentsChart();
    loadCaretakersChart();
}

function loadActivityFeed() {
    const feed = document.getElementById('activity-feed');
    feed.innerHTML = mockActivities.map(activity => `
        <div class="activity-item">
            <strong>${activity.action}</strong>
            <p class="activity-time">${activity.time}</p>
        </div>
    `).join('');
}

function loadAppointmentsChart() {
    const ctx = document.getElementById('appointments-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Appointments',
                data: [42, 38, 45, 52, 48, 35, 28],
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
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function loadCaretakersChart() {
    const ctx = document.getElementById('caretakers-chart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Cardiology', 'General Care', 'Neurology', 'Pediatrics', 'Orthopedics', 'Geriatrics'],
            datasets: [{
                data: [12, 18, 8, 15, 10, 20],
                backgroundColor: [
                    '#3b82f6',
                    '#06b6d4',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Users Management - Load from Backend
async function loadUsersFromBackend() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            allUsers = await response.json();
            renderUsers(allUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>#${user.id.substring(0, 8)}</td>
            <td><strong>${user.fullName || user.username}</strong></td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="role-badge ${user.role === 'Caregiver' ? 'caregiver' : 'elderly'}">${user.role}</span></td>
            <td><span class="status-badge ${user.status.toLowerCase()}">${user.status}</span></td>
            <td>${user.joinedDate || 'N/A'}</td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editUser('${user.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteUserConfirm('${user.id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Caretakers Management
function loadCaretakers() {
    const grid = document.getElementById('caretakers-grid');
    grid.innerHTML = mockCaretakers.map(caretaker => `
        <div class="caretaker-card">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2306b6d4'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='32' font-family='Arial'%3E${caretaker.avatar}%3C/text%3E%3C/svg%3E" 
                 alt="${caretaker.name}" class="caretaker-avatar">
            <h4>${caretaker.name}</h4>
            <p>${caretaker.department}</p>
            <div style="display: flex; justify-content: space-around; margin-top: 16px;">
                <div>
                    <strong style="font-size: 24px; color: var(--primary);">${caretaker.patients}</strong>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">Patients</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button class="btn-icon" onclick="viewCaretaker(${caretaker.id})" style="flex: 1;">👁️ View</button>
                <button class="btn-icon" onclick="editCaretaker(${caretaker.id})" style="flex: 1;">✏️ Edit</button>
            </div>
        </div>
    `).join('');
}

// Medications Management
function loadMedications() {
    const tbody = document.getElementById('medications-tbody');
    tbody.innerHTML = mockMedications.map((med, index) => `
        <tr>
            <td><strong>${med.medication}</strong></td>
            <td>${med.patient}</td>
            <td>${med.dosage}</td>
            <td>${med.schedule}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${med.adherence}%; height: 100%; background: ${med.adherence >= 90 ? '#10b981' : med.adherence >= 75 ? '#f59e0b' : '#ef4444'};"></div>
                    </div>
                    <span style="font-weight: 700; font-size: 13px;">${med.adherence}%</span>
                </div>
            </td>
            <td class="table-actions">
                <button class="btn-icon" onclick="editMedication(${index})" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteMedication(${index})" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Reports
function loadReports() {
    // Users Chart
    const usersCtx = document.getElementById('users-chart').getContext('2d');
    new Chart(usersCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Active Users',
                data: [85, 92, 105, 118, 124, 128],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // Adherence Chart
    const adherenceCtx = document.getElementById('adherence-chart').getContext('2d');
    new Chart(adherenceCtx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Adherence Rate',
                data: [88, 91, 89, 93],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, max: 100 }
            }
        }
    });
}

// Action Functions
function addUser() {
    alert('Opening Add User form...');
}

function editUser(id) {
    alert(`Editing user ${id}`);
}

async function deleteUserConfirm(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch(`${API_BASE}/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'X-Auth-Token': authToken }
            });
            
            if (response.ok) {
                alert('User deleted successfully');
                loadUsersFromBackend();
                loadDashboardStats();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    }
}

function addCaretaker() {
    alert('Opening Add Caretaker form...');
}

function viewCaretaker(id) {
    alert(`Viewing caretaker ${id} details`);
}

function editCaretaker(id) {
    alert(`Editing caretaker ${id}`);
}

function addMedication() {
    alert('Opening Add Medication form...');
}

function editMedication(index) {
    alert(`Editing medication ${index}`);
}

function deleteMedication(index) {
    if (confirm('Are you sure you want to delete this medication?')) {
        alert(`Medication ${index} deleted`);
        loadMedications();
    }
}

function scheduleAppointment() {
    alert('Opening Schedule Appointment form...');
}

function generateReport() {
    alert('Generating comprehensive report...');
}

function toggleNotifications() {
    alert('Notifications panel');
}

function toggleProfileMenu() {
    alert('Profile menu');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/';
    }
}

// Search functionality
document.getElementById('admin-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    console.log('Searching for:', query);
    // Implement search logic here
});
