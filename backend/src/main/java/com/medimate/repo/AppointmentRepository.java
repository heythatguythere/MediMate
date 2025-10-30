package com.medimate.repo;

import com.medimate.model.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByCaretakerId(String caretakerId);
    List<Appointment> findByCaretakerIdAndStatus(String caretakerId, String status);
    List<Appointment> findByCaretakerIdAndDate(String caretakerId, String date);
    long countByCaretakerId(String caretakerId);
    long countByCaretakerIdAndStatus(String caretakerId, String status);
    long countByCaretakerIdAndDate(String caretakerId, String date);
}
