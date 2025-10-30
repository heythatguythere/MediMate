package com.medimate.controller;

import com.medimate.model.DoseEvent;
import com.medimate.model.Patient;
import com.medimate.model.User;
import com.medimate.model.Notification;
import com.medimate.repo.DoseEventRepository;
import com.medimate.repo.PatientRepository;
import com.medimate.repo.UserRepository;
import com.medimate.repo.NotificationRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doses")
@CrossOrigin(origins = "*")
public class DoseController {
    private final TokenService tokenService;
    private final DoseEventRepository doseRepo;
    private final UserRepository userRepo;
    private final PatientRepository patientRepo;
    private final NotificationRepository notificationRepo;

    public DoseController(TokenService tokenService, DoseEventRepository doseRepo,
                          UserRepository userRepo, PatientRepository patientRepo,
                          NotificationRepository notificationRepo) {
        this.tokenService = tokenService;
        this.doseRepo = doseRepo;
        this.userRepo = userRepo;
        this.patientRepo = patientRepo;
        this.notificationRepo = notificationRepo;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        List<DoseEvent> events = doseRepo.findByUserIdOrderByDueAtDesc(userId);
        return ResponseEntity.ok(events);
    }

    @PostMapping("/{id}/taken")
    public ResponseEntity<?> markTaken(@RequestHeader("X-Auth-Token") String token,
                                       @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return doseRepo.findById(id)
                .filter(d -> d.getUserId().equals(userId))
                .map(d -> {
                    d.setStatus("TAKEN");
                    d.setUpdatedAt(LocalDateTime.now());
                    doseRepo.save(d);
                    return ResponseEntity.ok(Map.of("status","TAKEN"));
                })
                .orElse(ResponseEntity.status(404).build());
    }

    @PostMapping("/{id}/skip")
    public ResponseEntity<?> markSkipped(@RequestHeader("X-Auth-Token") String token,
                                         @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return doseRepo.findById(id)
                .filter(d -> d.getUserId().equals(userId))
                .map(d -> {
                    d.setStatus("SKIPPED");
                    d.setUpdatedAt(LocalDateTime.now());
                    doseRepo.save(d);
                    notifyCaretakerIfPossible(userId, d, "Dose skipped");
                    return ResponseEntity.ok(Map.of("status","SKIPPED"));
                })
                .orElse(ResponseEntity.status(404).build());
    }

    private void notifyCaretakerIfPossible(String elderUserId, DoseEvent d, String title) {
        // Find patient by elder email if possible
        User u = userRepo.findById(elderUserId).orElse(null);
        if (u == null || u.getEmail() == null) return;
        List<Patient> plist = patientRepo.findByEmailIgnoreCase(u.getEmail());
        if (plist.isEmpty()) return;
        Patient p = plist.get(0);
        if (p.getCaretakerId() == null) return;
        Notification n = new Notification();
        n.setUserId(p.getCaretakerId());
        n.setTitle(title);
        n.setMessage((d.getMedName()==null?"Medication":d.getMedName()) + " " + (d.getDosage()==null?"":d.getDosage()));
        n.setType("MEDICATION");
        n.setIcon("💊");
        n.setColor("#ef4444");
        n.setCreatedAt(LocalDateTime.now());
        n.setRead(false);
        notificationRepo.save(n);
    }
}
