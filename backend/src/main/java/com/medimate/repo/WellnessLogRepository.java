package com.medimate.repo;

import com.medimate.model.WellnessLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface WellnessLogRepository extends MongoRepository<WellnessLog, String> {
    List<WellnessLog> findByUserId(String userId);
}
