package com.medimate.controller;

import com.medimate.model.Medication;
import com.medimate.repo.MedicationRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medications")
@CrossOrigin(origins = "*")
public class MedicationController {
    private final MedicationRepository medicationRepository;
    private final TokenService tokenService;

    public MedicationController(MedicationRepository medicationRepository, TokenService tokenService) {
        this.medicationRepository = medicationRepository;
        this.tokenService = tokenService;
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
        return ResponseEntity.ok(medicationRepository.save(med));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return medicationRepository.findById(id).filter(m -> m.getUserId().equals(userId))
                .map(m -> { medicationRepository.delete(m); return ResponseEntity.noContent().build(); })
                .orElse(ResponseEntity.status(404).build());
    }
}
