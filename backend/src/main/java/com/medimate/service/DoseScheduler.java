package com.medimate.service;

import com.medimate.model.DoseEvent;
import com.medimate.model.Notification;
import com.medimate.model.Patient;
import com.medimate.model.User;
import com.medimate.repo.DoseEventRepository;
import com.medimate.repo.NotificationRepository;
import com.medimate.repo.PatientRepository;
import com.medimate.repo.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DoseScheduler {
    private final DoseEventRepository doseRepo;
    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;
    private final PatientRepository patientRepo;

    public DoseScheduler(DoseEventRepository doseRepo, NotificationRepository notificationRepo,
                         UserRepository userRepo, PatientRepository patientRepo) {
        this.doseRepo = doseRepo;
        this.notificationRepo = notificationRepo;
        this.userRepo = userRepo;
        this.patientRepo = patientRepo;
    }

    // Run every minute to mark overdue doses (>10 minutes) as MISSED
    @Scheduled(fixedDelay = 60_000)
    public void markMissedDoses() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(10);
        List<DoseEvent> overdue = doseRepo.findByStatusAndDueAtBefore("PENDING", cutoff);
        for (DoseEvent d : overdue) {
            d.setStatus("MISSED");
            d.setUpdatedAt(LocalDateTime.now());
            doseRepo.save(d);
            notifyCaretaker(d);
        }
    }

    private void notifyCaretaker(DoseEvent d) {
        User u = userRepo.findById(d.getUserId()).orElse(null);
        if (u == null || u.getEmail() == null) return;
        List<Patient> plist = patientRepo.findByEmailIgnoreCase(u.getEmail());
        if (plist.isEmpty()) return;
        Patient p = plist.get(0);
        if (p.getCaretakerId() == null) return;
        Notification n = new Notification();
        n.setUserId(p.getCaretakerId());
        n.setTitle("Medicine missed");
        n.setMessage((d.getMedName()==null?"Medication":d.getMedName()) + " " + (d.getDosage()==null?"":d.getDosage()));
        n.setType("MEDICATION");
        n.setIcon("⏰");
        n.setColor("#ef4444");
        n.setCreatedAt(LocalDateTime.now());
        n.setRead(false);
        notificationRepo.save(n);
    }
}
