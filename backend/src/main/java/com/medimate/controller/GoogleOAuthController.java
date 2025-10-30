package com.medimate.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.medimate.model.User;
import com.medimate.repo.UserRepository;
import com.medimate.service.GoogleOAuthService;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth/google")
@CrossOrigin(origins = "*")
public class GoogleOAuthController {
    
    private final GoogleOAuthService googleOAuthService;
    private final UserRepository userRepository;
    private final TokenService tokenService;
    
    public GoogleOAuthController(GoogleOAuthService googleOAuthService, 
                                UserRepository userRepository,
                                TokenService tokenService) {
        this.googleOAuthService = googleOAuthService;
        this.userRepository = userRepository;
        this.tokenService = tokenService;
    }
    
    @PostMapping("/verify")
    public ResponseEntity<?> verifyGoogleToken(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");
        
        if (idToken == null || idToken.isEmpty()) {
            return ResponseEntity.badRequest().body("ID token is required");
        }
        
        try {
            // Verify the Google ID token
            GoogleIdToken.Payload payload = googleOAuthService.verifyToken(idToken);
            
            if (payload == null) {
                return ResponseEntity.status(401).body("Invalid Google token");
            }
            
            // Extract user information
            String email = googleOAuthService.getEmail(payload);
            String name = googleOAuthService.getName(payload);
            String picture = googleOAuthService.getPicture(payload);
            
            // Check if user exists
            Optional<User> existingUser = userRepository.findByEmail(email);
            User user;
            
            if (existingUser.isPresent()) {
                // User exists, login
                user = existingUser.get();
            } else {
                // Create new user
                user = new User();
                user.setEmail(email);
                user.setFullName(name);
                user.setUsername(email.split("@")[0]); // Use email prefix as username
                user.setPassword("GOOGLE_OAUTH"); // No password for OAuth users
                user.setRole("Elderly User"); // Default role for Google OAuth users
                user = userRepository.save(user);
            }
            
            // Generate auth token
            String authToken = tokenService.generateToken(user.getId());
            
            // Return user info and token
            Map<String, Object> response = new HashMap<>();
            response.put("token", authToken);
            response.put("role", user.getRole());
            response.put("username", user.getUsername());
            response.put("fullName", user.getFullName());
            response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "username", user.getUsername(),
                "role", user.getRole()
            ));
            response.put("message", existingUser.isPresent() ? "Login successful" : "Account created successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error verifying Google token: " + e.getMessage());
        }
    }
}
