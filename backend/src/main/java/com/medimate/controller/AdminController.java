package com.medimate.controller;

import com.medimate.model.User;
import com.medimate.repo.UserRepository;
import com.medimate.service.DailyDoseGenerator;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final DailyDoseGenerator doseGenerator;

    public AdminController(UserRepository userRepository, TokenService tokenService, DailyDoseGenerator doseGenerator) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.doseGenerator = doseGenerator;
    }

    // Get Dashboard Statistics
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus("Active");
        long elderlyUsers = userRepository.countByRole("Elderly User");
        long caretakers = userRepository.countByRole("Caregiver");

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("activeUsers", activeUsers);
        stats.put("elderlyUsers", elderlyUsers);
        stats.put("caretakers", caretakers);
        stats.put("appointments", 312); // Mock data
        stats.put("medications", 978); // Mock data

        return ResponseEntity.ok(stats);
    }

    // Get All Users
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    // Get Users by Role
    @GetMapping("/users/role/{role}")
    public ResponseEntity<?> getUsersByRole(@RequestHeader("X-Auth-Token") String token, @PathVariable String role) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<User> users = userRepository.findByRole(role);
        return ResponseEntity.ok(users);
    }

    // Get Users by Status
    @GetMapping("/users/status/{status}")
    public ResponseEntity<?> getUsersByStatus(@RequestHeader("X-Auth-Token") String token, @PathVariable String status) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<User> users = userRepository.findByStatus(status);
        return ResponseEntity.ok(users);
    }

    // Update User
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@RequestHeader("X-Auth-Token") String token, 
                                       @PathVariable String id, 
                                       @RequestBody Map<String, String> updates) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        return userRepository.findById(id)
            .map(user -> {
                if (updates.containsKey("fullName")) user.setFullName(updates.get("fullName"));
                if (updates.containsKey("email")) user.setEmail(updates.get("email"));
                if (updates.containsKey("role")) user.setRole(updates.get("role"));
                if (updates.containsKey("status")) user.setStatus(updates.get("status"));
                userRepository.save(user);
                return ResponseEntity.ok(Map.of("message", "User updated successfully", "user", user));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Delete User
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@RequestHeader("X-Auth-Token") String token, @PathVariable String id) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }

    // Get Caretakers
    @GetMapping("/caretakers")
    public ResponseEntity<?> getCaretakers(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        List<User> caretakers = userRepository.findByRole("Caregiver");
        return ResponseEntity.ok(caretakers);
    }

    // Get Activity Log (Mock for now)
    @GetMapping("/activity")
    public ResponseEntity<?> getActivity(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();

        // Return mock activity data
        return ResponseEntity.ok(List.of(
            Map.of("action", "User registered", "user", "John Doe", "time", "5 minutes ago"),
            Map.of("action", "Caretaker added patient", "user", "Dr. Smith", "time", "15 minutes ago")
        ));
    }
    
    // Manually trigger dose generation for today
    @PostMapping("/generate-doses")
    public ResponseEntity<?> generateDoses(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        
        try {
            doseGenerator.generateDosesForDate(LocalDate.now());
            return ResponseEntity.ok(Map.of("message", "Doses generated successfully for today"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
