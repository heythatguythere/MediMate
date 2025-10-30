package com.medimate.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "appointments")
public class Appointment {
    @Id
    private String id;
    
    private String caretakerId;
    private String patientId;
    private String patientName;
    private String date;
    private String time;
    private String type; // Checkup, Follow-up, Emergency
    private String status; // Scheduled, Completed, Cancelled
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCaretakerId() { return caretakerId; }
    public void setCaretakerId(String caretakerId) { this.caretakerId = caretakerId; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
