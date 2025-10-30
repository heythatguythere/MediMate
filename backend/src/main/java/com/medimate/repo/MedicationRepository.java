package com.medimate.repo;

import com.medimate.model.Medication;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MedicationRepository extends MongoRepository<Medication, String> {
    List<Medication> findByUserId(String userId);
}
