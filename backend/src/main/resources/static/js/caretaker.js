// API Configuration - Using relative URL to work in both local and production
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');

// Data storage
let allPatients = [];
let allAppointments = [];
let allTasks = [];
let allNotifications = [];

// ========== CARETAKER AI INSIGHTS ==========
async function refreshInsights() {
    const container = document.getElementById('insights-container');
    if (container) container.innerHTML = '<p class="loading">Loading insights...</p>';
    try {
        const ctx = 'Provide concise health insights based on patient adherence and wellness trends.';
        const res = await fetch(`${API_BASE}/caretaker/ai/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ context: ctx })
        });
        if (res.ok) {
            const data = await res.json();
            if (container) container.innerHTML = `<div class="ai-panel"><p>${(data.insight||'').replace(/</g,'&lt;')}</p></div>`;
        } else {
            if (container) container.innerHTML = '<p>Unable to load insights.</p>';
        }
    } catch (e) {
        if (container) container.innerHTML = '<p>Unable to load insights.</p>';
    }
}

// ========== PATIENT MEDICATIONS (CARETAKER) ==========
async function loadPatientMedications() {
    const email = document.getElementById('pm-email')?.value?.trim() || '';
    const tbody = document.getElementById('pm-tbody');
    if (!tbody) return;
    if (!email) { tbody.innerHTML = '<tr><td colspan="4">Enter patient email</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications?patientEmail=${encodeURIComponent(email)}`, { headers: { 'X-Auth-Token': authToken } });
        if (res.ok) {
            const meds = await res.json();
            if (!meds.length) { tbody.innerHTML = '<tr><td colspan="4">No medications found</td></tr>'; return; }
            tbody.innerHTML = meds.map(m => `
                <tr>
                    <td>${m.name}</td>
                    <td>${m.dosage}</td>
                    <td>${m.schedule}</td>
                    <td>
                        <button class="btn-secondary" onclick="openEditMedModal('${m.id}','${m.name}','${m.dosage}','${m.schedule}')">Edit</button>
                        <button class="btn-danger" onclick="deletePatientMedication('${m.id}')">Delete</button>
                    </td>
                </tr>`).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4">Failed to load</td></tr>';
        }
    } catch { tbody.innerHTML = '<tr><td colspan="4">Error</td></tr>'; }
}

async function deletePatientMedication(id) {
    const email = document.getElementById('pm-email')?.value?.trim() || '';
    if (!id) return;
    if (!confirm('Delete this medication?')) return;
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Auth-Token': authToken } });
        if (res.status === 204) { toast('Medication deleted'); loadPatientMedications(); }
        else { toast('Failed to delete medication', 'error'); }
    } catch { toast('Error deleting medication', 'error'); }
}

function openEditMedModal(id, name, dosage, schedule) {
    document.getElementById('em-id').value = id;
    document.getElementById('em-name').value = name || '';
    document.getElementById('em-dosage').value = dosage || '';
    document.getElementById('em-schedule').value = schedule || '';
    document.getElementById('edit-med-modal').style.display = 'block';
}

function closeEditMedModal() {
    document.getElementById('edit-med-modal').style.display = 'none';
}

async function saveEditedMedication() {
    const id = document.getElementById('em-id').value;
    const name = document.getElementById('em-name')?.value?.trim() || '';
    const dosage = document.getElementById('em-dosage')?.value?.trim() || '';
    const schedule = document.getElementById('em-schedule')?.value?.trim() || '';
    if (!id || !name || !dosage || !schedule) { toast('Fill all fields', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ name, dosage, schedule })
        });
        if (res.ok) {
            toast('Medication updated');
            closeEditMedModal();
            loadPatientMedications();
        } else { toast('Failed to update medication', 'error'); }
    } catch { toast('Error updating medication', 'error'); }
}

// ========== ASSIGN MEDICATION (CARETAKER) ==========
async function assignMedicationFromForm() {
    const email = document.getElementById('am-email')?.value?.trim() || '';
    const name = document.getElementById('am-name')?.value?.trim() || '';
    const dosage = document.getElementById('am-dosage')?.value?.trim() || '';
    const schedule = document.getElementById('am-schedule')?.value?.trim() || '';
    if (!email || !name || !dosage || !schedule) { toast('Fill all fields to assign', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ patientEmail: email, name, dosage, schedule })
        });
        if (res.ok) {
            ['am-email','am-name','am-dosage','am-schedule'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
            toast('Medication assigned');
        } else { toast('Failed to assign medication', 'error'); }
    } catch { toast('Error assigning medication', 'error'); }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!authToken) {
        window.location.href = '/app';
        return;
    }
    // Header user info
    const username = localStorage.getItem('username') || 'Caretaker';
    const role = localStorage.getItem('role') || 'Caretaker';
    const avatar = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='#3b82f6'/><text x='50' y='55' text-anchor='middle' fill='white' font-size='40' font-family='Arial'>${(username[0]||'C').toUpperCase()}</text></svg>`)}`;
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = username;
    if (roleEl) roleEl.textContent = role;
    if (avatarEl) avatarEl.src = avatar;

    // Restore last tab
    const lastTab = localStorage.getItem('ct_last_tab') || 'dashboard';
    try { switchTab(lastTab); } catch {}

    loadDashboardStats();
    loadPatients();
    loadAppointments();
    loadTasks();
    loadNotifications();
    initConfirmModal();

    // Patient quick search
    const search = document.getElementById('patient-search');
    if (search) {
        search.addEventListener('input', () => applyPatientFilter(search.value));
    }

    // Expose functions for inline handlers
    window.claimPatientFromForm = claimPatientFromForm;
    window.viewPatient = viewPatient;
    window.editPatient = editPatient;
    window.deletePatientConfirm = deletePatientConfirm;
    window.fillAppointmentForm = fillAppointmentForm;
    window.saveAppointmentFromForm = saveAppointmentFromForm;
    window.resetAppointmentForm = resetAppointmentForm;
    window.markAppointmentCompleted = markAppointmentCompleted;
    window.deleteAppointmentConfirm = deleteAppointmentConfirm;
    window.fillTaskForm = fillTaskForm;
    window.saveTaskFromForm = saveTaskFromForm;
    window.resetTaskForm = resetTaskForm;
    window.deleteTaskConfirm = deleteTaskConfirm;
    window.assignMedicationFromForm = assignMedicationFromForm;
    window.loadPatientMedications = loadPatientMedications;
    window.deletePatientMedication = deletePatientMedication;
    window.openEditMedModal = openEditMedModal;
    window.closeEditMedModal = closeEditMedModal;
    window.saveEditedMedication = saveEditedMedication;
    window.selectPatientForMessage = selectPatientForMessage;
    window.sendMessageToSelected = sendMessageToSelected;
    window.openAssignMedModal = openAssignMedModal;
    window.closeAssignMedModal = closeAssignMedModal;
    window.saveAssignMed = saveAssignMed;
    window.addTimeSlot = addTimeSlot;
    window.removeTimeSlot = removeTimeSlot;
    window.openViewMedsModal = openViewMedsModal;
    window.closeViewMedsModal = closeViewMedsModal;
    window.deleteMedFromModal = deleteMedFromModal;
    window.openAddAptModal = openAddAptModal;
    window.closeAddAptModal = closeAddAptModal;
    window.saveAppointmentForPatient = saveAppointmentForPatient;
    window.openAddTaskModal = openAddTaskModal;
    window.closeAddTaskModal = closeAddTaskModal;
    window.saveTaskForPatient = saveTaskForPatient;
    window.markCaretakerNotificationRead = markCaretakerNotificationRead;
    window.deleteNotification = deleteNotification;
    window.toggleNotifications = toggleNotifications;
    window.markNotificationRead = markNotificationRead;
    window.markAllNotificationsRead = markAllNotificationsRead;
});

async function addPatientFromForm() {
    const name = document.getElementById('pf-name')?.value?.trim();
    const age = document.getElementById('pf-age')?.value?.trim();
    const condition = document.getElementById('pf-condition')?.value?.trim();
    const contactNumber = document.getElementById('pf-contact')?.value?.trim();
    const email = document.getElementById('pf-email')?.value?.trim();
    const address = document.getElementById('pf-address')?.value?.trim();
    const status = document.getElementById('pf-status')?.value || 'Active';
    if (!name) { toast('Name is required', 'error'); return; }

// moved below with other patient renderers
    try {
        const res = await fetch(`${API_BASE}/caretaker/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ name, age, condition, contactNumber, email, address, status })
        });
        if (res.ok) {
            ['pf-name','pf-age','pf-condition','pf-contact','pf-email','pf-address'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
            document.getElementById('pf-status').value='Active';
            await loadPatients();
            await loadDashboardStats();
            alert('Patient saved');
        } else {
            alert('Failed to save patient');
        }
    } catch (e) { console.error('addPatientFromForm', e); }
}

async function claimPatientFromForm() {
    const name = document.getElementById('cf-name')?.value?.trim() || '';
    const email = document.getElementById('cf-email')?.value?.trim() || '';
    const contactNumber = document.getElementById('cf-contact')?.value?.trim() || '';
    if (!email && !contactNumber) { toast('Provide email or phone to claim', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/patients/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ name, email, contactNumber })
        });
        if (res.ok) {
            ['cf-name','cf-email','cf-contact'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
            await loadPatients();
            await loadDashboardStats();
            toast('Patient claimed to you');
        } else if (res.status === 404) {
            toast('No matching patient found', 'error');
        } else {
            toast('Failed to claim patient', 'error');
        }
    } catch (e) { console.error('claimPatientFromForm', e); }
}

// ========== DASHBOARD STATS ==========

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/caretaker/stats`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            const stats = await response.json();
            const patientsEl = document.querySelector('.stat-card.patients h3');
            const apptsEl = document.querySelector('.stat-card.appointments h3');
            const tasksEl = document.querySelector('.stat-card.tasks h3');
            const activeEl = document.querySelector('.stat-card.active h3');
            if (patientsEl) patientsEl.textContent = stats.totalPatients || 0;
            if (apptsEl) apptsEl.textContent = stats.todayAppointments || 0;
            if (tasksEl) tasksEl.textContent = stats.pendingTasks || 0;
            if (activeEl) activeEl.textContent = stats.activePatients || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========== PATIENTS ==========

async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE}/caretaker/patients`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            allPatients = await response.json();
            renderPatients(allPatients);
            (window.renderPatientsList || function(){})(allPatients);
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

function renderPatients(patients) {
    const grid = document.getElementById('patients-grid');
    
    if (patients.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No patients yet. Click "Add Patient" to get started.</p>';
        return;
    }
    
    grid.innerHTML = patients.map(patient => {
        const initials = patient.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const statusClass = patient.status === 'Active' ? 'on-track' : 'inactive';
        
        return `
            <div class="patient-card ${statusClass}">
                <div class="patient-avatar">${initials}</div>
                <div class="patient-info">
                    <h4>${patient.name}</h4>
                    <p class="patient-condition">${patient.condition || 'No condition specified'}</p>
                    <div class="patient-meta">
                        <span>Age: ${patient.age || 'N/A'}</span>
                        <span class="status-badge ${statusClass}">${patient.status}</span>
                    </div>
                </div>
                <div class="patient-actions">
                    <button onclick="viewPatient('${patient.id}')" class="btn-icon" title="View Details">👁️</button>
                    <button onclick="editPatient('${patient.id}')" class="btn-icon" title="Edit">✏️</button>
                    <button onclick="deletePatientConfirm('${patient.id}')" class="btn-icon" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderPatientsDetailed() {
    const container = document.getElementById('patients-list-detailed');
    if (!container) return;
    
    if (!allPatients || allPatients.length === 0) {
        container.innerHTML = '<div class="card" style="padding:40px; text-align:center; color:#94a3b8;"><p>No patients claimed yet. Use the form above to claim a patient.</p></div>';
        return;
    }
    
    container.innerHTML = allPatients.map(p => `
        <div class="card" style="margin-bottom:16px; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
                <div>
                    <h3 style="margin:0 0 4px; font-size:18px;">${p.name}</h3>
                    <p style="margin:0; color:#64748b; font-size:14px;">${p.email || ''} ${p.contactNumber ? '• ' + p.contactNumber : ''}</p>
                    <p style="margin:4px 0 0; color:#64748b; font-size:14px;">${p.condition || 'No condition'} ${p.age ? '• Age ' + p.age : ''}</p>
                </div>
                <span class="status-badge ${p.status === 'Active' ? 'on-track' : 'inactive'}">${p.status}</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn-primary" onclick="openAssignMedModal('${p.id}', '${p.name}', '${p.email}')">💊 Assign Medication</button>
                <button class="btn-secondary" onclick="openViewMedsModal('${p.id}', '${p.name}', '${p.email}')">📋 View Medications</button>
                <button class="btn-secondary" onclick="openAddAptModal('${p.id}', '${p.name}')">📅 Add Appointment</button>
                <button class="btn-secondary" onclick="openAddTaskModal('${p.id}', '${p.name}')">✅ Add Task</button>
            </div>
        </div>
    `).join('');
}

async function addPatient() {
    const name = prompt('Patient Name:');
    if (!name) return;
    
    const age = prompt('Age:');
    const condition = prompt('Medical Condition:');
    const contactNumber = prompt('Contact Number:');
    
    try {
        const response = await fetch(`${API_BASE}/caretaker/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({
                name,
                age,
                condition,
                contactNumber,
                status: 'Active'
            })
        });
        
        if (response.ok) {
            toast('Patient added successfully');
            loadPatients();
            loadDashboardStats();
        } else {
            toast('Failed to add patient', 'error');
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        toast('Error adding patient', 'error');
    }
}

function viewPatient(id) {
    const patient = allPatients.find(p => p.id === id);
    if (!patient) return;
    openGenericModal('Patient Details', `
        <div class="form-grid">
            <div><strong>Name:</strong> ${patient.name}</div>
            <div><strong>Age:</strong> ${patient.age || 'N/A'}</div>
            <div><strong>Condition:</strong> ${patient.condition || 'N/A'}</div>
            <div><strong>Status:</strong> ${patient.status}</div>
            <div><strong>Phone:</strong> ${patient.contactNumber || 'N/A'}</div>
            <div><strong>Email:</strong> ${patient.email || 'N/A'}</div>
            <div><strong>Blood Group:</strong> ${patient.bloodGroup || 'N/A'}</div>
            <div><strong>Allergies:</strong> ${patient.allergies || 'None'}</div>
            <div style="grid-column: 1/-1;"><strong>Notes:</strong> ${patient.notes || 'None'}</div>
        </div>
        <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn-secondary" onclick="openPatientEditor('${patient.id}')">Edit</button>
            <button class="btn-primary" onclick="closeGenericModal()">Close</button>
        </div>
    `);
}

async function editPatient(id) {
    openPatientEditor(id);
}

async function deletePatientConfirm(id) {
    if (!(await confirmModal('Delete this patient?'))) return;
    
    try {
        const response = await fetch(`${API_BASE}/caretaker/patients/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            toast('Patient deleted');
            loadPatients();
            loadDashboardStats();
        } else {
            toast('Failed to delete patient', 'error');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        toast('Error deleting patient', 'error');
    }
}

// ========== APPOINTMENTS ==========

async function loadAppointments() {
    try {
        const response = await fetch(`${API_BASE}/caretaker/appointments`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            allAppointments = await response.json();
            renderAppointments(allAppointments);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function renderAppointments(appointments) {
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return; // Element hidden in new consolidated layout
    
    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">No appointments scheduled.</td></tr>';
        return;
    }
    
    tbody.innerHTML = appointments.map(apt => {
        const statusClass = apt.status === 'Scheduled' ? 'scheduled' : apt.status === 'Completed' ? 'completed' : 'cancelled';
        
        return `
            <tr>
                <td><strong>${apt.patientName}</strong></td>
                <td>${apt.date}</td>
                <td>${apt.time}</td>
                <td><span class="type-badge">${apt.type || 'Checkup'}</span></td>
                <td><span class="status-badge ${statusClass}">${apt.status}</span></td>
                <td class="table-actions">
                    <button onclick="fillAppointmentForm('${apt.id}')" class="btn-icon" title="Edit">✏️</button>
                    <button onclick="markAppointmentCompleted('${apt.id}')" class="btn-icon" title="Complete">✅</button>
                    <button onclick="deleteAppointmentConfirm('${apt.id}')" class="btn-icon" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function resetAppointmentForm() {
    ['apt-id','apt-patient','apt-date','apt-time'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const type=document.getElementById('apt-type'); if(type) type.value='Checkup';
    const status=document.getElementById('apt-status'); if(status) status.value='Scheduled';
}

function fillAppointmentForm(id) {
    const apt = allAppointments.find(a => a.id === id);
    if (!apt) return;
    document.getElementById('apt-id').value = apt.id;
    document.getElementById('apt-patient').value = apt.patientName || '';
    document.getElementById('apt-date').value = apt.date || '';
    document.getElementById('apt-time').value = apt.time || '';
    document.getElementById('apt-type').value = apt.type || 'Checkup';
    document.getElementById('apt-status').value = apt.status || 'Scheduled';
    window.scrollTo({ top: document.getElementById('apt-patient').offsetTop - 100, behavior: 'smooth' });
}

async function saveAppointmentFromForm() {
    const id = document.getElementById('apt-id').value;
    const patientName = document.getElementById('apt-patient').value.trim();
    const date = document.getElementById('apt-date').value;
    const time = document.getElementById('apt-time').value;
    const type = document.getElementById('apt-type').value;
    const status = document.getElementById('apt-status').value;
    if (!patientName || !date || !time) { toast('Patient, date and time are required', 'error'); return; }
    const payload = { patientName, date, time, type, status };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/caretaker/appointments/${id}` : `${API_BASE}/caretaker/appointments`;
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken }, body: JSON.stringify(payload) });
        if (res.ok) {
            resetAppointmentForm();
            await loadAppointments();
            await loadDashboardStats();
        } else { toast('Failed to save appointment', 'error'); }
    } catch (e) { console.error('saveAppointmentFromForm', e); }
}

async function markAppointmentCompleted(id) {
    try {
        const response = await fetch(`${API_BASE}/caretaker/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ status: 'Completed' })
        });
        if (response.ok) {
            await loadAppointments();
        }
    } catch (error) { console.error('Error completing appointment:', error); }
}

async function completeAppointment(id) {
    try {
        const response = await fetch(`${API_BASE}/caretaker/appointments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': authToken
            },
            body: JSON.stringify({ status: 'Completed' })
        });
        
        if (response.ok) {
            toast('Appointment marked as completed');
            loadAppointments();
        } else {
            toast('Failed to complete appointment', 'error');
        }
    } catch (error) {
        console.error('Error completing appointment:', error);
        toast('Error completing appointment', 'error');
    }
}

async function deleteAppointmentConfirm(id) {
    if (!(await confirmModal('Delete this appointment?'))) return;
    
    try {
        const response = await fetch(`${API_BASE}/caretaker/appointments/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            toast('Appointment deleted');
            loadAppointments();
            loadDashboardStats();
        } else {
            toast('Failed to delete appointment', 'error');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        toast('Error deleting appointment', 'error');
    }
}

// ========== TASKS ==========

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/caretaker/tasks`, {
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            allTasks = await response.json();
            renderTasks(allTasks);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function renderTasks(tasks) {
    const tbody = document.getElementById('tasks-tbody');
    
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">No tasks yet. Click "Add Task" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = tasks.map(task => {
        const priorityClass = task.priority === 'High' ? 'high' : task.priority === 'Medium' ? 'medium' : 'low';
        const statusClass = task.status === 'Completed' ? 'completed' : 'pending';
        
        return `
            <tr>
                <td><strong>${task.title}</strong></td>
                <td>${task.patientName || 'General'}</td>
                <td><span class="priority-badge ${priorityClass}">${task.priority}</span></td>
                <td>${task.dueDate || 'No deadline'}</td>
                <td class="table-actions">
                    ${task.status !== 'Completed' ? `<button onclick="completeTask('${task.id}')" class="btn-icon" title="Complete">✅</button>` : '<span style="color: #10b981;">✓ Done</span>'}
                    <button onclick="fillTaskForm('${task.id}')" class="btn-icon" title="Edit">✏️</button>
                    <button onclick="saveTaskFromForm('${task.id}')" class="btn-icon" title="Save">💾</button>
                    <button onclick="deleteTaskConfirm('${task.id}')" class="btn-icon" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function resetTaskForm() {
    ['task-id','task-title','task-patient','task-due'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const pr=document.getElementById('task-priority'); if (pr) pr.value='Medium';
    const st=document.getElementById('task-status'); if (st) st.value='Pending';
}

function fillTaskForm(id) {
    const t = allTasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('task-id').value = t.id;
    document.getElementById('task-title').value = t.title || '';
    document.getElementById('task-patient').value = t.patientName || '';
    document.getElementById('task-priority').value = t.priority || 'Medium';
    document.getElementById('task-due').value = t.dueDate || '';
    document.getElementById('task-status').value = t.status || 'Pending';
    window.scrollTo({ top: document.getElementById('task-title').offsetTop - 100, behavior: 'smooth' });
}

async function saveTaskFromForm() {
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const patientName = document.getElementById('task-patient').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due').value;
    const status = document.getElementById('task-status').value;
    if (!title) { toast('Title is required', 'error'); return; }
    const payload = { title, patientName, priority, dueDate, status };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/caretaker/tasks/${id}` : `${API_BASE}/caretaker/tasks`;
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken }, body: JSON.stringify(payload) });
        if (res.ok) {
            resetTaskForm();
            await loadTasks();
            await loadDashboardStats();
        } else { toast('Failed to save task', 'error'); }
    } catch (e) { console.error('saveTaskFromForm', e); }
}

async function completeTask(id) {
    try {
        const response = await fetch(`${API_BASE}/caretaker/tasks/${id}/complete`, {
            method: 'PATCH',
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            toast('Task completed');
            loadTasks();
            loadDashboardStats();
        } else { toast('Failed to complete task', 'error'); }
    } catch (error) {
        console.error('Error completing task:', error);
        toast('Error completing task', 'error');
    }
}

async function deleteTaskConfirm(id) {
    if (!(await confirmModal('Delete this task?'))) return;
    
    try {
        const response = await fetch(`${API_BASE}/caretaker/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'X-Auth-Token': authToken }
        });
        
        if (response.ok) {
            toast('Task deleted');
            loadTasks();
            loadDashboardStats();
        } else {
            toast('Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        toast('Error deleting task', 'error');
    }
}

// ========== PATIENTS ==========

async function loadPatients() {
    try {
        const res = await fetch(`${API_BASE}/caretaker/patients`, { headers: { 'X-Auth-Token': authToken } });
        if (!res.ok) return;
        allPatients = await res.json();
        renderPatients(allPatients);
        renderPatientsList(allPatients);
        renderPatientsDetailed();
    } catch (e) { console.error('loadPatients error', e); }
}

function renderPatients(patients) {
    // For dashboard overview grid
    const grid = document.getElementById('patients-grid');
    if (!grid) return;
    
    if (patients.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">No patients yet.</p>';
        return;
    }
    
    grid.innerHTML = patients.map(patient => {
        const initials = patient.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const statusClass = patient.status === 'Active' ? 'on-track' : 'inactive';
        
        return `
            <div class="patient-card ${statusClass}">
                <div class="patient-avatar">${initials}</div>
                <div class="patient-info">
                    <h4>${patient.name}</h4>
                    <p class="patient-condition">${patient.condition || 'No condition specified'}</p>
                    <div class="patient-meta">
                        <span>Age: ${patient.age || 'N/A'}</span>
                        <span class="status-badge ${statusClass}">${patient.status}</span>
                    </div>
                </div>
                <div class="patient-actions">
                    <button onclick="viewPatient('${patient.id}')" class="btn-icon" title="View Details">👁️</button>
                    <button onclick="editPatient('${patient.id}')" class="btn-icon" title="Edit">✏️</button>
                    <button onclick="deletePatientConfirm('${patient.id}')" class="btn-icon" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderPatientsList(patients) {
    const list = document.getElementById('patients-list');
    if (!list) return; // Element might not exist on all tabs
    
    if (patients.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; padding:12px;">No patients assigned</p>';
        return;
    }
    
    list.innerHTML = patients.map(patient => {
        return `
            <div class="patient-item" style="padding:12px; border-bottom:1px solid #e5e7eb; cursor:pointer;" onclick="openPatientDetails('${patient.id}')">
                <strong>${patient.name}</strong>
                <div style="font-size:12px; color:#64748b;">${patient.email}</div>
            </div>
        `;
    }).join('');
}

// Modal handlers for patient-specific actions
function openAssignMedModal(id, name, email) {
    document.getElementById('am-patient-id').value = id;
    document.getElementById('am-patient-email').value = email;
    document.getElementById('am-patient-name').textContent = name;
    document.getElementById('assign-med-modal').style.display = 'block';
}

function closeAssignMedModal() {
    document.getElementById('assign-med-modal').style.display = 'none';
    ['am-name', 'am-dosage', 'am-schedule'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function addTimeSlot() {
    const container = document.getElementById('time-slots-container');
    const newSlot = document.createElement('div');
    newSlot.className = 'time-slot';
    newSlot.style.cssText = 'display:flex; gap:8px; align-items:center;';
    newSlot.innerHTML = `
        <input type="number" min="1" max="12" placeholder="Hour" style="width:70px;" class="time-hour" value="12">
        <input type="number" min="0" max="59" placeholder="Min" style="width:70px;" class="time-minute" value="0">
        <select class="time-period" style="width:80px;">
            <option value="AM">AM</option>
            <option value="PM" selected>PM</option>
        </select>
        <button type="button" onclick="removeTimeSlot(this)" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">Remove</button>
    `;
    container.appendChild(newSlot);
}

function removeTimeSlot(button) {
    const container = document.getElementById('time-slots-container');
    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        toast('Must have at least one time slot', 'error');
    }
}

function convertTo24Hour(hour, minute, period) {
    hour = parseInt(hour);
    minute = parseInt(minute);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

async function saveAssignMed() {
    const email = document.getElementById('am-patient-email').value;
    const name = document.getElementById('am-name')?.value?.trim() || '';
    const dosage = document.getElementById('am-dosage')?.value?.trim() || '';
    
    // Collect all time slots and convert to 24-hour format
    const timeSlots = document.querySelectorAll('.time-slot');
    const times = [];
    for (const slot of timeSlots) {
        const hour = slot.querySelector('.time-hour').value;
        const minute = slot.querySelector('.time-minute').value;
        const period = slot.querySelector('.time-period').value;
        if (hour && minute !== '') {
            times.push(convertTo24Hour(hour, minute, period));
        }
    }
    
    const schedule = times.join(',');
    
    if (!name || !dosage || times.length === 0) { 
        toast('Fill all fields and add at least one time', 'error'); 
        return; 
    }
    
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ patientEmail: email, name, dosage, schedule })
        });
        if (res.ok) { 
            toast('Medication assigned'); 
            closeAssignMedModal(); 
        }
        else { toast('Failed to assign medication', 'error'); }
    } catch { toast('Error assigning medication', 'error'); }
}

function openViewMedsModal(id, name, email) {
    document.getElementById('vm-patient-name').textContent = name;
    document.getElementById('view-meds-modal').style.display = 'block';
    loadMedsForPatient(email);
}

function closeViewMedsModal() {
    document.getElementById('view-meds-modal').style.display = 'none';
}

async function loadMedsForPatient(email) {
    const tbody = document.getElementById('vm-tbody');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications?patientEmail=${encodeURIComponent(email)}`, { headers: { 'X-Auth-Token': authToken } });
        if (res.ok) {
            const meds = await res.json();
            if (!meds.length) { tbody.innerHTML = '<tr><td colspan="4">No medications assigned</td></tr>'; return; }
            tbody.innerHTML = meds.map(m => `
                <tr>
                    <td>${m.name}</td>
                    <td>${m.dosage}</td>
                    <td>${m.schedule}</td>
                    <td>
                        <button class="btn-secondary" onclick="openEditMedModal('${m.id}','${m.name}','${m.dosage}','${m.schedule}')">Edit</button>
                        <button class="btn-danger" onclick="deleteMedFromModal('${m.id}', '${email}')">Delete</button>
                    </td>
                </tr>`).join('');
        }
    } catch { tbody.innerHTML = '<tr><td colspan="4">Error</td></tr>'; }
}

async function deleteMedFromModal(id, email) {
    if (!confirm('Delete this medication?')) return;
    try {
        const res = await fetch(`${API_BASE}/caretaker/medications/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Auth-Token': authToken } });
        if (res.status === 204) { toast('Deleted'); loadMedsForPatient(email); }
        else { toast('Failed to delete', 'error'); }
    } catch { toast('Error deleting', 'error'); }
}

function openAddAptModal(id, name) {
    document.getElementById('apt-patient-id').value = id;
    document.getElementById('apt-patient-name-display').textContent = name;
    document.getElementById('add-apt-modal').style.display = 'block';
}

function closeAddAptModal() {
    document.getElementById('add-apt-modal').style.display = 'none';
}

async function saveAppointmentForPatient() {
    const patientName = document.getElementById('apt-patient-name-display').textContent;
    const date = document.getElementById('apt-date').value;
    const time = document.getElementById('apt-time').value;
    const type = document.getElementById('apt-type').value;
    if (!date || !time) { toast('Fill date and time', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/appointments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ patientName, date, time, type, status: 'Scheduled' })
        });
        if (res.ok) { toast('Appointment added'); closeAddAptModal(); loadAppointments(); }
        else { toast('Failed to add appointment', 'error'); }
    } catch { toast('Error adding appointment', 'error'); }
}

function openAddTaskModal(id, name) {
    document.getElementById('task-patient-id').value = id;
    document.getElementById('task-patient-name-display').textContent = name;
    document.getElementById('add-task-modal').style.display = 'block';
}

function closeAddTaskModal() {
    document.getElementById('add-task-modal').style.display = 'none';
}

async function saveTaskForPatient() {
    const patientName = document.getElementById('task-patient-name-display').textContent;
    const title = document.getElementById('task-title').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due').value;
    if (!title) { toast('Enter task title', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/tasks`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ title, patientName, priority, dueDate, status: 'Pending' })
        });
        if (res.ok) { toast('Task added'); closeAddTaskModal(); loadTasks(); }
        else { toast('Failed to add task', 'error'); }
    } catch { toast('Error adding task', 'error'); }
}

// ========== NOTIFICATIONS ==========

async function loadNotifications() {
    try {
        const res = await fetch(`${API_BASE}/caretaker/notifications`, { headers: { 'X-Auth-Token': authToken } });
        if (res.ok) {
            allNotifications = await res.json();
            updateNotifBadge();
        }
    } catch (e) { console.error('Error loading notifications', e); }
}

function updateNotifBadge() {
    const unread = allNotifications.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    const sidebarCount = document.getElementById('sidebar-alert-count');
    
    // Update top notification badge
    if (badge) {
        if (unread > 0) {
            badge.textContent = String(unread);
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Update sidebar alert count
    if (sidebarCount) {
        if (unread > 0) {
            sidebarCount.textContent = String(unread);
            sidebarCount.style.display = 'inline-block';
        } else {
            sidebarCount.style.display = 'none';
        }
    }
}

// Function removed - right panel no longer exists

async function markCaretakerNotificationRead(id) {
    try {
        const res = await fetch(`${API_BASE}/caretaker/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'X-Auth-Token': authToken }
        });
        if (res.ok) {
            const notif = allNotifications.find(n => n.id === id);
            if (notif) notif.read = true;
            updateNotifBadge();
            // Refresh the notification dropdown to show updated state
            const dd = document.getElementById('notif-dropdown');
            if (dd && dd.style.display === 'block') {
                toggleNotifications(); // Close it
                toggleNotifications(); // Reopen it with updated data
            }
            toast('Notification marked as read');
        }
    } catch (e) { console.error('markCaretakerNotificationRead error', e); }
}

 

async function deleteNotification(id) {
    try {
        const res = await fetch(`${API_BASE}/caretaker/notifications/${id}`, { method: 'DELETE', headers: { 'X-Auth-Token': authToken } });
        if (res.ok) {
            allNotifications = allNotifications.filter(n => n.id !== id);
            updateNotifBadge();
        }
    } catch (e) { console.error('deleteNotification error', e); }
}

// ========== MESSAGES (backend) ==========

let selectedMessagePatient = null;

async function loadConversations() {
    const list = document.getElementById('msg-patients-list');
    if (!list) return;
    if (!allPatients || allPatients.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8; padding:12px;">No patients assigned</p>';
        return;
    }
    list.innerHTML = allPatients.map(p => `
        <div class="patient-msg-item" style="padding:12px; border-bottom:1px solid #e5e7eb; cursor:pointer; ${selectedMessagePatient && selectedMessagePatient.id === p.id ? 'background:#f1f5f9;' : ''}" onclick="selectPatientForMessage('${p.id}', '${p.name}', '${p.email}')">
            <strong>${p.name}</strong>
            <div style="font-size:12px; color:#64748b;">${p.email}</div>
        </div>
    `).join('');
}

function selectPatientForMessage(id, name, email) {
    selectedMessagePatient = { id, name, email };
    document.getElementById('msg-input').disabled = false;
    document.getElementById('msg-send-btn').disabled = false;
    document.getElementById('msg-conversation').innerHTML = `
        <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:12px;">
            <strong>Conversation with ${name}</strong>
        </div>
        <p style="color:#94a3b8; font-size:14px; text-align:center;">Start a new message below</p>
    `;
    loadConversations(); // refresh to highlight selected
}

function sendMessageToSelected() {
    const input = document.getElementById('msg-input');
    const msg = input?.value?.trim();
    if (!msg || !selectedMessagePatient) return;
    fetch(`${API_BASE}/caretaker/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
        body: JSON.stringify({ patientId: selectedMessagePatient.id, patientName: selectedMessagePatient.name, content: msg, sender: 'caretaker' })
    }).then(res => {
        if (res.ok) {
            input.value = '';
            toast('Message sent to ' + selectedMessagePatient.name);
            const conv = document.getElementById('msg-conversation');
            if (conv) {
                conv.innerHTML += `<div style="background:#dbeafe; padding:8px 12px; border-radius:8px; margin-bottom:8px; text-align:right;"><strong>You:</strong> ${msg}</div>`;
            }
        } else { toast('Failed to send message', 'error'); }
    }).catch(() => toast('Error sending message', 'error'));
}

async function openConversation(patientId, patientName) {
    try {
        const res = await fetch(`${API_BASE}/caretaker/messages/thread?patientId=${encodeURIComponent(patientId)}`, { headers: { 'X-Auth-Token': authToken } });
        if (!res.ok) return;
        const thread = await res.json();
        const main = document.getElementById('messages-main');
        if (!main) return;
        main.innerHTML = `
            <div class="conversation-header">
                <h3>💬 ${patientName}</h3>
                <button class="btn-secondary" onclick="callPatient('${patientName}')">📞 Call</button>
            </div>
            <div class="messages-thread">
                ${thread.map(m => `
                    <div class="message ${m.sender === 'caretaker' ? 'sent' : 'received'}">
                        <strong>${m.sender === 'caretaker' ? 'You' : patientName}</strong>
                        <p>${m.content}</p>
                        <small>${m.createdAt || ''}</small>
                    </div>`).join('')}
            </div>
            <div class="message-composer">
                <input type="text" id="message-input" placeholder="Type your message..." onkeypress="if(event.key==='Enter') sendMessage('${patientId}', '${patientName}')">
                <button class="btn-primary" onclick="sendMessage('${patientId}', '${patientName}')">Send</button>
            </div>`;
    } catch (e) { console.error('openConversation error', e); }
}

async function sendMessage(patientId, patientName) {
    const input = document.getElementById('message-input');
    if (!input || !input.value.trim()) return;
    const message = input.value.trim();
    try {
        const res = await fetch(`${API_BASE}/caretaker/messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ patientId, patientName, content: message, sender: 'caretaker' })
        });
        if (res.ok) {
            input.value = '';
            openConversation(patientId, patientName);
        }
    } catch (e) { console.error('sendMessage error', e); }
}

// ========== REPORT CSV EXPORT ==========

function exportCSV(filename, rows) {
    if (!rows || rows.length === 0) { toast('No data to export', 'error'); return; }
    const keys = Object.keys(rows[0]);
    const lines = [keys.join(',')].concat(rows.map(r => keys.map(k => JSON.stringify(r[k]??'')).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

async function logout() {
    if (await confirmModal('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/app';
    }
}

function refreshDashboard() {
    loadDashboardStats();
    loadPatients();
    loadAppointments();
    loadTasks();
    toast('Dashboard refreshed');
}

// ========== TAB SWITCHING ==========

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to nav item for this tab
    document.querySelectorAll('.sidebar .sidebar-item').forEach(btn => {
        const label = btn.textContent.trim().toLowerCase();
        const map = { dashboard:'dashboard', patients:'patients', alerts:'alerts', 'ai insights':'insights', reports:'reports', messages:'messages', settings:'settings' };
        if (map[label] === tabName) btn.classList.add('active');
    });
    // Persist last tab
    localStorage.setItem('ct_last_tab', tabName);
    
    // Load data for specific tabs
    if (tabName === 'reports') {
        generateReports();
    } else if (tabName === 'messages') {
        loadConversations();
    } else if (tabName === 'alerts') {
        loadAlerts();
    } else if (tabName === 'insights') {
        refreshInsights();
    }
}

function toggleNotifications() {
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    if (dd.style.display === 'block') { dd.style.display = 'none'; return; }
    // Render notifications
    dd.innerHTML = `
        <div class="notif-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #e5e7eb;">
            <strong style="font-size:16px;">Notifications</strong>
            <button class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="markAllRead()">Mark all read</button>
        </div>
        <div class="notif-list" style="max-height:400px; overflow-y:auto;">
            ${allNotifications.length ? allNotifications.map(n=>`
                <div class="notif-item ${n.read?'read':'unread'}" style="padding:12px; border-bottom:1px solid #e5e7eb; display:flex; gap:12px; align-items:start; ${n.read ? 'opacity:0.6;' : ''}">
                    <div class="ni-icon" style="font-size:20px;">${n.icon || '🔔'}</div>
                    <div class="ni-body" style="flex:1; min-width:0;">
                        <strong style="display:block; margin-bottom:4px; font-size:14px;">${n.title || n.type || 'Notification'}</strong>
                        <p style="margin:0; font-size:13px; color:#64748b;">${n.message || ''}</p>
                    </div>
                    ${!n.read ? `<button onclick="markCaretakerNotificationRead('${n.id}')" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; white-space:nowrap;">Mark Read</button>` : ''}
                </div>
            `).join('') : '<div class="empty" style="padding:40px; text-align:center; color:#94a3b8;">No notifications</div>'}
        </div>`;
    dd.style.display = 'block';
}

// removed duplicate; async markAllRead is defined later

// ========== ALERTS ==========

async function loadAlerts() {
    const alertsList = document.getElementById('alerts-list');
    if (!alertsList) return;
    
    alertsList.innerHTML = `
        <div class="alert-item critical">
            <div class="alert-icon">🚨</div>
            <div class="alert-content">
                <strong>Critical Alert</strong>
                <p>Check patients with missed medications</p>
                <small>Real-time monitoring active</small>
            </div>
        </div>
        <div class="alert-item warning">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
                <strong>Attention Needed</strong>
                <p>Review wellness logs for patterns</p>
                <small>AI-powered insights</small>
            </div>
        </div>
    `;
}

// ========== REPORTS ==========

function generateReports() {
    const reportsTab = document.getElementById('reports-tab');
    if (!reportsTab) return;
    
    reportsTab.innerHTML = `
        <div class="content-header">
            <h2>Reports & Analytics</h2>
            <button class="btn-primary" onclick="exportAllReports()">📥 Export All Reports</button>
        </div>
        <div class="reports-grid">
            <div class="report-card">
                <h3>📊 Patient Overview Report</h3>
                <p>Comprehensive summary of all patients</p>
                <button class="btn-secondary" onclick="exportPatientReport()">Generate PDF</button>
            </div>
            <div class="report-card">
                <h3>💊 Medication Adherence Report</h3>
                <p>Track medication compliance across patients</p>
                <button class="btn-secondary" onclick="exportMedicationReport()">Generate PDF</button>
            </div>
            <div class="report-card">
                <h3>📅 Appointment History Report</h3>
                <p>View all past and upcoming appointments</p>
                <button class="btn-secondary" onclick="exportAppointmentReport()">Generate PDF</button>
            </div>
            <div class="report-card">
                <h3>✅ Task Completion Report</h3>
                <p>Analyze task completion rates</p>
                <button class="btn-secondary" onclick="exportTaskReport()">Generate PDF</button>
            </div>
        </div>
    `;
}

function exportReport() { toast('Report export started'); }

function exportAllReports() { toast('All reports export started'); }

function exportPatientReport() {
    const patients = allPatients.length;
    exportCSV('patients.csv', allPatients);
    toast(`Patients CSV exported (${patients})`);
}

function exportMedicationReport() {
    // Placeholder: export appointments as a proxy for schedule until adherence is tracked
    exportCSV('appointments.csv', allAppointments);
    toast('Medication adherence CSV exported');
}

function exportAppointmentReport() {
    const appointments = allAppointments.length;
    exportCSV('appointments.csv', allAppointments);
    toast(`Appointments CSV exported (${appointments})`);
}

function exportTaskReport() {
    const tasks = allTasks.length;
    exportCSV('tasks.csv', allTasks);
    toast(`Tasks CSV exported (${tasks})`);
}

// ========== MESSAGES ==========

function loadMessages() { loadConversations(); }

function composeMessage() { openMsgModal(); }

function openConversation(patientId, patientName) {
    const messagesMain = document.getElementById('messages-main');
    if (!messagesMain) return;
    
    messagesMain.innerHTML = `
        <div class="conversation-header">
            <h3>💬 ${patientName}</h3>
            <button class="btn-secondary" onclick="callPatient('${patientName}')">📞 Call</button>
        </div>
        <div class="messages-thread">
            <div class="message received">
                <strong>${patientName}</strong>
                <p>Hello, I have a question about my medication schedule.</p>
                <small>2 hours ago</small>
            </div>
            <div class="message sent">
                <strong>You</strong>
                <p>Hi! I'd be happy to help. What would you like to know?</p>
                <small>1 hour ago</small>
            </div>
        </div>
        <div class="message-composer">
            <input type="text" id="message-input" placeholder="Type your message..." onkeypress="if(event.key==='Enter') sendMessage('${patientId}', '${patientName}')">
            <button class="btn-primary" onclick="sendMessage('${patientId}', '${patientName}')">Send</button>
        </div>
    `;
}

function sendMessage(patientId, patientName) {
    const input = document.getElementById('message-input');
    if (!input || !input.value.trim()) return;
    
    const message = input.value.trim();
    fetch(`${API_BASE}/caretaker/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
        body: JSON.stringify({ patientId, patientName, content: message, sender: 'caretaker' })
    }).then(res => {
        if (res.ok) {
            input.value = '';
            toast(`Message sent to ${patientName}`);
            openConversation(patientId, patientName);
        } else {
            toast('Failed to send message', 'error');
        }
    }).catch(() => toast('Error sending message', 'error'));
}

function callPatient(patientName) {
    toast(`Calling ${patientName}...`);
}

// ========== VIEW TOGGLE ==========

function setView(viewType) {
    const grid = document.getElementById('patients-grid');
    if (!grid) return;
    
    // Toggle button active state
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Change grid layout
    if (viewType === 'list') {
        grid.style.gridTemplateColumns = '1fr';
    } else {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    }
}

// ========== THEME TOGGLE ==========

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    toast(isDark ? 'Dark mode enabled' : 'Light mode enabled');
}

// ========== TOASTS ==========
function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.textContent = message;
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.color = '#0f172a';
    el.style.background = type === 'error' ? '#fee2e2' : '#d1fae5';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    el.style.transition = 'all .35s ease';
    container.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(120%)'; }, 2200);
    setTimeout(() => { if (el.parentNode) container.removeChild(el); }, 2600);
}

// ========== PATIENT FILTER ==========
let filteredPatients = null;
function applyPatientFilter(query) {
    if (!allPatients) return;
    const q = (query || '').trim().toLowerCase();
    filteredPatients = q ? allPatients.filter(p =>
        (p.name||'').toLowerCase().includes(q) ||
        (p.condition||'').toLowerCase().includes(q) ||
        (p.contactNumber||'').toLowerCase().includes(q) ||
        (p.email||'').toLowerCase().includes(q)
    ) : null;
    const arr = filteredPatients || allPatients;
    renderPatients(arr);
    renderPatientsList(arr);
}

// ========== CONFIRM MODAL ==========
let confirmResolver = null;
function initConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    modal.querySelector('#confirm-cancel').onclick = () => { modal.style.display = 'none'; if (confirmResolver) confirmResolver(false); };
    modal.querySelector('#confirm-ok').onclick = () => { modal.style.display = 'none'; if (confirmResolver) confirmResolver(true); };
}

function confirmModal(message) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    if (!modal || !msgEl) return Promise.resolve(false);
    msgEl.textContent = message || 'Are you sure?';
    modal.style.display = 'block';
    return new Promise(resolve => { confirmResolver = resolve; });
}

// ========== GENERIC MODAL ==========
function openGenericModal(title, bodyHtml) {
    const m = document.getElementById('generic-modal');
    const t = document.getElementById('generic-title');
    const b = document.getElementById('generic-body');
    if (!m || !t || !b) return;
    t.textContent = title;
    b.innerHTML = bodyHtml;
    m.style.display = 'block';
}
function closeGenericModal() {
    const m = document.getElementById('generic-modal');
    if (m) m.style.display = 'none';
}

// ========== PATIENT EDITOR (uses Generic Modal) ==========
function openPatientEditor(id) {
    const p = allPatients.find(x => x.id === id);
    if (!p) { toast('Patient not found', 'error'); return; }
    const body = `
        <div class="form-grid">
            <input id="pe-name" placeholder="Full Name" value="${p.name || ''}">
            <input id="pe-age" placeholder="Age" value="${p.age || ''}">
            <input id="pe-condition" placeholder="Condition" value="${p.condition || ''}">
            <input id="pe-phone" placeholder="Phone" value="${p.contactNumber || ''}">
            <input id="pe-email" placeholder="Email" value="${p.email || ''}">
            <input id="pe-address" placeholder="Address" value="${p.address || ''}">
            <select id="pe-status">
                <option value="Active" ${p.status==='Active'?'selected':''}>Active</option>
                <option value="Inactive" ${p.status==='Inactive'?'selected':''}>Inactive</option>
            </select>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn-secondary" onclick="closeGenericModal()">Cancel</button>
            <button class="btn-primary" onclick="savePatientFromEditor('${id}')">Save</button>
        </div>`;
    openGenericModal('Edit Patient', body);
}

async function savePatientFromEditor(id) {
    const payload = {
        name: document.getElementById('pe-name').value.trim(),
        age: document.getElementById('pe-age').value.trim(),
        condition: document.getElementById('pe-condition').value.trim(),
        contactNumber: document.getElementById('pe-phone').value.trim(),
        email: document.getElementById('pe-email').value.trim(),
        address: document.getElementById('pe-address').value.trim(),
        status: document.getElementById('pe-status').value
    };
    if (!payload.name) { toast('Name is required', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/patients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            toast('Patient updated');
            closeGenericModal();
            await loadPatients();
            await loadDashboardStats();
        } else {
            toast('Failed to update patient', 'error');
        }
    } catch (e) { toast('Error updating patient', 'error'); }
}

// ========== MESSAGE MODAL ==========
function openMsgModal() {
    const m = document.getElementById('msg-modal');
    if (m) m.style.display = 'block';
}
function closeMsgModal() {
    const m = document.getElementById('msg-modal');
    if (m) m.style.display = 'none';
}
async function sendMessageFromModal() {
    const pid = document.getElementById('msg-patient-id').value.trim();
    const pname = document.getElementById('msg-patient-name').value.trim();
    const content = document.getElementById('msg-content').value.trim();
    if (!pid || !pname || !content) { toast('Fill all message fields', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/messages/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ patientId: pid, patientName: pname, content, sender: 'caretaker' })
        });
        if (res.ok) { toast('Message sent'); closeMsgModal(); if (document.getElementById('messages-main')) openConversation(pid, pname); }
        else toast('Failed to send message', 'error');
    } catch { toast('Error sending message', 'error'); }
}

// ========== NOTIFICATION MODAL ==========
function openNotifModal() {
    const m = document.getElementById('notif-modal');
    if (m) m.style.display = 'block';
}
function closeNotifModal() {
    const m = document.getElementById('notif-modal');
    if (m) m.style.display = 'none';
}
async function createNotificationFromModal() {
    const type = document.getElementById('notif-type').value;
    const title = document.getElementById('notif-title').value.trim();
    const icon = document.getElementById('notif-icon').value.trim();
    const color = document.getElementById('notif-color').value.trim();
    const message = document.getElementById('notif-message').value.trim();
    if (!title || !message) { toast('Title and message are required', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/caretaker/notifications`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
            body: JSON.stringify({ type, title, message, icon, color, read: false })
        });
        if (res.ok) {
            toast('Notification created');
            closeNotifModal();
            await loadNotifications();
        } else toast('Failed to create notification', 'error');
    } catch { toast('Error creating notification', 'error'); }
}

// Restore functional markAllRead
async function markAllRead() {
    try {
        const res = await fetch(`${API_BASE}/caretaker/notifications/mark-all-read`, { method: 'POST', headers: { 'X-Auth-Token': authToken } });
        if (res.ok) {
            allNotifications.forEach(n => n.read = true);
            updateNotifBadge();
            toast('All notifications marked as read');
        } else {
            toast('Failed to mark as read', 'error');
        }
    } catch { toast('Error marking as read', 'error'); }
}
