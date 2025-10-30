package com.medimate.app.net;

import com.google.gson.Gson;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class ApiClient {
    private final String baseUrl;
    private final HttpClient http = HttpClient.newHttpClient();
    private final Gson gson = new Gson();
    private String token;

    public ApiClient(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public void setToken(String token) { this.token = token; }
    public String getToken() { return token; }

    public String postJson(String path, Object body) throws Exception {
        String json = gson.toJson(body);
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
        if (token != null) b.header("X-Auth-Token", token);
        HttpResponse<String> resp = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 200 && resp.statusCode() < 300) return resp.body();
        throw new RuntimeException("HTTP " + resp.statusCode() + ": " + resp.body());
    }

    public String get(String path) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .GET();
        if (token != null) b.header("X-Auth-Token", token);
        HttpResponse<String> resp = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 200 && resp.statusCode() < 300) return resp.body();
        throw new RuntimeException("HTTP " + resp.statusCode() + ": " + resp.body());
    }

    public String delete(String path) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .DELETE();
        if (token != null) b.header("X-Auth-Token", token);
        HttpResponse<String> resp = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 200 && resp.statusCode() < 300) return resp.body();
        throw new RuntimeException("HTTP " + resp.statusCode() + ": " + resp.body());
    }
}
