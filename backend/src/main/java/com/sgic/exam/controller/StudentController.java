package com.sgic.exam.controller;

import com.sgic.exam.model.Student;
import com.sgic.exam.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174", "http://localhost:3000" })
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @PostMapping
    public ResponseEntity<?> addStudent(@Valid @RequestBody Student student) {
        if (studentRepository.existsByNic(student.getNic())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("NIC already exists in the system"));
        }

        if (student.getRegisteredDate() == null) {
            student.setRegisteredDate(LocalDate.now());
        }
        Student savedStudent = studentRepository.save(student);
        return new ResponseEntity<>(savedStudent, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Student>> getAllStudents() {
        List<Student> students = studentRepository.findAllByIsDeletedFalse();
        return new ResponseEntity<>(students, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Student> getStudentById(@PathVariable Long id) {
        return studentRepository.findById(id)
                .map(student -> new ResponseEntity<>(student, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @Valid @RequestBody Student studentDetails) {
        if (studentRepository.existsByNicAndIdNot(studentDetails.getNic(), id)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("NIC already exists for another student"));
        }

        return studentRepository.findById(id)
                .map(student -> {
                    // (rest of the mapping code)
                    student.setName(studentDetails.getName());
                    student.setAddress(studentDetails.getAddress());
                    student.setMobileNumber(studentDetails.getMobileNumber());
                    student.setNic(studentDetails.getNic());
                    student.setEmail(studentDetails.getEmail());
                    student.setRegisteredDate(studentDetails.getRegisteredDate());
                    // Update status and details
                    String oldStatus = student.getStatus();
                    String newStatus = studentDetails.getStatus() != null ? studentDetails.getStatus()
                            : student.getStatus();

                    // Detect changes for history logging
                    boolean statusChanged = !newStatus.equals(oldStatus);
                    boolean examDetailsChanged = (newStatus.equals("Took Exam") &&
                            (!Objects.equals(student.getExamName(), studentDetails.getExamName()) ||
                                    !Objects.equals(student.getExamDate(), studentDetails.getExamDate())));
                    boolean rescheduleDetailsChanged = (newStatus.equals("Rescheduled") &&
                            (!Objects.equals(student.getRescheduledExamName(), studentDetails.getRescheduledExamName())
                                    ||
                                    !Objects.equals(student.getRescheduledExamDate(),
                                            studentDetails.getRescheduledExamDate())));
                    boolean commentChanged = !Objects.equals(student.getStatusComment(),
                            studentDetails.getStatusComment());

                    if (statusChanged || examDetailsChanged || rescheduleDetailsChanged || commentChanged) {
                        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                .format(new java.util.Date());
                        String logEntry = String.format("[%s] Status: %s", timestamp, newStatus);

                        if (newStatus.equals("Took Exam")) {
                            logEntry += String.format(" (Exam: %s on %s at %s)", studentDetails.getExamName(),
                                    studentDetails.getExamDate(), studentDetails.getExamTime());
                        } else if (newStatus.equals("Rescheduled")) {
                            logEntry += String.format(" (New Slot: %s on %s at %s)",
                                    studentDetails.getRescheduledExamName(), studentDetails.getRescheduledExamDate(),
                                    studentDetails.getRescheduledExamTime());
                        }

                        if (studentDetails.getStatusComment() != null && !studentDetails.getStatusComment().isEmpty()) {
                            logEntry += String.format(" | Reason: %s", studentDetails.getStatusComment());
                        }

                        String history = student.getStatusHistory();
                        student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
                    }

                    student.setStatus(newStatus);
                    student.setStatusComment(studentDetails.getStatusComment());
                    student.setExamName(studentDetails.getExamName());
                    student.setExamDate(studentDetails.getExamDate());
                    student.setExamTime(studentDetails.getExamTime());
                    student.setRescheduledExamName(studentDetails.getRescheduledExamName());
                    student.setRescheduledExamDate(studentDetails.getRescheduledExamDate());
                    student.setRescheduledExamTime(studentDetails.getRescheduledExamTime());

                    Student updatedStudent = studentRepository.save(student);
                    return new ResponseEntity<>(updatedStudent, HttpStatus.OK);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStudentStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest details) {
        return studentRepository.findById(id)
                .map(student -> {
                    String oldStatus = student.getStatus();
                    String newStatus = details.getStatus() != null ? details.getStatus() : oldStatus;

                    // History Logging Logic
                    boolean statusChanged = !newStatus.equals(oldStatus);
                    boolean examDetailsChanged = (newStatus.equals("Took Exam") &&
                            (!Objects.equals(student.getExamName(), details.getExamName()) ||
                                    !Objects.equals(student.getExamDate(), details.getExamDate())));
                    boolean rescheduleDetailsChanged = (newStatus.equals("Rescheduled") &&
                            (!Objects.equals(student.getRescheduledExamName(), details.getRescheduledExamName()) ||
                                    !Objects.equals(student.getRescheduledExamDate(),
                                            details.getRescheduledExamDate())));
                    boolean commentChanged = !Objects.equals(student.getStatusComment(), details.getStatusComment());

                    if (statusChanged || examDetailsChanged || rescheduleDetailsChanged || commentChanged) {
                        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                .format(new java.util.Date());
                        String logEntry = String.format("[%s] Status: %s", timestamp, newStatus);

                        if (newStatus.equals("Took Exam")) {
                            logEntry += String.format(" (Exam: %s on %s at %s)", details.getExamName(),
                                    details.getExamDate(), details.getExamTime());
                        } else if (newStatus.equals("Rescheduled")) {
                            logEntry += String.format(" (New Slot: %s on %s at %s)",
                                    details.getRescheduledExamName(), details.getRescheduledExamDate(),
                                    details.getRescheduledExamTime());
                        }

                        if (details.getStatusComment() != null && !details.getStatusComment().isEmpty()) {
                            logEntry += String.format(" | Reason: %s", details.getStatusComment());
                        }

                        String history = student.getStatusHistory();
                        student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
                    }

                    student.setStatus(newStatus);
                    student.setStatusComment(details.getStatusComment());
                    student.setExamName(details.getExamName());
                    student.setExamDate(details.getExamDate());
                    student.setExamTime(details.getExamTime());
                    student.setRescheduledExamName(details.getRescheduledExamName());
                    student.setRescheduledExamDate(details.getRescheduledExamDate());
                    student.setRescheduledExamTime(details.getRescheduledExamTime());

                    Student updatedStudent = studentRepository.save(student);
                    return new ResponseEntity<>(updatedStudent, HttpStatus.OK);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @lombok.Data
    public static class StatusUpdateRequest {
        private String status;
        private String statusComment;
        private String examName;
        private String examDate;
        private String examTime;
        private String rescheduledExamName;
        private String rescheduledExamDate;
        private String rescheduledExamTime;
    }

    @PostMapping("/bulk-assign")
    public ResponseEntity<Void> bulkAssign(@RequestBody BulkAssignRequest request) {
        List<Student> students = studentRepository.findAllById(request.getStudentIds());
        for (Student student : students) {
            student.setExamName(request.getExamName());
            student.setExamDate(request.getExamDate());
            student.setExamTime(request.getExamTime());

            // Add to history
            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
            String logEntry = String.format("[%s] Assigned to Exam: %s on %s at %s",
                    timestamp, request.getExamName(), request.getExamDate(), request.getExamTime());
            String history = student.getStatusHistory();
            student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
        }
        studentRepository.saveAll(students);
        return ResponseEntity.ok().build();
    }

    @lombok.Data
    public static class BulkAssignRequest {
        private List<Long> studentIds;
        private String examName;
        private String examDate;
        private String examTime;
    }

    // Helper class for consistent error responses
    @Getter
    @AllArgsConstructor
    private static class ErrorResponse {
        private final String message;
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        try {
            return studentRepository.findById(id)
                    .map(student -> {
                        // Soft-delete: Just set the flag to true
                        // This preserves historical records in test_student_groups, submissions, and
                        // codes
                        student.setIsDeleted(true);
                        studentRepository.save(student);
                        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
                    })
                    .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to delete student: " + e.getMessage()));
        }
    }
}
