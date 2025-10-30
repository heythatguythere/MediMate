package com.medimate.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {
    private final Map<String, String> tokenToUser = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String generateToken(String userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenToUser.put(token, userId);
        return token;
    }

    public String validate(String token) {
        return tokenToUser.get(token);
    }
}
