package com.medimate.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {
    private static final Duration TOKEN_TTL = Duration.ofHours(12);
    private final Map<String, Session> tokenToSession = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    private static class Session {
        private final String userId;
        private final Instant expiresAt;

        Session(String userId, Instant expiresAt) {
            this.userId = userId;
            this.expiresAt = expiresAt;
        }
    }

    public String generateToken(String userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenToSession.put(token, new Session(userId, Instant.now().plus(TOKEN_TTL)));
        return token;
    }

    public String validate(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        Session session = tokenToSession.get(token);
        if (session == null) {
            return null;
        }
        if (session.expiresAt.isBefore(Instant.now())) {
            tokenToSession.remove(token);
            return null;
        }
        return session.userId;
    }

    public void revoke(String token) {
        if (token != null && !token.isBlank()) {
            tokenToSession.remove(token);
        }
    }
}
