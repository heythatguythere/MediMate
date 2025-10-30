package com.medimate.controller;

import com.medimate.model.Patient;
import com.medimate.model.User;
import com.medimate.repo.PatientRepository;
import com.medimate.repo.UserRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/patient-profile")
@CrossOrigin(origins = "*")
public class PatientProfileController {
    private final TokenService tokenService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    public PatientProfileController(TokenService tokenService,
                                    UserRepository userRepository,
                                    PatientRepository patientRepository) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping
    public ResponseEntity<?> get(@RequestHeader("X-Auth-Token") String token) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        User u = userRepository.findById(userId).orElse(null);
        if (u == null) return ResponseEntity.status(404).build();
        List<Patient> matches = u.getEmail() == null ? List.of() : patientRepository.findByEmailIgnoreCase(u.getEmail());
        Patient p = matches.isEmpty() ? null : matches.get(0);
        Map<String, Object> out = new HashMap<>();
        if (p != null) {
            out.put("phone", p.getContactNumber());
            out.put("dob", p.getDob());
            out.put("address", p.getAddress());
        } else {
            out.put("phone", "");
            out.put("dob", "");
            out.put("address", "");
        }
        return ResponseEntity.ok(out);
    }

    @PutMapping
    public ResponseEntity<?> update(@RequestHeader("X-Auth-Token") String token,
                                    @RequestBody Map<String, String> body) {
        String userId = tokenService.validate(token);
        if (userId == null) return ResponseEntity.status(401).build();
        User u = userRepository.findById(userId).orElse(null);
        if (u == null || u.getEmail() == null) return ResponseEntity.status(404).body(Map.of("error","User/email not found"));
        List<Patient> matches = patientRepository.findByEmailIgnoreCase(u.getEmail());
        Patient p = matches.isEmpty() ? new Patient() : matches.get(0);
        if (p.getId() == null) {
            p.setEmail(u.getEmail());
            p.setName(u.getFullName());
            p.setStatus("Active");
        }
        if (body.containsKey("phone")) p.setContactNumber(body.get("phone"));
        if (body.containsKey("dob")) p.setDob(body.get("dob"));
        if (body.containsKey("address")) p.setAddress(body.get("address"));
        Patient saved = patientRepository.save(p);
        return ResponseEntity.ok(saved);
    }
}
