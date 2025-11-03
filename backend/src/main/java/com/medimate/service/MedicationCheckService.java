package com.medimate.service;

import com.medimate.model.Medication;
import com.medimate.model.MedicationLog;
import com.medimate.model.Notification;
import com.medimate.model.Patient;
import com.medimate.model.User;
import com.medimate.repo.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class MedicationCheckService {
    
    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository medicationLogRepository;
    private final NotificationRepository notificationRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    
    public MedicationCheckService(MedicationRepository medicationRepository,
                                  MedicationLogRepository medicationLogRepository,
                                  NotificationRepository notificationRepository,
                                  PatientRepository patientRepository,
                                  UserRepository userRepository) {
        this.medicationRepository = medicationRepository;
        this.medicationLogRepository = medicationLogRepository;
        this.notificationRepository = notificationRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
    }
    
    // Check every minute for missed medications
    @Scheduled(fixedRate = 60000) // Run every 60 seconds
    public void checkMissedMedications() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime fiveMinutesAgo = now.minusMinutes(5);
        
        // Find all pending medication logs that are more than 5 minutes overdue
        List<MedicationLog> pendingLogs = medicationLogRepository
            .findByStatusAndScheduledTimeBefore("PENDING", fiveMinutesAgo);
        
        for (MedicationLog log : pendingLogs) {
            // Mark as missed
            log.setStatus("MISSED");
            medicationLogRepository.save(log);
            
            // Find the patient who owns this medication
            User patient = userRepository.findById(log.getUserId()).orElse(null);
            if (patient == null) continue;
            
            // Find the caretaker assigned to this patient
            List<Patient> patientRecords = patientRepository.findByEmail(patient.getEmail());
            if (patientRecords.isEmpty()) {
                patientRecords = patientRepository.findByContactNumber(patient.getUsername());
            }
            
            if (!patientRecords.isEmpty()) {
                Patient patientRecord = patientRecords.get(0);
                String caretakerId = patientRecord.getCaretakerId();
                
                if (caretakerId != null && !caretakerId.isEmpty()) {
                    // Create notification for caretaker
                    Notification notification = new Notification();
                    notification.setUserId(caretakerId);
                    notification.setType("MEDICATION_MISSED");
                    notification.setTitle("Medication Missed");
                    notification.setMessage(String.format("Patient %s missed medication: %s (scheduled at %s)",
                        patient.getFullName() != null ? patient.getFullName() : patient.getUsername(),
                        log.getMedicationName(),
                        log.getScheduledTime().format(DateTimeFormatter.ofPattern("hh:mm a"))));
                    notification.setIcon("⚠️");
                    notification.setColor("#ef4444");
                    notification.setCreatedAt(LocalDateTime.now());
                    notification.setRead(false);
                    
                    notificationRepository.save(notification);
                }
            }
        }
    }
    
    // Create medication logs for today's scheduled medications (run once per day)
    @Scheduled(cron = "0 0 0 * * *") // Run at midnight every day
    public void createDailyMedicationLogs() {
        List<Medication> allMedications = medicationRepository.findAll();
        LocalDate today = LocalDate.now();
        
        for (Medication medication : allMedications) {
            if (!medication.isActive()) continue;
            
            String schedule = medication.getSchedule();
            if (schedule == null || schedule.isEmpty()) continue;
            
            // Parse schedule times (e.g., "08:00, 20:00")
            String[] times = schedule.split(",");
            for (String timeStr : times) {
                try {
                    timeStr = timeStr.trim();
                    LocalTime time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                    LocalDateTime scheduledDateTime = LocalDateTime.of(today, time);
                    
                    // Only create log if the time hasn't passed yet
                    if (scheduledDateTime.isAfter(LocalDateTime.now())) {
                        MedicationLog log = new MedicationLog(
                            medication.getUserId(),
                            medication.getId(),
                            medication.getName(),
                            scheduledDateTime
                        );
                        medicationLogRepository.save(log);
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing time for medication " + medication.getId() + ": " + e.getMessage());
                }
            }
        }
    }
    
    // Also create logs for any new medications or when medications are updated
    public void createLogsForMedication(Medication medication) {
        if (!medication.isActive()) return;
        
        String schedule = medication.getSchedule();
        if (schedule == null || schedule.isEmpty()) return;
        
        LocalDate today = LocalDate.now();
        String[] times = schedule.split(",");
        
        for (String timeStr : times) {
            try {
                timeStr = timeStr.trim();
                LocalTime time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                LocalDateTime scheduledDateTime = LocalDateTime.of(today, time);
                
                // Only create log if the time hasn't passed yet
                if (scheduledDateTime.isAfter(LocalDateTime.now())) {
                    MedicationLog log = new MedicationLog(
                        medication.getUserId(),
                        medication.getId(),
                        medication.getName(),
                        scheduledDateTime
                    );
                    medicationLogRepository.save(log);
                }
            } catch (Exception e) {
                System.err.println("Error parsing time for medication " + medication.getId() + ": " + e.getMessage());
            }
        }
    }
}
