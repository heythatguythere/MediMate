package com.medimate.controller;

import com.medimate.model.*;
import com.medimate.repo.*;
import com.medimate.service.TokenService;
import com.medimate.service.GroqAIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {
    private final TokenService tokenService;
    private final MedicationRepository medicationRepository;
    private final WellnessLogRepository wellnessRepository;
    private final StreakRepository streakRepository;
    private final NotificationRepository notificationRepository;
    private final GroqAIService groqAIService;
    private final DoseEventRepository doseEventRepository;

    public DashboardController(TokenService tokenService, MedicationRepository medicationRepository,
                               WellnessLogRepository wellnessRepository, StreakRepository streakRepository,
                               NotificationRepository notificationRepository, GroqAIService groqAIService,
                               DoseEventRepository doseEventRepository) {
        this.tokenService = tokenService;
        this.medicationRepository = medicationRepository;
        this.wellnessRepository = wellnessRepository;
        this.streakRepository = streakRepository;
        this.notificationRepository = notificationRepository;
        this.groqAIService = groqAIService;
        this.doseEventRepository = doseEventRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<Medication> meds = medicationRepository.findByUserId(userId);
        List<WellnessLog> logs = wellnessRepository.findByUserId(userId);
        
        Streak streak = streakRepository.findByUserId(userId).orElse(new Streak());
        
        // Calculate today's mood average
        LocalDate today = LocalDate.now();
        List<WellnessLog> todayLogs = logs.stream()
            .filter(l -> l.getDate() != null && l.getDate().equals(today))
            .collect(Collectors.toList());
        
        String avgMood = "Good";
        double avgEnergy = 7.0;
        if (!todayLogs.isEmpty()) {
            avgEnergy = todayLogs.stream().mapToInt(WellnessLog::getEnergy).average().orElse(7.0);
            // Simple mood calculation
            long goodMoods = todayLogs.stream().filter(l -> "Good".equals(l.getMood())).count();
            if (goodMoods > todayLogs.size() / 2) avgMood = "Good";
            else avgMood = "Okay";
        }

        // Calculate medications completed today
        List<DoseEvent> todayDoses = doseEventRepository.findByUserId(userId).stream()
            .filter(d -> d.getDueAt() != null && d.getDueAt().toLocalDate().equals(today))
            .collect(Collectors.toList());
        long completedToday = todayDoses.stream()
            .filter(d -> "TAKEN".equals(d.getStatus()))
            .count();
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("streak", streak.getCurrentStreak());
        stats.put("medicationsToday", todayDoses.size());
        stats.put("medicationsCompleted", (int) completedToday);
        stats.put("mood", avgMood);
        stats.put("energy", (int) avgEnergy);
        stats.put("totalMedications", meds.size());
        stats.put("totalLogs", logs.size());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/mood-trends")
    public ResponseEntity<?> getMoodTrends(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<WellnessLog> logs = wellnessRepository.findByUserId(userId);
        
        // Get last 7 days
        Map<String, Double> trends = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dayName = date.getDayOfWeek().toString().substring(0, 3);
            
            List<WellnessLog> dayLogs = logs.stream()
                .filter(l -> l.getDate() != null && l.getDate().equals(date))
                .collect(Collectors.toList());
            
            double avgEnergy = dayLogs.isEmpty() ? 5.0 : 
                dayLogs.stream().mapToInt(WellnessLog::getEnergy).average().orElse(5.0);
            
            trends.put(dayName, avgEnergy);
        }

        return ResponseEntity.ok(trends);
    }

    @GetMapping("/upcoming-medications")
    public ResponseEntity<?> getUpcomingMedications(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        // Get today's dose events
        List<DoseEvent> doses = doseEventRepository.findByUserId(userId);
        LocalDate today = LocalDate.now();
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        
        List<Map<String, Object>> upcoming = new ArrayList<>();
        for (DoseEvent dose : doses) {
            // Only show today's pending or upcoming doses
            if (dose.getDueAt() != null && dose.getDueAt().toLocalDate().equals(today)) {
                Map<String, Object> item = new HashMap<>();
                item.put("name", dose.getMedName() + " " + (dose.getDosage() != null ? dose.getDosage() : ""));
                item.put("time", dose.getDueAt().toLocalTime().format(timeFormatter));
                item.put("countdown", dose.getStatus() != null ? dose.getStatus() : "PENDING");
                upcoming.add(item);
            }
        }

        return ResponseEntity.ok(upcoming);
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        // Create default notifications if none exist
        if (notifications.isEmpty()) {
            notifications = createDefaultNotifications(userId);
        }

        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> createNotification(@RequestHeader("X-Auth-Token") String token, 
                                                @RequestBody Notification notification) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        notification.setUserId(userId);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);
        
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<?> markNotificationRead(@RequestHeader("X-Auth-Token") String token, 
                                                   @PathVariable("id") String id) {
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

    @PostMapping("/notifications/mark-all-read")
    public ResponseEntity<?> markAllNotificationsRead(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
        
        Map<String, Object> response = new HashMap<>();
        response.put("updated", notifications.size());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<?> deleteNotification(@RequestHeader("X-Auth-Token") String token, 
                                                @PathVariable("id") String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        
        return notificationRepository.findById(id)
                .filter(n -> n.getUserId().equals(userId))
                .map(n -> {
                    notificationRepository.delete(n);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/ai-insights")
    public ResponseEntity<?> getAIInsights(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<WellnessLog> logs = wellnessRepository.findByUserId(userId);
        List<Medication> meds = medicationRepository.findByUserId(userId);
        
        // Prepare data for AI
        Map<String, Object> userData = new HashMap<>();
        userData.put("logCount", logs.size());
        
        if (!logs.isEmpty()) {
            double avgEnergy = logs.stream().mapToInt(WellnessLog::getEnergy).average().orElse(0.0);
            userData.put("avgEnergy", avgEnergy);
            
            // Find most common mood
            Map<String, Long> moodCounts = logs.stream()
                .collect(Collectors.groupingBy(WellnessLog::getMood, Collectors.counting()));
            String commonMood = moodCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("");
            userData.put("commonMood", commonMood);
        } else {
            userData.put("avgEnergy", 0.0);
            userData.put("commonMood", "");
        }
        
        userData.put("medicationCount", meds.size());
        
        // Get AI-generated insight
        String insight = groqAIService.generateWellnessInsight(userData);

        Map<String, String> response = new HashMap<>();
        response.put("insight", insight);
        response.put("type", "WELLNESS");
        
        return ResponseEntity.ok(response);
    }

    private List<Notification> createDefaultNotifications(String userId) {
        List<Notification> defaults = new ArrayList<>();
        
        Notification n1 = new Notification();
        n1.setUserId(userId);
        n1.setType("MEDICATION");
        n1.setTitle("Medication Reminder");
        n1.setMessage("Time to take your medications");
        n1.setIcon("💊");
        n1.setColor("#3b82f6");
        n1.setCreatedAt(LocalDateTime.now());
        n1.setRead(false);
        defaults.add(notificationRepository.save(n1));
        
        Notification n2 = new Notification();
        n2.setUserId(userId);
        n2.setType("HYDRATION");
        n2.setTitle("Hydration");
        n2.setMessage("Time to drink water");
        n2.setIcon("💧");
        n2.setColor("#06b6d4");
        n2.setCreatedAt(LocalDateTime.now());
        n2.setRead(false);
        defaults.add(notificationRepository.save(n2));
        
        return defaults;
    }
}
