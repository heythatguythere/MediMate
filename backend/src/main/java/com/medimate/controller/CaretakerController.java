package com.medimate.controller;

import com.medimate.model.*;
import com.medimate.repo.*;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/caretaker")
@CrossOrigin(origins = "*")
public class CaretakerController {
    private final TokenService tokenService;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public CaretakerController(TokenService tokenService, PatientRepository patientRepository,
                              AppointmentRepository appointmentRepository, TaskRepository taskRepository,
                              UserRepository userRepository) {
        this.tokenService = tokenService;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    // Dashboard Stats
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        long totalPatients = patientRepository.countByCaretakerId(userId);
        long activePatients = patientRepository.countByCaretakerIdAndStatus(userId, "Active");
        long todayAppointments = appointmentRepository.countByCaretakerIdAndDate(userId, LocalDate.now().toString());
        long pendingTasks = taskRepository.countByCaretakerIdAndStatus(userId, "Pending");

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPatients", totalPatients);
        stats.put("activePatients", activePatients);
        stats.put("todayAppointments", todayAppointments);
        stats.put("pendingTasks", pendingTasks);

        return ResponseEntity.ok(stats);
    }

    // ========== PATIENTS ==========
    
    @GetMapping("/patients")
    public ResponseEntity<?> getAllPatients(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<Patient> patients = patientRepository.findByCaretakerId(userId);
        return ResponseEntity.ok(patients);
    }

    @GetMapping("/patients/{id}")
    public ResponseEntity<?> getPatient(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return patientRepository.findById(id)
            .filter(p -> p.getCaretakerId().equals(userId))
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/patients")
    public ResponseEntity<?> addPatient(@RequestHeader("X-Auth-Token") String token, @RequestBody Patient patient) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        patient.setId(null);
        patient.setCaretakerId(userId);
        if (patient.getStatus() == null) patient.setStatus("Active");
        if (patient.getLastCheckup() == null) patient.setLastCheckup(LocalDate.now().toString());
        
        Patient saved = patientRepository.save(patient);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/patients/{id}")
    public ResponseEntity<?> updatePatient(@RequestHeader("X-Auth-Token") String token, 
                                          @PathVariable("id") String id, 
                                          @RequestBody Patient updatedPatient) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return patientRepository.findById(id)
            .filter(p -> p.getCaretakerId().equals(userId))
            .map(patient -> {
                if (updatedPatient.getName() != null) patient.setName(updatedPatient.getName());
                if (updatedPatient.getAge() != null) patient.setAge(updatedPatient.getAge());
                if (updatedPatient.getCondition() != null) patient.setCondition(updatedPatient.getCondition());
                if (updatedPatient.getStatus() != null) patient.setStatus(updatedPatient.getStatus());
                if (updatedPatient.getContactNumber() != null) patient.setContactNumber(updatedPatient.getContactNumber());
                if (updatedPatient.getAddress() != null) patient.setAddress(updatedPatient.getAddress());
                if (updatedPatient.getEmergencyContact() != null) patient.setEmergencyContact(updatedPatient.getEmergencyContact());
                if (updatedPatient.getBloodGroup() != null) patient.setBloodGroup(updatedPatient.getBloodGroup());
                if (updatedPatient.getAllergies() != null) patient.setAllergies(updatedPatient.getAllergies());
                if (updatedPatient.getNotes() != null) patient.setNotes(updatedPatient.getNotes());
                if (updatedPatient.getNextAppointment() != null) patient.setNextAppointment(updatedPatient.getNextAppointment());
                
                patientRepository.save(patient);
                return ResponseEntity.ok(patient);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/patients/{id}")
    public ResponseEntity<?> deletePatient(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return patientRepository.findById(id)
            .filter(p -> p.getCaretakerId().equals(userId))
            .map(patient -> {
                patientRepository.delete(patient);
                return ResponseEntity.ok(Map.of("message", "Patient deleted successfully"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ========== APPOINTMENTS ==========
    
    @GetMapping("/appointments")
    public ResponseEntity<?> getAllAppointments(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<Appointment> appointments = appointmentRepository.findByCaretakerId(userId);
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/appointments/today")
    public ResponseEntity<?> getTodayAppointments(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        String today = LocalDate.now().toString();
        List<Appointment> appointments = appointmentRepository.findByCaretakerIdAndDate(userId, today);
        return ResponseEntity.ok(appointments);
    }

    @PostMapping("/appointments")
    public ResponseEntity<?> addAppointment(@RequestHeader("X-Auth-Token") String token, @RequestBody Appointment appointment) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        appointment.setId(null);
        appointment.setCaretakerId(userId);
        if (appointment.getStatus() == null) appointment.setStatus("Scheduled");
        
        Appointment saved = appointmentRepository.save(appointment);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/appointments/{id}")
    public ResponseEntity<?> updateAppointment(@RequestHeader("X-Auth-Token") String token,
                                              @PathVariable("id") String id,
                                              @RequestBody Appointment updatedAppointment) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return appointmentRepository.findById(id)
            .filter(a -> a.getCaretakerId().equals(userId))
            .map(appointment -> {
                if (updatedAppointment.getPatientName() != null) appointment.setPatientName(updatedAppointment.getPatientName());
                if (updatedAppointment.getDate() != null) appointment.setDate(updatedAppointment.getDate());
                if (updatedAppointment.getTime() != null) appointment.setTime(updatedAppointment.getTime());
                if (updatedAppointment.getType() != null) appointment.setType(updatedAppointment.getType());
                if (updatedAppointment.getStatus() != null) appointment.setStatus(updatedAppointment.getStatus());
                if (updatedAppointment.getNotes() != null) appointment.setNotes(updatedAppointment.getNotes());
                
                appointmentRepository.save(appointment);
                return ResponseEntity.ok(appointment);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<?> deleteAppointment(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return appointmentRepository.findById(id)
            .filter(a -> a.getCaretakerId().equals(userId))
            .map(appointment -> {
                appointmentRepository.delete(appointment);
                return ResponseEntity.ok(Map.of("message", "Appointment deleted successfully"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ========== TASKS ==========
    
    @GetMapping("/tasks")
    public ResponseEntity<?> getAllTasks(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<Task> tasks = taskRepository.findByCaretakerId(userId);
        return ResponseEntity.ok(tasks);
    }

    @PostMapping("/tasks")
    public ResponseEntity<?> addTask(@RequestHeader("X-Auth-Token") String token, @RequestBody Task task) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        task.setId(null);
        task.setCaretakerId(userId);
        if (task.getStatus() == null) task.setStatus("Pending");
        if (task.getCreatedAt() == null) task.setCreatedAt(LocalDateTime.now().toString());
        
        Task saved = taskRepository.save(task);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/tasks/{id}")
    public ResponseEntity<?> updateTask(@RequestHeader("X-Auth-Token") String token,
                                       @PathVariable("id") String id,
                                       @RequestBody Task updatedTask) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return taskRepository.findById(id)
            .filter(t -> t.getCaretakerId().equals(userId))
            .map(task -> {
                if (updatedTask.getTitle() != null) task.setTitle(updatedTask.getTitle());
                if (updatedTask.getDescription() != null) task.setDescription(updatedTask.getDescription());
                if (updatedTask.getPriority() != null) task.setPriority(updatedTask.getPriority());
                if (updatedTask.getStatus() != null) task.setStatus(updatedTask.getStatus());
                if (updatedTask.getDueDate() != null) task.setDueDate(updatedTask.getDueDate());
                
                taskRepository.save(task);
                return ResponseEntity.ok(task);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<?> deleteTask(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return taskRepository.findById(id)
            .filter(t -> t.getCaretakerId().equals(userId))
            .map(task -> {
                taskRepository.delete(task);
                return ResponseEntity.ok(Map.of("message", "Task deleted successfully"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/tasks/{id}/complete")
    public ResponseEntity<?> completeTask(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return taskRepository.findById(id)
            .filter(t -> t.getCaretakerId().equals(userId))
            .map(task -> {
                task.setStatus("Completed");
                taskRepository.save(task);
                return ResponseEntity.ok(task);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
