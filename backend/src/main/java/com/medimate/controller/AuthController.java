package com.medimate.controller;

import com.medimate.model.User;
import com.medimate.repo.UserRepository;
import com.medimate.service.AuthService;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthService authService;
    private final TokenService tokenService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, TokenService tokenService, UserRepository userRepository) {
        this.authService = authService;
        this.tokenService = tokenService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            // Validation
            String username = body.get("username");
            String password = body.get("password");
            String confirmPassword = body.get("confirmPassword");
            String email = body.get("email");
            String role = body.get("role");
            
            // Check required fields
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }
            if (role == null || role.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Role is required"));
            }
            
            // Username length validation
            if (username.length() < 3) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username must be at least 3 characters"));
            }
            
            // Password length validation
            if (password.length() < 6) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
            }
            
            // Confirm password validation
            if (confirmPassword != null && !password.equals(confirmPassword)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match"));
            }
            
            // Check if username already exists
            if (userRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
            }
            
            // Check if email already exists
            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email already exists"));
            }
            
            User u = authService.register(
                username, 
                password, 
                body.get("fullName"), 
                email,
                role
            );
            return ResponseEntity.ok(Map.of(
                "id", u.getId(), 
                "message", "Registration successful",
                "role", u.getRole()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String username = body.get("username");
            String password = body.get("password");
            
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }
            
            String token = authService.login(username, password);
            
            // Get user info to return role
            String userId = tokenService.validate(token);
            User user = userRepository.findById(userId).orElseThrow();
            
            return ResponseEntity.ok(Map.of(
                "token", token,
                "role", user.getRole(),
                "username", user.getUsername(),
                "fullName", user.getFullName()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        return userRepository.findById(userId)
                .map(u -> ResponseEntity.ok(Map.of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "fullName", u.getFullName(),
                        "email", u.getEmail() != null ? u.getEmail() : "",
                        "role", u.getRole(),
                        "status", u.getStatus(),
                        "joinedDate", u.getJoinedDate() != null ? u.getJoinedDate() : ""
                )))
                .orElse(ResponseEntity.status(404).build());
    }
}
