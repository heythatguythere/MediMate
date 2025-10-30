package com.medimate.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "messages")
public class Message {
    @Id
    private String id;

    private String caretakerId;
    private String patientId;
    private String patientName;

    private String sender; // caretaker or patient
    private String content;
    private LocalDateTime createdAt;
    private boolean read;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCaretakerId() { return caretakerId; }
    public void setCaretakerId(String caretakerId) { this.caretakerId = caretakerId; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
