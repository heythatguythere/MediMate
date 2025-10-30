package com.medimate.controller;

import com.medimate.service.GroqService;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/caretaker/ai")
@CrossOrigin(origins = "*")
public class CaretakerAIController {
    private final TokenService tokenService;
    private final GroqService groqService;

    public CaretakerAIController(TokenService tokenService, GroqService groqService) {
        this.tokenService = tokenService;
        this.groqService = groqService;
    }

    @PostMapping("/insights")
    public ResponseEntity<?> insights(@RequestHeader("X-Auth-Token") String token,
                                      @RequestBody Map<String, Object> payload) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();
        String context = String.valueOf(payload.getOrDefault("context", ""));
        try {
            String result = groqService.generateInsights(context);
            return ResponseEntity.ok(Map.of("insight", result));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
