package com.medimate.repo;

import com.medimate.model.Message;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByCaretakerIdOrderByCreatedAtDesc(String caretakerId);
    List<Message> findByCaretakerIdAndPatientIdOrderByCreatedAtAsc(String caretakerId, String patientId);
}
