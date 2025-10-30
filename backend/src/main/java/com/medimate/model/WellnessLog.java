package com.medimate.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "wellness_logs")
public class WellnessLog {
    @Id
    private String id;

    private String userId;
    private LocalDate date = LocalDate.now();
    private String mood; // e.g., Good/Okay/Low
    private Integer energy; // 1-10
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }
    public Integer getEnergy() { return energy; }
    public void setEnergy(Integer energy) { this.energy = energy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
