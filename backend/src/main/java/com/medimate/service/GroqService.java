package com.medimate.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class GroqService {
    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.1-8b-instant}")
    private String model;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    public String generateInsights(String context) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            throw new IllegalStateException("GROQ_API_KEY not configured");
        }
        String payload = "{" +
                "\"model\":\"" + model + "\"," +
                "\"messages\":[{" +
                "\"role\":\"system\",\"content\":\"You are a health insights assistant. Produce concise, actionable insights.\"},{" +
                "\"role\":\"user\",\"content\":\"" + escape(context) + "\"}]}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqApiKey)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpClient client = HttpClient.newBuilder().build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new RuntimeException("Groq API error: " + response.statusCode() + " - " + response.body());
        }
        // naive extraction; the frontend can accept raw JSON or we pull the content field
        String body = response.body();
        String marker = "\"content\":";
        int idx = body.indexOf(marker);
        if (idx > 0) {
            int start = body.indexOf('"', idx + marker.length());
            int end = body.indexOf('"', start + 1);
            if (start > 0 && end > start) {
                return unescape(body.substring(start + 1, end));
            }
        }
        return body;
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ");
    }
    private String unescape(String s) {
        return s.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\");
    }
}
