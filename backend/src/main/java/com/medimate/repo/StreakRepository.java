package com.medimate.repo;

import com.medimate.model.Streak;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface StreakRepository extends MongoRepository<Streak, String> {
    Optional<Streak> findByUserId(String userId);
}
