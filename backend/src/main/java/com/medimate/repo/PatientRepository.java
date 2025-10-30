package com.medimate.repo;

import com.medimate.model.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PatientRepository extends MongoRepository<Patient, String> {
    List<Patient> findByCaretakerId(String caretakerId);
    List<Patient> findByCaretakerIdAndStatus(String caretakerId, String status);
    long countByCaretakerId(String caretakerId);
    long countByCaretakerIdAndStatus(String caretakerId, String status);
    List<Patient> findByEmailIgnoreCase(String email);
    List<Patient> findByContactNumber(String contactNumber);
}
