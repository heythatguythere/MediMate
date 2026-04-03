package com.medimate.controller;

import com.medimate.model.Notification;
import com.medimate.model.Patient;
import com.medimate.model.User;
import com.medimate.repo.NotificationRepository;
import com.medimate.repo.PatientRepository;
import com.medimate.repo.UserRepository;
import com.medimate.service.GroqService;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/elderly/chat")
@CrossOrigin(origins = "*")
public class ElderlyChatController {
    private static final Logger log = LoggerFactory.getLogger(ElderlyChatController.class);
    private final TokenService tokenService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final NotificationRepository notificationRepository;
    private final GroqService groqService;

    public ElderlyChatController(TokenService tokenService,
                                  UserRepository userRepository,
                                  PatientRepository patientRepository,
                                  NotificationRepository notificationRepository,
                                  GroqService groqService) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.notificationRepository = notificationRepository;
        this.groqService = groqService;
    }

    /**
     * Voice transcript -> Groq translation -> create notification for the caregiver.
     */
    @PostMapping("/translate-to-caregiver")
    public ResponseEntity<?> translateToCaregiver(@RequestHeader("X-Auth-Token") String token,
                                                   @RequestBody Map<String, Object> payload) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        User elder = userRepository.findById(userId).orElse(null);
        if (elder == null) return ResponseEntity.status(404).build();

        String text = payload.get("text") == null ? null : String.valueOf(payload.get("text")).trim();
        String targetLanguage = payload.get("targetLanguage") == null ? "English" : String.valueOf(payload.get("targetLanguage")).trim();

        if (text == null || text.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "text is required"));
        }

        if (elder.getEmail() == null || elder.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User email not found; patient mapping is required."));
        }

        List<Patient> matches = patientRepository.findByEmailIgnoreCase(elder.getEmail());
        if (matches == null || matches.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "No patient record found for this user."));
        }

        Patient patient = matches.get(0);
        if (patient.getCaretakerId() == null || patient.getCaretakerId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No caregiver assigned to this patient yet."));
        }

        try {
            String translated = groqService.translateMessage(text, targetLanguage);

            Notification n = new Notification();
            n.setId(null);
            n.setUserId(patient.getCaretakerId());
            n.setType("MESSAGE");
            n.setTitle("New voice message");
            n.setMessage(translated);
            n.setIcon("🎙️");
            n.setColor("#3b82f6");
            n.setCreatedAt(LocalDateTime.now());
            n.setRead(false);
            notificationRepository.save(n);

            return ResponseEntity.ok(Map.of(
                    "translated", translated
            ));
        } catch (Exception e) {
            log.error("translateToCaregiver failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Translation is temporarily unavailable. Please try again."));
        }
    }
}

