package com.sgic.exam.service;

import com.sgic.exam.dto.BulkAssignRequest;
import com.sgic.exam.dto.StatusUpdateRequest;
import com.sgic.exam.dto.StudentRequest;
import com.sgic.exam.dto.StudentResponse;
import com.sgic.exam.model.Student;
import com.sgic.exam.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class StudentServiceImpl implements StudentService {

    @Autowired
    private StudentRepository studentRepository;

    @Override
    @Transactional
    public StudentResponse addStudent(StudentRequest request) {
        if (studentRepository.existsByNicAndIsDeletedFalse(request.getNic())) {
            throw new RuntimeException("NIC already exists in the system");
        }

        Student student = new Student();
        mapRequestToEntity(request, student);

        if (student.getRegisteredDate() == null) {
            student.setRegisteredDate(LocalDate.now());
        }

        Student saved = studentRepository.save(student);
        return mapToResponse(saved);
    }

    @Override
    public List<StudentResponse> getAllStudents() {
        return studentRepository.findAllByIsDeletedFalse().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public StudentResponse getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));
        return mapToResponse(student);
    }

    @Override
    @Transactional
    public StudentResponse updateStudent(Long id, StudentRequest request) {
        if (studentRepository.existsByNicAndIdNotAndIsDeletedFalse(request.getNic(), id)) {
            throw new RuntimeException("NIC already exists for another student");
        }

        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));

        updateHistoryIfChanged(student, request);
        mapRequestToEntity(request, student);

        Student updated = studentRepository.save(student);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public StudentResponse updateStudentStatus(Long id, StatusUpdateRequest request) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));

        updateHistoryIfStatusChanged(student, request);

        student.setStatus(request.getStatus() != null ? request.getStatus() : student.getStatus());
        student.setStatusComment(request.getStatusComment());
        student.setExamName(request.getExamName());
        student.setExamDate(request.getExamDate());
        student.setExamTime(request.getExamTime());
        student.setRescheduledExamName(request.getRescheduledExamName());
        student.setRescheduledExamDate(request.getRescheduledExamDate());
        student.setRescheduledExamTime(request.getRescheduledExamTime());

        Student updated = studentRepository.save(student);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void bulkAssign(BulkAssignRequest request) {
        List<Student> students = studentRepository.findAllById(request.getStudentIds());
        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());

        for (Student student : students) {
            student.setExamName(request.getExamName());
            student.setExamDate(request.getExamDate());
            student.setExamTime(request.getExamTime());

            String logEntry = String.format("[%s] Assigned to Exam: %s on %s at %s",
                    timestamp, request.getExamName(), request.getExamDate(), request.getExamTime());
            String history = student.getStatusHistory();
            student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
        }
        studentRepository.saveAll(students);
    }

    @Override
    @Transactional
    public void deleteStudent(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found with id: " + id));

        student.setIsDeleted(true);
        studentRepository.save(student);
    }

    private void mapRequestToEntity(StudentRequest request, Student student) {
        student.setName(request.getName());
        student.setAddress(request.getAddress());
        student.setMobileNumber(request.getMobileNumber());
        student.setNic(request.getNic());
        student.setEmail(request.getEmail());
        student.setRegisteredDate(request.getRegisteredDate());
        student.setStatus(request.getStatus());
        student.setStatusComment(request.getStatusComment());
        student.setExamName(request.getExamName());
        student.setExamDate(request.getExamDate());
        student.setExamTime(request.getExamTime());
        student.setExamCode(request.getExamCode());
        student.setRescheduledExamName(request.getRescheduledExamName());
        student.setRescheduledExamDate(request.getRescheduledExamDate());
        student.setRescheduledExamTime(request.getRescheduledExamTime());
    }

    private StudentResponse mapToResponse(Student student) {
        StudentResponse response = new StudentResponse();
        response.setId(student.getId());
        response.setName(student.getName());
        response.setAddress(student.getAddress());
        response.setMobileNumber(student.getMobileNumber());
        response.setNic(student.getNic());
        response.setEmail(student.getEmail());
        response.setRegisteredDate(student.getRegisteredDate());
        response.setStatus(student.getStatus());
        response.setStatusComment(student.getStatusComment());
        response.setStatusHistory(student.getStatusHistory());
        response.setExamName(student.getExamName());
        response.setExamDate(student.getExamDate());
        response.setExamTime(student.getExamTime());
        response.setExamCode(student.getExamCode());
        response.setRescheduledExamName(student.getRescheduledExamName());
        response.setRescheduledExamDate(student.getRescheduledExamDate());
        response.setRescheduledExamTime(student.getRescheduledExamTime());
        return response;
    }

    private void updateHistoryIfChanged(Student student, StudentRequest request) {
        String oldStatus = student.getStatus();
        String newStatus = request.getStatus() != null ? request.getStatus() : oldStatus;

        boolean statusChanged = !newStatus.equals(oldStatus);
        boolean examDetailsChanged = (newStatus.equals("Took Exam") &&
                (!Objects.equals(student.getExamName(), request.getExamName()) ||
                        !Objects.equals(student.getExamDate(), request.getExamDate())));
        boolean rescheduleDetailsChanged = (newStatus.equals("Rescheduled") &&
                (!Objects.equals(student.getRescheduledExamName(), request.getRescheduledExamName()) ||
                        !Objects.equals(student.getRescheduledExamDate(), request.getRescheduledExamDate())));
        boolean commentChanged = !Objects.equals(student.getStatusComment(), request.getStatusComment());

        if (statusChanged || examDetailsChanged || rescheduleDetailsChanged || commentChanged) {
            String logEntry = formatLogEntry(newStatus, request.getExamName(), request.getExamDate(),
                    request.getExamTime(),
                    request.getRescheduledExamName(), request.getRescheduledExamDate(),
                    request.getRescheduledExamTime(),
                    request.getStatusComment());

            String history = student.getStatusHistory();
            student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
        }
    }

    private void updateHistoryIfStatusChanged(Student student, StatusUpdateRequest request) {
        String oldStatus = student.getStatus();
        String newStatus = request.getStatus() != null ? request.getStatus() : oldStatus;

        boolean statusChanged = !newStatus.equals(oldStatus);
        boolean examDetailsChanged = (newStatus.equals("Took Exam") &&
                (!Objects.equals(student.getExamName(), request.getExamName()) ||
                        !Objects.equals(student.getExamDate(), request.getExamDate())));
        boolean rescheduleDetailsChanged = (newStatus.equals("Rescheduled") &&
                (!Objects.equals(student.getRescheduledExamName(), request.getRescheduledExamName()) ||
                        !Objects.equals(student.getRescheduledExamDate(), request.getRescheduledExamDate())));
        boolean commentChanged = !Objects.equals(student.getStatusComment(), request.getStatusComment());

        if (statusChanged || examDetailsChanged || rescheduleDetailsChanged || commentChanged) {
            String logEntry = formatLogEntry(newStatus, request.getExamName(), request.getExamDate(),
                    request.getExamTime(),
                    request.getRescheduledExamName(), request.getRescheduledExamDate(),
                    request.getRescheduledExamTime(),
                    request.getStatusComment());

            String history = student.getStatusHistory();
            student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
        }
    }

    private String formatLogEntry(String status, String examName, String examDate, String examTime,
            String reschName, String reschDate, String reschTime, String comment) {
        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
        StringBuilder sb = new StringBuilder(String.format("[%s] Status: %s", timestamp, status));

        if ("Took Exam".equals(status)) {
            sb.append(String.format(" (Exam: %s on %s at %s)", examName, examDate, examTime));
        } else if ("Rescheduled".equals(status)) {
            sb.append(String.format(" (New Slot: %s on %s at %s)", reschName, reschDate, reschTime));
        }

        if (comment != null && !comment.isEmpty()) {
            sb.append(String.format(" | Reason: %s", comment));
        }

        return sb.toString();
    }
}
