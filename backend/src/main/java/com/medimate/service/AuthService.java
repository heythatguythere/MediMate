package com.medimate.service;

import com.medimate.model.User;
import com.medimate.repo.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository, TokenService tokenService) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
    }

    public User register(String username, String password, String fullName, String email, String role) {
        Optional<User> existing = userRepository.findByUsername(username);
        if (existing.isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        User u = new User();
        u.setUsername(username);
        u.setPassword(password);
        u.setFullName(fullName);
        u.setEmail(email);
        u.setRole(role);
        u.setStatus("Active");
        u.setJoinedDate(java.time.LocalDate.now().toString());
        return userRepository.save(u);
    }

    public String login(String username, String password) {
        User u = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        if (!u.getPassword().equals(password)) {
            throw new RuntimeException("Invalid credentials");
        }
        return tokenService.generateToken(u.getId());
    }
}
