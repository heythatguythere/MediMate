package com.medimate.controller;

import com.medimate.model.Medication;
import com.medimate.model.DoseEvent;
import com.medimate.model.User;
import com.medimate.repo.MedicationRepository;
import com.medimate.repo.UserRepository;
import com.medimate.repo.DoseEventRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/caretaker/medications")
@CrossOrigin(origins = "*")
public class CaretakerMedicationController {
    private final TokenService tokenService;
    private final MedicationRepository medicationRepository;
    private final UserRepository userRepository;
    private final DoseEventRepository doseRepo;

    public CaretakerMedicationController(TokenService tokenService,
                                         MedicationRepository medicationRepository,
                                         UserRepository userRepository,
                                         DoseEventRepository doseRepo) {
        this.tokenService = tokenService;
        this.medicationRepository = medicationRepository;
        this.userRepository = userRepository;
        this.doseRepo = doseRepo;
    }

    @PostMapping("/assign")
    public ResponseEntity<?> assign(@RequestHeader("X-Auth-Token") String token,
                                    @RequestBody Map<String, String> body) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        String patientEmail = body.getOrDefault("patientEmail", "");
        String name = body.getOrDefault("name", "");
        String dosage = body.getOrDefault("dosage", "");
        String schedule = body.getOrDefault("schedule", "");
        if (patientEmail.isBlank() || name.isBlank() || dosage.isBlank() || schedule.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error","patientEmail, name, dosage, schedule are required"));
        }
        User elder = userRepository.findByEmail(patientEmail).orElse(null);
        if (elder == null) return ResponseEntity.status(404).body(Map.of("error","Elder user not found"));
        Medication m = new Medication();
        m.setId(null);
        m.setUserId(elder.getId());
        m.setName(name);
        m.setDosage(dosage);
        m.setSchedule(schedule);
        Medication saved = medicationRepository.save(m);
        // Seed today's dose events from schedule times (HH:mm, comma-separated)
        try {
            java.time.LocalDate today = java.time.LocalDate.now();
            for (String t : schedule.split(",")) {
                String tt = t.trim();
                if (tt.isEmpty()) continue;
                java.time.LocalTime lt = java.time.LocalTime.parse(tt);
                DoseEvent de = new DoseEvent();
                de.setUserId(elder.getId());
                de.setMedName(name);
                de.setDosage(dosage);
                de.setDueAt(java.time.LocalDateTime.of(today, lt));
                de.setStatus("PENDING");
                de.setUpdatedAt(java.time.LocalDateTime.now());
                doseRepo.save(de);
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("X-Auth-Token") String token,
                                  @RequestParam(value = "patientEmail", required = false) String patientEmail) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        if (patientEmail == null || patientEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "patientEmail is required"));
        }
        User elder = userRepository.findByEmail(patientEmail).orElse(null);
        if (elder == null) return ResponseEntity.status(404).body(Map.of("error","Elder user not found"));
        return ResponseEntity.ok(medicationRepository.findByUserId(elder.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@RequestHeader("X-Auth-Token") String token,
                                    @PathVariable("id") String id) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        return medicationRepository.findById(id)
                .map(m -> { medicationRepository.delete(m); return ResponseEntity.noContent().build(); })
                .orElse(ResponseEntity.status(404).build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@RequestHeader("X-Auth-Token") String token,
                                    @PathVariable("id") String id,
                                    @RequestBody Map<String, String> body) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        return medicationRepository.findById(id)
                .map(m -> {
                    if (body.containsKey("name")) m.setName(body.get("name"));
                    if (body.containsKey("dosage")) m.setDosage(body.get("dosage"));
                    if (body.containsKey("schedule")) m.setSchedule(body.get("schedule"));
                    return ResponseEntity.ok(medicationRepository.save(m));
                })
                .orElse(ResponseEntity.status(404).build());
    }
}
