package com.medimate.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "medication_logs")
public class MedicationLog {
    @Id
    private String id;
    
    private String userId;
    private String medicationId;
    private String medicationName;
    private LocalDateTime scheduledTime;
    private LocalDateTime takenTime;
    private String status; // TAKEN, MISSED, PENDING
    
    public MedicationLog() {}
    
    public MedicationLog(String userId, String medicationId, String medicationName, LocalDateTime scheduledTime) {
        this.userId = userId;
        this.medicationId = medicationId;
        this.medicationName = medicationName;
        this.scheduledTime = scheduledTime;
        this.status = "PENDING";
    }
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getMedicationId() { return medicationId; }
    public void setMedicationId(String medicationId) { this.medicationId = medicationId; }
    public String getMedicationName() { return medicationName; }
    public void setMedicationName(String medicationName) { this.medicationName = medicationName; }
    public LocalDateTime getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(LocalDateTime scheduledTime) { this.scheduledTime = scheduledTime; }
    public LocalDateTime getTakenTime() { return takenTime; }
    public void setTakenTime(LocalDateTime takenTime) { this.takenTime = takenTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
