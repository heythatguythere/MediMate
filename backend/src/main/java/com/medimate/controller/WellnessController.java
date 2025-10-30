package com.medimate.controller;

import com.medimate.model.Streak;
import com.medimate.model.WellnessLog;
import com.medimate.repo.StreakRepository;
import com.medimate.repo.WellnessLogRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/wellness")
@CrossOrigin(origins = "*")
public class WellnessController {
    private final WellnessLogRepository repo;
    private final TokenService tokenService;
    private final StreakRepository streakRepository;

    public WellnessController(WellnessLogRepository repo, TokenService tokenService, StreakRepository streakRepository) {
        this.repo = repo;
        this.tokenService = tokenService;
        this.streakRepository = streakRepository;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        List<WellnessLog> logs = repo.findByUserId(userId);
        return ResponseEntity.ok(logs);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader("X-Auth-Token") String token, @RequestBody WellnessLog log) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        log.setId(null);
        log.setUserId(userId);
        
        WellnessLog saved = repo.save(log);
        
        // Update streak
        updateStreak(userId, log.getDate());
        
        return ResponseEntity.ok(saved);
    }
    
    private void updateStreak(String userId, LocalDate logDate) {
        if (logDate == null) logDate = LocalDate.now();
        
        Streak streak = streakRepository.findByUserId(userId).orElse(new Streak());
        if (streak.getUserId() == null) {
            streak.setUserId(userId);
            streak.setCurrentStreak(1);
            streak.setLongestStreak(1);
            streak.setLastLogDate(logDate);
            streakRepository.save(streak);
            return;
        }
        
        LocalDate lastLog = streak.getLastLogDate();
        if (lastLog == null) {
            streak.setCurrentStreak(1);
            streak.setLongestStreak(1);
            streak.setLastLogDate(logDate);
        } else if (logDate.equals(lastLog)) {
            // Same day, no change
            return;
        } else {
            long daysBetween = ChronoUnit.DAYS.between(lastLog, logDate);
            
            if (daysBetween == 1) {
                // Consecutive day
                streak.setCurrentStreak(streak.getCurrentStreak() + 1);
                streak.setLastLogDate(logDate);
                
                if (streak.getCurrentStreak() > streak.getLongestStreak()) {
                    streak.setLongestStreak(streak.getCurrentStreak());
                }
            } else if (daysBetween > 1) {
                // Streak broken
                streak.setCurrentStreak(1);
                streak.setLastLogDate(logDate);
            }
            // If daysBetween < 0, it's a past date, don't update
        }
        
        streakRepository.save(streak);
    }
}
