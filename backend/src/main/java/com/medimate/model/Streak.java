package com.medimate.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Document(collection = "streaks")
public class Streak {
    @Id
    private String id;

    private String userId;
    private int currentStreak;
    private int longestStreak;
    private LocalDate lastLogDate;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }
    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
    public LocalDate getLastLogDate() { return lastLogDate; }
    public void setLastLogDate(LocalDate lastLogDate) { this.lastLogDate = lastLogDate; }
}
