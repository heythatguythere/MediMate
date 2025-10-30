package com.medimate.controller;

import com.medimate.model.User;
import com.medimate.repo.UserRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {
    private final TokenService tokenService;
    private final UserRepository userRepository;

    public UserController(TokenService tokenService, UserRepository userRepository) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return userRepository.findById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).build());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestHeader("X-Auth-Token") String token,
                                           @RequestBody Map<String, Object> updates) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return userRepository.findById(userId)
                .map(u -> {
                    if (updates.containsKey("fullName")) u.setFullName(String.valueOf(updates.get("fullName")));
                    if (updates.containsKey("email")) u.setEmail(String.valueOf(updates.get("email")));
                    // phone/dob/address are patient fields; keep on Patient entity when linked, but store minimally here if needed
                    return ResponseEntity.ok(userRepository.save(u));
                })
                .orElse(ResponseEntity.status(404).build());
    }
}
