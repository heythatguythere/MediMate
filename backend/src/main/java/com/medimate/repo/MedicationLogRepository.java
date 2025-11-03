package com.medimate.repo;

import com.medimate.model.MedicationLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface MedicationLogRepository extends MongoRepository<MedicationLog, String> {
    List<MedicationLog> findByUserId(String userId);
    List<MedicationLog> findByUserIdAndStatus(String userId, String status);
    List<MedicationLog> findByStatusAndScheduledTimeBefore(String status, LocalDateTime time);
}
