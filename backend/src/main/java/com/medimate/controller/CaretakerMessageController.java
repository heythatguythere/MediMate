package com.medimate.controller;

import com.medimate.model.Message;
import com.medimate.model.Notification;
import com.medimate.model.Patient;
import com.medimate.model.User;
import com.medimate.repo.MessageRepository;
import com.medimate.repo.NotificationRepository;
import com.medimate.repo.PatientRepository;
import com.medimate.repo.UserRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/caretaker/messages")
@CrossOrigin(origins = "*")
public class CaretakerMessageController {
    private final TokenService tokenService;
    private final MessageRepository repo;
    private final NotificationRepository notificationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    public CaretakerMessageController(TokenService tokenService, MessageRepository repo,
                                      NotificationRepository notificationRepository,
                                      PatientRepository patientRepository,
                                      UserRepository userRepository) {
        this.tokenService = tokenService;
        this.repo = repo;
        this.notificationRepository = notificationRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
    }

    // List conversations grouped by patient
    @GetMapping("/conversations")
    public ResponseEntity<?> conversations(@RequestHeader("X-Auth-Token") String token) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        List<Message> messages = repo.findByCaretakerIdOrderByCreatedAtDesc(caretakerId);
        Map<String, Message> latestByPatient = messages.stream()
                .collect(Collectors.toMap(
                        Message::getPatientId,
                        m -> m,
                        (m1, m2) -> m1.getCreatedAt().isAfter(m2.getCreatedAt()) ? m1 : m2
                ));
        List<Map<String, Object>> conversations = latestByPatient.values().stream()
                .map(m -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("patientId", m.getPatientId());
                    item.put("patientName", m.getPatientName());
                    item.put("lastMessage", m.getContent());
                    item.put("lastAt", m.getCreatedAt());
                    return item;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(conversations);
    }

    // Thread by patient
    @GetMapping("/thread")
    public ResponseEntity<?> thread(@RequestHeader("X-Auth-Token") String token, @RequestParam("patientId") String patientId) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        List<Message> messages = repo.findByCaretakerIdAndPatientIdOrderByCreatedAtAsc(caretakerId, patientId);
        return ResponseEntity.ok(messages);
    }

    // Send message
    @PostMapping("/send")
    public ResponseEntity<?> send(@RequestHeader("X-Auth-Token") String token, @RequestBody Message m) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        m.setId(null);
        m.setCaretakerId(caretakerId);
        if (m.getCreatedAt() == null) m.setCreatedAt(LocalDateTime.now());
        if (m.getSender() == null) m.setSender("caretaker");
        Message saved = repo.save(m);
        // Mirror to elder notifications if we can resolve elder user
        try {
            String patientId = m.getPatientId();
            if (patientId != null) {
                Patient p = patientRepository.findById(patientId).orElse(null);
                if (p != null) {
                    String elderUserId = null;
                    if (p.getEmail() != null && !p.getEmail().isBlank()) {
                        User u = userRepository.findByEmail(p.getEmail()).orElse(null);
                        if (u != null) elderUserId = u.getId();
                    }
                    if (elderUserId != null) {
                        Notification n = new Notification();
                        n.setId(null);
                        n.setUserId(elderUserId);
                        n.setTitle("New message from caretaker");
                        n.setMessage(m.getContent() != null ? m.getContent() : "");
                        n.setType("MESSAGE");
                        n.setIcon("✉️");
                        n.setColor("#3b82f6");
                        n.setRead(false);
                        n.setCreatedAt(LocalDateTime.now());
                        notificationRepository.save(n);
                    }
                }
            }
        } catch (Exception ignore) {}
        return ResponseEntity.ok(saved);
    }
}
