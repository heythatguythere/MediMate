package com.medimate.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

@Service
public class GroqAIService {
    
    @Value("${groq.api.key}")
    private String apiKey;
    
    @Value("${groq.api.url}")
    private String apiUrl;
    
    @Value("${groq.model}")
    private String model;
    
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final Gson gson = new Gson();
    
    public String generateWellnessInsight(Map<String, Object> userData) {
        try {
            // Build prompt based on user data
            String prompt = buildPrompt(userData);
            
            // Create request body
            JsonObject requestBody = new JsonObject();
            requestBody.addProperty("model", model);
            
            JsonArray messages = new JsonArray();
            JsonObject systemMessage = new JsonObject();
            systemMessage.addProperty("role", "system");
            systemMessage.addProperty("content", "You are a helpful wellness coach. Provide brief, actionable health insights in 1-2 sentences.");
            messages.add(systemMessage);
            
            JsonObject userMessage = new JsonObject();
            userMessage.addProperty("role", "user");
            userMessage.addProperty("content", prompt);
            messages.add(userMessage);
            
            requestBody.add("messages", messages);
            requestBody.addProperty("temperature", 0.7);
            requestBody.addProperty("max_tokens", 150);
            
            // Make API request
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(requestBody)))
                .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JsonObject responseJson = gson.fromJson(response.body(), JsonObject.class);
                String insight = responseJson.getAsJsonArray("choices")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("message")
                    .get("content").getAsString();
                return insight.trim();
            } else {
                return "Start logging your wellness data to receive personalized AI insights!";
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return "Start logging your wellness data to receive personalized AI insights!";
        }
    }
    
    private String buildPrompt(Map<String, Object> userData) {
        int logCount = (int) userData.getOrDefault("logCount", 0);
        double avgEnergy = (double) userData.getOrDefault("avgEnergy", 0.0);
        String commonMood = (String) userData.getOrDefault("commonMood", "");
        int medicationCount = (int) userData.getOrDefault("medicationCount", 0);
        
        if (logCount == 0) {
            return "Give a motivational message to start tracking wellness.";
        }
        
        StringBuilder prompt = new StringBuilder();
        prompt.append("User has logged wellness ").append(logCount).append(" times. ");
        prompt.append("Average energy level: ").append(String.format("%.1f", avgEnergy)).append("/10. ");
        
        if (!commonMood.isEmpty()) {
            prompt.append("Most common mood: ").append(commonMood).append(". ");
        }
        
        if (medicationCount > 0) {
            prompt.append("Taking ").append(medicationCount).append(" medications. ");
        }
        
        prompt.append("Provide a brief, encouraging wellness insight with one actionable tip.");
        
        return prompt.toString();
    }
}
