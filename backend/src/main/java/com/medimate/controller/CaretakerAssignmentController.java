package com.medimate.controller;

import com.medimate.model.Patient;
import com.medimate.repo.PatientRepository;
import com.medimate.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/caretaker/patients")
@CrossOrigin(origins = "*")
public class CaretakerAssignmentController {
    private final TokenService tokenService;
    private final PatientRepository patientRepository;

    public CaretakerAssignmentController(TokenService tokenService, PatientRepository patientRepository) {
        this.tokenService = tokenService;
        this.patientRepository = patientRepository;
    }

    @PostMapping("/claim")
    public ResponseEntity<?> claim(@RequestHeader("X-Auth-Token") String token, @RequestBody Map<String, String> body) {
        String caretakerId = tokenService.validate(token);
        if (caretakerId == null) return ResponseEntity.status(401).build();

        String inputName = safe(body.get("name"));
        String email = safe(body.get("email"));
        String contact = safe(body.get("contactNumber"));

        if (email.isEmpty() && contact.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide email or contactNumber to claim"));
        }

        Set<Patient> candidates = new LinkedHashSet<>();
        if (!email.isEmpty()) candidates.addAll(patientRepository.findByEmailIgnoreCase(email));
        if (!contact.isEmpty()) candidates.addAll(patientRepository.findByContactNumber(contact));

        // Filter by approximate name match if provided
        List<Patient> matches = candidates.stream()
                .filter(p -> inputName.isEmpty() || approxMatch(inputName, p.getName()))
                .collect(Collectors.toList());

        if (matches.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "No matching patient found"));
        }

        // Choose the best match (first for now)
        Patient p = matches.get(0);
        p.setCaretakerId(caretakerId);
        patientRepository.save(p);
        return ResponseEntity.ok(p);
    }

    private static String norm(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "").trim();
    }

    private static String safe(String s) { return s == null ? "" : s.trim(); }

    private static boolean approxMatch(String a, String b) {
        String na = norm(a);
        String nb = norm(b);
        if (na.isEmpty() || nb.isEmpty()) return false;
        if (na.contains(nb) || nb.contains(na)) return true;
        // Token overlap heuristic
        Set<String> ta = new HashSet<>(Arrays.asList(a.toLowerCase(Locale.ROOT).split("\\s+")));
        Set<String> tb = new HashSet<>(Arrays.asList(b.toLowerCase(Locale.ROOT).split("\\s+")));
        ta.remove(""); tb.remove("");
        if (ta.isEmpty() || tb.isEmpty()) return false;
        int inter = 0;
        for (String t : ta) if (tb.contains(t)) inter++;
        double jaccard = inter / (double)(ta.size() + tb.size() - inter);
        return jaccard >= 0.5; // allow similar names like "R. Jayanth" vs "Jayanth"
    }
}
