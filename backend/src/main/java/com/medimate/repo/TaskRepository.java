package com.medimate.repo;

import com.medimate.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByCaretakerId(String caretakerId);
    List<Task> findByCaretakerIdAndStatus(String caretakerId, String status);
    long countByCaretakerId(String caretakerId);
    long countByCaretakerIdAndStatus(String caretakerId, String status);
}
