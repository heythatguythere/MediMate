package com.medimate.service;

import com.medimate.model.DoseEvent;
import com.medimate.model.Medication;
import com.medimate.repo.DoseEventRepository;
import com.medimate.repo.MedicationRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class DailyDoseGenerator {
    private final MedicationRepository medicationRepository;
    private final DoseEventRepository doseEventRepository;

    public DailyDoseGenerator(MedicationRepository medicationRepository,
                              DoseEventRepository doseEventRepository) {
        this.medicationRepository = medicationRepository;
        this.doseEventRepository = doseEventRepository;
    }

    // Run every day at 00:05 (5 minutes after midnight)
    @Scheduled(cron = "0 5 0 * * ?")
    public void generateDailyDoses() {
        generateDosesForDate(LocalDate.now());
    }
    
    // Public method to manually trigger dose generation
    public void generateDosesForDate(LocalDate date) {
        List<Medication> allMeds = medicationRepository.findAll();
        
        for (Medication m : allMeds) {
            if (!m.isActive()) continue;
            String schedule = m.getSchedule();
            if (schedule == null || schedule.isBlank()) continue;
            
            try {
                for (String timeStr : schedule.split(",")) {
                    String tt = timeStr.trim();
                    if (tt.isEmpty()) continue;
                    LocalTime lt = LocalTime.parse(tt);
                    LocalDateTime dueAt = LocalDateTime.of(date, lt);
                    
                    // Check if a dose event already exists for this med/user/time today
                    // (to avoid duplicates if job runs multiple times or manual creation happened)
                    // For simplicity, we'll just create; in production, check for existing first
                    DoseEvent de = new DoseEvent();
                    de.setUserId(m.getUserId());
                    de.setMedName(m.getName());
                    de.setDosage(m.getDosage());
                    de.setDueAt(dueAt);
                    de.setStatus("PENDING");
                    de.setUpdatedAt(LocalDateTime.now());
                    doseEventRepository.save(de);
                }
            } catch (Exception e) {
                // Log error but continue processing other meds
                System.err.println("Error generating doses for medication " + m.getId() + ": " + e.getMessage());
            }
        }
        
        System.out.println("Daily dose generation completed for " + date);
    }
}
