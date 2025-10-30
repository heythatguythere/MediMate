package com.medimate.controller;

import com.medimate.model.Notification;
import com.medimate.repo.NotificationRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/caretaker/notifications")
@CrossOrigin(origins = "*")
public class CaretakerNotificationController {
    private final TokenService tokenService;
    private final NotificationRepository notificationRepository;

    public CaretakerNotificationController(TokenService tokenService, NotificationRepository notificationRepository) {
        this.tokenService = tokenService;
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader("X-Auth-Token") String token, @RequestBody Notification n) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        n.setId(null);
        n.setUserId(userId);
        if (n.getCreatedAt() == null) n.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(notificationRepository.save(n));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id, @RequestBody Notification updated) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return notificationRepository.findById(id)
                .filter(n -> n.getUserId().equals(userId))
                .map(n -> {
                    if (updated.getTitle() != null) n.setTitle(updated.getTitle());
                    if (updated.getMessage() != null) n.setMessage(updated.getMessage());
                    if (updated.getType() != null) n.setType(updated.getType());
                    if (updated.getIcon() != null) n.setIcon(updated.getIcon());
                    if (updated.getColor() != null) n.setColor(updated.getColor());
                    n.setRead(updated.isRead());
                    notificationRepository.save(n);
                    return ResponseEntity.ok(n);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return notificationRepository.findById(id)
                .filter(n -> n.getUserId().equals(userId))
                .map(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                    return ResponseEntity.ok(n);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllRead(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        list.forEach(n -> { n.setRead(true);});
        notificationRepository.saveAll(list);
        Map<String, Object> res = new HashMap<>();
        res.put("updated", list.size());
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@RequestHeader("X-Auth-Token") String token, @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return notificationRepository.findById(id)
                .filter(n -> n.getUserId().equals(userId))
                .map(n -> { notificationRepository.delete(n); return ResponseEntity.noContent().build(); })
                .orElse(ResponseEntity.notFound().build());
    }
}
