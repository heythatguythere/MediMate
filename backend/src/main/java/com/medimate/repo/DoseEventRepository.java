package com.medimate.repo;

import com.medimate.model.DoseEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DoseEventRepository extends MongoRepository<DoseEvent, String> {
    List<DoseEvent> findByUserId(String userId);
    List<DoseEvent> findByUserIdOrderByDueAtDesc(String userId);
    List<DoseEvent> findByStatusAndDueAtBefore(String status, LocalDateTime cutoff);
}
