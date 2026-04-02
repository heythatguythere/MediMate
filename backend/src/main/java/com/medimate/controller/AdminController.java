package com.medimate.controller;

import com.medimate.model.Appointment;
import com.medimate.model.User;
import com.medimate.repo.AppointmentRepository;
import com.medimate.repo.MedicationLogRepository;
import com.medimate.repo.MedicationRepository;
import com.medimate.repo.PatientRepository;
import com.medimate.repo.UserRepository;
import com.medimate.service.AuthService;
import com.medimate.service.DailyDoseGenerator;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository medicationLogRepository;
    private final PatientRepository patientRepository;
    private final TokenService tokenService;
    private final AuthService authService;
    private final DailyDoseGenerator doseGenerator;

    public AdminController(UserRepository userRepository,
                           AppointmentRepository appointmentRepository,
                           MedicationRepository medicationRepository,
                           MedicationLogRepository medicationLogRepository,
                           PatientRepository patientRepository,
                           TokenService tokenService,
                           AuthService authService,
                           DailyDoseGenerator doseGenerator) {
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicationRepository = medicationRepository;
        this.medicationLogRepository = medicationLogRepository;
        this.patientRepository = patientRepository;
        this.tokenService = tokenService;
        this.authService = authService;
        this.doseGenerator = doseGenerator;
    }

    private ResponseEntity<?> requireAdmin(String token) {
        String userId = tokenService.validate(token);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired token"));
        }
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty() || user.get().getRole() == null || !"admin".equalsIgnoreCase(user.get().getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }
        return null;
    }

    // Get Dashboard Statistics
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus("Active");
        long elderlyUsers = userRepository.countByRole("Elderly User");
        long caretakers = userRepository.countByRole("Caregiver");
        long appointments = appointmentRepository.count();
        long medications = medicationRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("activeUsers", activeUsers);
        stats.put("elderlyUsers", elderlyUsers);
        stats.put("caretakers", caretakers);
        stats.put("appointments", appointments);
        stats.put("medications", medications);

        return ResponseEntity.ok(stats);
    }

    // Get All Users
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestHeader("X-Auth-Token") String token,
                                        @RequestBody Map<String, String> body) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        String username = body.get("username");
        String password = body.get("password");
        String fullName = body.get("fullName");
        String email = body.get("email");
        String role = body.getOrDefault("role", "Elderly User");

        if (username == null || username.isBlank() || password == null || password.isBlank()
                || email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "username, password, and email are required"));
        }

        try {
            User created = authService.register(username.trim(), password, fullName, email.trim(), role);
            return ResponseEntity.ok(Map.of("message", "User created", "user", created));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // Get Users by Role
    @GetMapping("/users/role/{role}")
    public ResponseEntity<?> getUsersByRole(@RequestHeader("X-Auth-Token") String token, @PathVariable String role) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        List<User> users = userRepository.findByRole(role);
        return ResponseEntity.ok(users);
    }

    // Get Users by Status
    @GetMapping("/users/status/{status}")
    public ResponseEntity<?> getUsersByStatus(@RequestHeader("X-Auth-Token") String token, @PathVariable String status) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        List<User> users = userRepository.findByStatus(status);
        return ResponseEntity.ok(users);
    }

    // Update User
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@RequestHeader("X-Auth-Token") String token, 
                                       @PathVariable String id, 
                                       @RequestBody Map<String, String> updates) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        return userRepository.findById(id)
            .map(user -> {
                if (updates.containsKey("fullName")) user.setFullName(updates.get("fullName"));
                if (updates.containsKey("email")) user.setEmail(updates.get("email"));
                if (updates.containsKey("role")) user.setRole(updates.get("role"));
                if (updates.containsKey("status")) user.setStatus(updates.get("status"));
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "User updated successfully", "user", user));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Delete User
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@RequestHeader("X-Auth-Token") String token, @PathVariable String id) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }

    // Get Caretakers
    @GetMapping("/caretakers")
    public ResponseEntity<?> getCaretakers(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        List<User> caretakers = userRepository.findByRole("Caregiver");
        return ResponseEntity.ok(caretakers);
    }

    /** Caregivers with assigned patient counts (for admin dashboard). */
    @GetMapping("/caretakers/summary")
    public ResponseEntity<?> getCaretakersSummary(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        List<User> caretakers = userRepository.findByRole("Caregiver");
        List<Map<String, Object>> rows = new ArrayList<>();
        for (User c : caretakers) {
            long patientCount = patientRepository.countByCaretakerId(c.getId());
            Map<String, Object> row = new HashMap<>();
            row.put("id", c.getId());
            row.put("fullName", c.getFullName());
            row.put("username", c.getUsername());
            row.put("email", c.getEmail());
            row.put("status", c.getStatus());
            row.put("patientCount", patientCount);
            rows.add(row);
        }
        return ResponseEntity.ok(rows);
    }

    @DeleteMapping("/medications/{id}")
    public ResponseEntity<?> deleteMedication(@RequestHeader("X-Auth-Token") String token,
                                              @PathVariable String id) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        return medicationRepository.findById(id)
                .map(m -> {
                    medicationRepository.delete(m);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Admin: update a medication record (name/dosage/schedule/active). */
    @PutMapping("/medications/{id}")
    public ResponseEntity<?> updateMedication(@RequestHeader("X-Auth-Token") String token,
                                                @PathVariable String id,
                                                @RequestBody Map<String, Object> updates) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        return medicationRepository.findById(id)
                .map(m -> {
                    if (updates.containsKey("name")) {
                        Object v = updates.get("name");
                        if (v != null) m.setName(String.valueOf(v).trim());
                    }
                    if (updates.containsKey("dosage")) {
                        Object v = updates.get("dosage");
                        if (v != null) m.setDosage(String.valueOf(v).trim());
                    }
                    if (updates.containsKey("schedule")) {
                        Object v = updates.get("schedule");
                        if (v != null) m.setSchedule(String.valueOf(v).trim());
                    }
                    if (updates.containsKey("active")) {
                        Object v = updates.get("active");
                        if (v != null) m.setActive(Boolean.parseBoolean(String.valueOf(v)));
                    }
                    return ResponseEntity.ok(medicationRepository.save(m));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Create an appointment for a caregiver (admin). */
    @PostMapping("/appointments")
    public ResponseEntity<?> createAppointment(@RequestHeader("X-Auth-Token") String token,
                                               @RequestBody Map<String, String> body) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        String caretakerId = body.get("caretakerId");
        String patientName = body.get("patientName");
        String date = body.get("date");
        String time = body.get("time");
        if (caretakerId == null || caretakerId.isBlank() || patientName == null || patientName.isBlank()
                || date == null || date.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "caretakerId, patientName, and date are required"));
        }
        Optional<User> caretakerOpt = userRepository.findById(caretakerId.trim())
                .filter(u -> "Caregiver".equals(u.getRole()));
        if (caretakerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid caretaker id"));
        }
        User cg = caretakerOpt.get();
        Appointment a = new Appointment();
        a.setCaretakerId(cg.getId());
        a.setPatientName(patientName.trim());
        a.setDate(date.trim());
        a.setTime(time != null ? time.trim() : "");
        a.setType(body.getOrDefault("type", "Checkup"));
        a.setStatus(body.getOrDefault("status", "Scheduled"));
        a.setNotes(body.get("notes"));
        Appointment saved = appointmentRepository.save(a);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/appointments")
    public ResponseEntity<?> getAppointments(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;
        return ResponseEntity.ok(appointmentRepository.findAll());
    }

    /** Admin: update an appointment (patientName/date/time/type/status/notes). */
    @PutMapping("/appointments/{id}")
    public ResponseEntity<?> updateAppointment(@RequestHeader("X-Auth-Token") String token,
                                               @PathVariable String id,
                                               @RequestBody Map<String, String> updates) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        return appointmentRepository.findById(id)
                .map(a -> {
                    if (updates.containsKey("patientName")) a.setPatientName(updates.get("patientName"));
                    if (updates.containsKey("date")) a.setDate(updates.get("date"));
                    if (updates.containsKey("time")) a.setTime(updates.get("time"));
                    if (updates.containsKey("type")) a.setType(updates.get("type"));
                    if (updates.containsKey("status")) a.setStatus(updates.get("status"));
                    if (updates.containsKey("notes")) a.setNotes(updates.get("notes"));
                    return ResponseEntity.ok(appointmentRepository.save(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Admin: delete appointment by id. */
    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<?> deleteAppointment(@RequestHeader("X-Auth-Token") String token,
                                               @PathVariable String id) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        return appointmentRepository.findById(id)
                .map(a -> {
                    appointmentRepository.delete(a);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/medications")
    public ResponseEntity<?> getMedications(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        Map<String, User> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<Map<String, Object>> meds = medicationRepository.findAll().stream().map(med -> {
            User owner = usersById.get(med.getUserId());
            long logs = medicationLogRepository.findByUserId(med.getUserId()).stream()
                    .filter(log -> med.getId().equals(log.getMedicationId()))
                    .count();
            long taken = medicationLogRepository.findByUserIdAndStatus(med.getUserId(), "TAKEN").stream()
                    .filter(log -> med.getId().equals(log.getMedicationId()))
                    .count();
            int adherence = logs == 0 ? 0 : (int) Math.round((taken * 100.0) / logs);

            return Map.<String, Object>of(
                    "id", med.getId(),
                    "medication", med.getName() != null ? med.getName() : "Unknown",
                    "patient", owner != null ? (owner.getFullName() != null ? owner.getFullName() : owner.getUsername()) : "Unknown",
                    "dosage", med.getDosage() != null ? med.getDosage() : "",
                    "schedule", med.getSchedule() != null ? med.getSchedule() : "",
                    "adherence", adherence
            );
        }).toList();

        return ResponseEntity.ok(meds);
    }

    // Get Activity Log
    @GetMapping("/activity")
    public ResponseEntity<?> getActivity(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        List<Map<String, String>> activity = userRepository.findAll().stream()
                .sorted((a, b) -> String.valueOf(b.getJoinedDate()).compareTo(String.valueOf(a.getJoinedDate())))
                .limit(5)
                .map(u -> Map.of(
                        "action", "New user registered",
                        "user", u.getFullName() != null ? u.getFullName() : u.getUsername(),
                        "time", u.getJoinedDate() != null ? u.getJoinedDate() : "Recently",
                        "status", u.getStatus() != null ? u.getStatus() : "Active"
                )).collect(Collectors.toList());
        return ResponseEntity.ok(activity);
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getReports(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus("Active");
        long totalMeds = medicationRepository.count();
        long activeMeds = medicationRepository.countByActiveTrue();
        long takenLogs = medicationLogRepository.countByStatus("TAKEN");
        long pendingLogs = medicationLogRepository.countByStatus("PENDING");
        long missedLogs = medicationLogRepository.countByStatus("MISSED");
        long totalLogs = takenLogs + pendingLogs + missedLogs;
        int adherenceRate = totalLogs == 0 ? 0 : (int) Math.round((takenLogs * 100.0) / totalLogs);

        return ResponseEntity.ok(Map.of(
                "generatedAt", LocalDateTime.now().toString(),
                "users", Map.of("total", totalUsers, "active", activeUsers),
                "medications", Map.of("total", totalMeds, "active", activeMeds),
                "adherence", Map.of("rate", adherenceRate, "taken", takenLogs, "pending", pendingLogs, "missed", missedLogs),
                "appointments", Map.of("total", appointmentRepository.count())
        ));
    }
    
    // Manually trigger dose generation for today
    @PostMapping("/generate-doses")
    public ResponseEntity<?> generateDoses(@RequestHeader("X-Auth-Token") String token) {
        ResponseEntity<?> authErr = requireAdmin(token);
        if (authErr != null) return authErr;
        
        try {
            doseGenerator.generateDosesForDate(LocalDate.now());
            return ResponseEntity.ok(Map.of("message", "Doses generated successfully for today"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
