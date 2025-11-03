package com.medimate.controller;

import com.medimate.model.Medication;
import com.medimate.model.MedicationLog;
import com.medimate.repo.MedicationLogRepository;
import com.medimate.repo.MedicationRepository;
import com.medimate.service.MedicationCheckService;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medications")
@CrossOrigin(origins = "*")
public class MedicationController {
    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository medicationLogRepository;
    private final TokenService tokenService;
    private final MedicationCheckService medicationCheckService;

    public MedicationController(MedicationRepository medicationRepository,
                                MedicationLogRepository medicationLogRepository,
                                TokenService tokenService,
                                MedicationCheckService medicationCheckService) {
        this.medicationRepository = medicationRepository;
        this.medicationLogRepository = medicationLogRepository;
        this.tokenService = tokenService;
        this.medicationCheckService = medicationCheckService;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        List<Medication> meds = medicationRepository.findByUserId(userId);
        return ResponseEntity.ok(meds);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader("X-Auth-Token") String token, @RequestBody Medication med) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        med.setId(null);
        med.setUserId(userId);
        Medication saved = medicationRepository.save(med);
        
        // Create medication logs for today's scheduled times
        medicationCheckService.createLogsForMedication(saved);
        
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return medicationRepository.findById(id).filter(m -> m.getUserId().equals(userId))
                .map(m -> { medicationRepository.delete(m); return ResponseEntity.noContent().build(); })
                .orElse(ResponseEntity.status(404).build());
    }
    
    @PostMapping("/{id}/take")
    public ResponseEntity<?> markAsTaken(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String medId) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        
        // Find the most recent pending log for this medication
        List<MedicationLog> logs = medicationLogRepository.findByUserIdAndStatus(userId, "PENDING");
        MedicationLog targetLog = logs.stream()
            .filter(log -> log.getMedicationId().equals(medId))
            .filter(log -> log.getScheduledTime().isBefore(LocalDateTime.now().plusMinutes(30))) // Within 30 mins of scheduled time
            .findFirst()
            .orElse(null);
        
        if (targetLog != null) {
            targetLog.setStatus("TAKEN");
            targetLog.setTakenTime(LocalDateTime.now());
            medicationLogRepository.save(targetLog);
            return ResponseEntity.ok(Map.of("success", true, "message", "Medication marked as taken"));
        }
        
        return ResponseEntity.ok(Map.of("success", false, "message", "No pending medication found"));
    }
}
