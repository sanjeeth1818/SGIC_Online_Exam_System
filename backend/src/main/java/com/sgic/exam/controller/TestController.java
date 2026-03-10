package com.sgic.exam.controller;

import com.sgic.exam.dto.TestResponse;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestCategoryConfig;
import com.sgic.exam.model.TestStudentGroup;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.StudentRepository;
import com.sgic.exam.repository.TestRepository;
import com.sgic.exam.model.Student;
import com.sgic.exam.model.Question;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.service.EmailService;
import com.sgic.exam.repository.StudentExamCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.HashSet;
import java.util.Objects;

@RestController
@RequestMapping("/api/tests")
public class TestController {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping("/{id}/student-codes")
    public ResponseEntity<?> getStudentCodes(@PathVariable Long id) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            List<Map<String, Object>> result = new java.util.ArrayList<>();

            if (test.getStudentGroups() != null) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    if (group.getStudents() != null) {
                        for (Student student : group.getStudents()) {
                            StudentExamCode code = studentExamCodeRepository
                                    .findByTestIdAndStudentId(test.getId(), student.getId())
                                    .orElse(null);

                            Map<String, Object> map = new HashMap<>();
                            map.put("studentId", student.getId());
                            map.put("studentName", student.getName());
                            map.put("studentEmail", student.getEmail());
                            map.put("examCode", code != null ? code.getExamCode() : "N/A");
                            map.put("status", code != null ? code.getStatus() : "PENDING");
                            map.put("examDate", group.getExamDate());
                            map.put("additionalTime",
                                    code != null && code.getAdditionalTime() != null ? code.getAdditionalTime() : 0);
                            map.put("timeExtensionComment", code != null ? code.getTimeExtensionComment() : null);
                            result.add(map);
                        }
                    }
                }
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Error fetching student codes: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/add-time")
    public ResponseEntity<?> addExtraTime(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            Object studentIdsObj = payload.get("studentIds");
            if (studentIdsObj == null || !(studentIdsObj instanceof List)) {
                return ResponseEntity.badRequest().body(Map.of("message", "studentIds must be a valid list."));
            }

            List<?> rawList = (List<?>) studentIdsObj;
            List<Long> studentIds = rawList.stream()
                    .filter(idObj -> idObj != null)
                    .map(idObj -> Long.valueOf(idObj.toString()))
                    .collect(Collectors.toList());

            Integer extraTime = payload.get("extraTime") != null ? Integer.valueOf(payload.get("extraTime").toString())
                    : null;
            String comment = (String) payload.get("comment");

            if (extraTime == null || extraTime <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Extra time must be greater than 0."));
            }

            for (Long studentId : studentIds) {
                Optional<StudentExamCode> codeOpt = studentExamCodeRepository.findByTestIdAndStudentId(test.getId(),
                        studentId);
                if (codeOpt.isPresent()) {
                    StudentExamCode code = codeOpt.get();
                    code.setTimeExtensionComment(comment);

                    // Re-open if finished
                    if ("USED".equalsIgnoreCase(code.getStatus())) {
                        code.setStatus("ACTIVE");
                        code.setIsReopened(true);
                        code.setAdditionalTime(extraTime); // FRESH start for re-opening
                        code.setStartedAt(null);
                        code.setCurrentSessionToken(null);
                    } else {
                        // Accumulate time if already active/started
                        code.setAdditionalTime(
                                (code.getAdditionalTime() != null ? code.getAdditionalTime() : 0) + extraTime);
                    }

                    studentExamCodeRepository.save(code);

                    // Update Student Entity Status History
                    Optional<Student> studentOpt = studentRepository.findById(Objects.requireNonNull(studentId));
                    if (studentOpt.isPresent()) {
                        Student student = studentOpt.get();
                        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                .format(new java.util.Date());
                        String logEntry = String.format("[%s] Added %d mins extra time for Exam: %s. Reason: %s",
                                timestamp, extraTime, test.getName(), comment != null ? comment : "No comment");
                        String history = student.getStatusHistory();
                        student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
                        studentRepository.save(student);
                    }
                }
            }
            return ResponseEntity.ok(Map.of("message", "Successfully added extra time."));
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR in addExtraTime:");
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of(
                            "message", "Error adding extra time: " + e.getMessage(),
                            "details", e.getClass().getName()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllTests() {
        try {
            List<Test> tests = testRepository.findAll();
            List<TestResponse> response = tests.stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Error fetching tests: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTestById(@PathVariable Long id) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found with id: " + id));
            return ResponseEntity.ok(convertToResponse(test));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(404).body(Map.of("message", "Test not found: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createTest(@Valid @RequestBody TestRequest testRequest) {
        System.out.println("Received request to create test: " + testRequest.getName());
        try {
            Test test = new Test();
            mapRequestToTest(testRequest, test);

            if (test.getStatus() == null) {
                test.setStatus("Published");
            }

            // Calculate student count (Total unique assigned students)
            int totalStudents = 0;
            if (test.getStudentGroups() != null) {
                Set<Long> uniqueIds = new HashSet<>();
                for (TestStudentGroup group : test.getStudentGroups()) {
                    if (group.getStudents() != null) {
                        for (Student s : group.getStudents()) {
                            uniqueIds.add(s.getId());
                        }
                    }
                }
                totalStudents = uniqueIds.size();
            }
            test.setStudentCount(totalStudents);

            // Save test first
            Test savedTest = testRepository.save(test);

            // Handle notifications in a separate try block
            try {
                if ("Published".equalsIgnoreCase(savedTest.getStatus())) {
                    notifyScheduledStudents(savedTest);
                    emailService.sendAdminTestCreationNotification(savedTest);
                }
            } catch (Exception e) {
                System.err.println("Non-critical error during notifications: " + e.getMessage());
                e.printStackTrace();
                // We DON'T return 500 here because the test IS saved.
            }

            return ResponseEntity.ok(convertToResponse(savedTest));
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR creating test:");
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Failed to create test: " + e.getMessage(),
                    "type", e.getClass().getSimpleName()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTest(@PathVariable Long id, @Valid @RequestBody TestRequest testRequest) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            // Identify removed students to update their status
            Set<Long> oldStudentIds = new HashSet<>();
            if (test.getStudentGroups() != null) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    if (group.getStudents() != null) {
                        for (Student s : group.getStudents()) {
                            oldStudentIds.add(s.getId());
                        }
                    }
                }
            }

            mapRequestToTest(testRequest, test);

            Set<Long> newStudentIds = new HashSet<>();
            if (test.getStudentGroups() != null) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    if (group.getStudents() != null) {
                        for (Student s : group.getStudents()) {
                            newStudentIds.add(s.getId());
                        }
                    }
                }
            }

            // --- PARTICIPATION SAFEGUARD: Check for locked students before removal ---
            java.util.List<String> lockedStudentNames = new java.util.ArrayList<>();
            for (Long oldId : oldStudentIds) {
                if (!newStudentIds.contains(oldId)) {
                    studentExamCodeRepository.findByTestIdAndStudentId(test.getId(), oldId).ifPresent(code -> {
                        String status = code.getStatus();
                        if ("STARTED".equalsIgnoreCase(status) || "USED".equalsIgnoreCase(status)) {
                            studentRepository.findById(oldId).ifPresent(s -> lockedStudentNames.add(s.getName()));
                        }
                    });
                }
            }

            if (!lockedStudentNames.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Cannot remove students who have already started or finished the exam: "
                                + String.join(", ", lockedStudentNames)
                                + ". Please complete or cancel their sessions first if necessary."));
            }
            // ------------------------------------------------------------------------

            // Students in old but not in new: Remove allocation
            List<com.sgic.exam.model.Student> removedStudents = new java.util.ArrayList<>();
            for (Long oldId : oldStudentIds) {
                if (!newStudentIds.contains(oldId)) {
                    studentRepository.findById(oldId).ifPresent(student -> {
                        // Send Cancellation Email
                        if ("Allocated".equals(student.getStatus()) || "Rescheduled".equals(student.getStatus())) {
                            emailService.sendCancellationStudentNotification(student, test);
                            removedStudents.add(student);
                        }

                        student.setStatus("Have to Reschedule");
                        student.setStatusComment("Removed from Examination: " + test.getName());
                        student.setExamName(null);
                        student.setExamDate(null);
                        student.setExamCode(null);

                        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                .format(new java.util.Date());
                        String logEntry = String.format("[%s] Status: Have to Reschedule (Removed from %s)",
                                timestamp, test.getName());
                        String history = student.getStatusHistory();
                        student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);

                        studentRepository.save(student);

                        // Also remove the exam code entry
                        studentExamCodeRepository.findByTestIdAndStudentId(test.getId(), oldId)
                                .ifPresent(studentExamCodeRepository::delete);
                    });
                }
            }

            if (!removedStudents.isEmpty()) {
                emailService.sendCancellationAdminNotification(test, removedStudents,
                        "Students were removed from the examination during an update.");
            }

            int totalStudents = newStudentIds.size();
            test.setStudentCount(totalStudents);

            Test savedTest = testRepository.save(test);

            try {
                if ("Published".equalsIgnoreCase(savedTest.getStatus())) {
                    notifyScheduledStudents(savedTest);
                    emailService.sendAdminTestUpdateNotification(savedTest);
                }
            } catch (Exception e) {
                System.err.println("Non-critical error during notification: " + e.getMessage());
                e.printStackTrace();
            }

            return ResponseEntity.ok(convertToResponse(savedTest));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Failed to update test: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTest(@PathVariable Long id) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            // --- PARTICIPATION SAFEGUARD: Check if any student has started or finished ---
            java.util.List<StudentExamCode> codes = studentExamCodeRepository.findByTestId(test.getId());
            boolean hasStartedOrUsed = codes.stream()
                    .anyMatch(c -> "STARTED".equalsIgnoreCase(c.getStatus()) || "USED".equalsIgnoreCase(c.getStatus()));

            if (hasStartedOrUsed) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message",
                        "Cannot delete an examination that is currently in progress or already completed by students. "
                                +
                                "(One or more students have already used their access codes)"));
            }
            // ------------------------------------------------------------------------------

            // Notify students and update status before deletion
            if (test.getStudentGroups() != null) {
                List<com.sgic.exam.model.Student> affectedStudents = new java.util.ArrayList<>();
                for (TestStudentGroup group : test.getStudentGroups()) {
                    if (group.getStudents() != null) {
                        for (com.sgic.exam.model.Student s : group.getStudents()) {
                            if ("Allocated".equals(s.getStatus()) || "Rescheduled".equals(s.getStatus())) {
                                emailService.sendCancellationStudentNotification(s, test);

                                // Update Student Status
                                String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                        .format(new java.util.Date());
                                String log = String.format(
                                        "[%s] Status: Have to Reschedule (Exam '%s' was deleted by admin)", timestamp,
                                        test.getName());
                                String history = s.getStatusHistory();
                                s.setStatusHistory(history == null ? log : log + "\n" + history);
                                s.setStatus("Have to Reschedule");
                                s.setExamName(null);
                                s.setExamDate(null);
                                s.setExamCode(null);
                                studentRepository.save(s);
                                affectedStudents.add(s);
                            }
                        }
                    }
                }
                if (!affectedStudents.isEmpty()) {
                    emailService.sendCancellationAdminNotification(test, affectedStudents,
                            "Examination was deleted from the system.");
                }
            }

            // Cleanup codes
            studentExamCodeRepository.deleteByTestId(test.getId());

            testRepository.delete(test);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody String status) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            String newStatus = status.replace("\"", "");
            test.setStatus(newStatus);
            Test savedTest = testRepository.save(test);

            if ("Published".equalsIgnoreCase(newStatus)) {
                notifyScheduledStudents(savedTest);
                emailService.sendAdminTestCreationNotification(savedTest);
            }

            return ResponseEntity.ok(convertToResponse(savedTest));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    private TestResponse convertToResponse(Test test) {
        TestResponse resp = new TestResponse();
        resp.setId(test.getId());
        resp.setName(test.getName());
        resp.setDescription(test.getDescription());
        resp.setSelectionMode(test.getSelectionMode());
        resp.setActivateImmediately(test.getActivateImmediately());
        resp.setTimeMode(test.getTimeMode());
        resp.setTimeValue(test.getTimeValue());
        resp.setTimeUnit(test.getTimeUnit());
        resp.setExamMode(test.getExamMode());
        resp.setShowResult(test.getShowResult());
        resp.setShowAnswers(test.getShowAnswers());
        resp.setStatus(test.getStatus());
        resp.setTotalQuestions(test.getTotalQuestions());
        resp.setStudentCount(test.getStudentCount());

        if (test.getCategoryConfigs() != null) {
            resp.setCategoryConfigs(test.getCategoryConfigs().stream().map(c -> {
                TestResponse.CategoryConfigDTO dto = new TestResponse.CategoryConfigDTO();
                dto.setId(c.getId());
                dto.setCategoryId(c.getCategoryId());
                dto.setCategoryName(c.getCategoryName());
                dto.setQuestionCount(c.getQuestionCount());
                return dto;
            }).collect(Collectors.toList()));
        }

        if (test.getStudentGroups() != null) {
            resp.setStudentGroups(test.getStudentGroups().stream().map(g -> {
                TestResponse.StudentGroupDTO dto = new TestResponse.StudentGroupDTO();
                dto.setId(g.getId());
                dto.setExamDate(g.getExamDate());
                if (g.getStudents() != null) {
                    dto.setStudents(g.getStudents().stream().map(s -> {
                        TestResponse.StudentDTO sDto = new TestResponse.StudentDTO();
                        sDto.setId(s.getId());
                        sDto.setName(s.getName());
                        sDto.setEmail(s.getEmail());
                        sDto.setStatus(s.getStatus());
                        return sDto;
                    }).collect(Collectors.toList()));
                }
                return dto;
            }).collect(Collectors.toList()));
        }

        if (test.getManualQuestions() != null) {
            resp.setManualQuestions(test.getManualQuestions().stream().map(q -> {
                TestResponse.QuestionDTO qDto = new TestResponse.QuestionDTO();
                qDto.setId(q.getId());
                qDto.setText(q.getText());
                qDto.setType(q.getType());
                if (q.getCategory() != null) {
                    qDto.setCategoryName(q.getCategory().getName());
                }
                return qDto;
            }).collect(Collectors.toList()));
        }

        return resp;
    }

    private void notifyScheduledStudents(Test test) {
        try {
            System.out.println("Starting notification process for Test ID: " + test.getId() + " (" + test.getName()
                    + "), Status: " + test.getStatus());

            if (test.getStudentGroups() == null || test.getStudentGroups().isEmpty()) {
                System.out.println("No student groups found for this test. Skipping notifications.");
                return;
            }

            System.out.println("Found " + test.getStudentGroups().size() + " student groups.");

            for (TestStudentGroup group : test.getStudentGroups()) {
                if (group.getStudents() == null || group.getStudents().isEmpty()) {
                    System.out.println("Group ID " + group.getId() + " has no students. Skipping.");
                    continue;
                }

                String examDate = group.getExamDate() != null ? group.getExamDate() : "TBD";
                System.out.println(
                        "Processing group with " + group.getStudents().size() + " students for exam date: " + examDate);

                List<com.sgic.exam.model.Student> shiftedStudents = new java.util.ArrayList<>();
                String previousDateForShift = null;

                for (Student student : group.getStudents()) {
                    System.out.println("Processing student: " + student.getName() + " (" + student.getEmail() + ")");

                    final boolean[] isNew = { false };
                    final boolean[] dateChanged = { false };
                    final String[] oldDate = { null };

                    // Check if an existing code exists for this student/test
                    Optional<StudentExamCode> existingCode = studentExamCodeRepository
                            .findByTestIdAndStudentId(test.getId(), student.getId());

                    if (existingCode.isPresent()) {
                        oldDate[0] = existingCode.get().getExpiryDate();
                        // If date changed, we'll replace the code
                        if (!examDate.equals(oldDate[0])) {
                            System.out.println(
                                    "Exam date changed for student " + student.getName() + ". Replacing old code.");
                            studentExamCodeRepository.delete(existingCode.get());
                            dateChanged[0] = true;
                        }
                    }

                    StudentExamCode codeEntry = studentExamCodeRepository
                            .findByTestIdAndStudentId(test.getId(), student.getId())
                            .orElseGet(() -> {
                                System.out.println("Generating new 4-digit code for student ID: " + student.getId());
                                StudentExamCode newEntry = new StudentExamCode();
                                newEntry.setTestId(test.getId());
                                newEntry.setStudentId(student.getId());
                                newEntry.setExamCode(generateUniqueExamCode());
                                newEntry.setExpiryDate(examDate);
                                isNew[0] = true;
                                return studentExamCodeRepository.save(newEntry);
                            });

                    // Handle email notifications and status updates
                    try {
                        com.sgic.exam.model.Student studentEntity = studentRepository
                                .findById(Objects.requireNonNull(student.getId()))
                                .orElse(null);

                        if (studentEntity != null) {
                            String oldStatus = studentEntity.getStatus();
                            boolean needsUpdate = isNew[0] || dateChanged[0] || (!"Took Exam".equals(oldStatus)
                                    && !"Allocated".equals(oldStatus)
                                    && !"Rescheduled".equals(oldStatus));

                            if (needsUpdate) {
                                String newStatus = "Allocated";
                                if (dateChanged[0] && oldDate[0] != null) {
                                    newStatus = "Rescheduled";
                                    // Professional Date Shift Notification
                                    emailService.sendBatchDateChangeStudentNotification(studentEntity, test, oldDate[0],
                                            examDate, codeEntry.getExamCode());
                                    shiftedStudents.add(studentEntity);
                                    previousDateForShift = oldDate[0];
                                } else if ("Have to Reschedule".equalsIgnoreCase(oldStatus)
                                        || "Rescheduled".equalsIgnoreCase(oldStatus)) {
                                    newStatus = "Rescheduled";
                                    emailService.sendReschedulingEmail(studentEntity, test, codeEntry.getExamCode(),
                                            examDate);
                                } else if (isNew[0]) {
                                    emailService.sendSchedulingEmail(studentEntity, test, codeEntry.getExamCode(),
                                            examDate);
                                }

                                String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                        .format(new java.util.Date());
                                String logEntry = String.format("[%s] Status: %s (Exam: %s on %s, Code: %s)",
                                        timestamp, newStatus, test.getName(), examDate, codeEntry.getExamCode());
                                String history = studentEntity.getStatusHistory();
                                studentEntity.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);

                                studentEntity.setStatus(newStatus);
                                studentEntity.setExamName(test.getName());
                                studentEntity.setExamDate(examDate);
                                studentEntity.setExamCode(codeEntry.getExamCode());
                                studentRepository.save(studentEntity);
                            }
                        }
                    } catch (Exception statusEx) {
                        System.err.println("Warning: Could not update student status: " + statusEx.getMessage());
                    }
                }

                // Send Admin Summary for this batch shift
                if (!shiftedStudents.isEmpty() && previousDateForShift != null) {
                    emailService.sendBatchDateChangeAdminNotification(test, previousDateForShift, examDate,
                            shiftedStudents);
                }
            }
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR in notifyScheduledStudents: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String generateUniqueExamCode() {
        Random random = new Random();
        int code = 1000 + random.nextInt(9000);
        return String.valueOf(code);
    }

    private void mapRequestToTest(TestRequest req, Test test) {
        test.setName(req.getName());
        test.setDescription(req.getDescription());
        test.setSelectionMode(req.getSelectionMode());
        test.setActivateImmediately(req.getActivateImmediately());
        test.setTimeMode(req.getTimeMode());
        test.setTimeValue(req.getTimeValue() != null ? req.getTimeValue().toString() : "60");
        test.setTimeUnit(req.getTimeUnit());
        test.setExamMode(req.getExamMode());
        test.setShowResult(req.getShowResult());
        test.setShowAnswers(req.getShowAnswers());
        test.setStatus(req.getStatus());
        test.setTotalQuestions(req.getTotalQuestions());

        if (req.getManualQuestionIds() != null) {
            List<Question> questions = questionRepository
                    .findAllById(Objects.requireNonNull(req.getManualQuestionIds()));
            if (test.getManualQuestions() != null) {
                test.getManualQuestions().clear();
                test.getManualQuestions().addAll(questions);
            } else {
                test.setManualQuestions(questions);
            }
        }

        if (req.getCategoryConfigs() != null) {
            List<TestCategoryConfig> configs = req.getCategoryConfigs().stream()
                    .map(cReq -> {
                        TestCategoryConfig config = new TestCategoryConfig();
                        config.setCategoryId(cReq.getCategoryId());
                        config.setCategoryName(cReq.getCategoryName());
                        config.setQuestionCount(cReq.getQuestionCount());
                        return config;
                    }).collect(Collectors.toList());

            if (test.getCategoryConfigs() != null) {
                test.getCategoryConfigs().clear();
                test.getCategoryConfigs().addAll(configs);
            } else {
                test.setCategoryConfigs(configs);
            }
        }

        if (req.getStudentGroups() != null) {
            List<TestStudentGroup> groups = req.getStudentGroups().stream()
                    .map(gReq -> {
                        TestStudentGroup group = new TestStudentGroup();
                        group.setExamDate(gReq.getExamDate());
                        if (gReq.getStudentIds() != null) {
                            List<Student> students = studentRepository
                                    .findAllById(Objects.requireNonNull(gReq.getStudentIds()));
                            group.setStudents(students);
                        }
                        return group;
                    }).collect(Collectors.toList());

            if (test.getStudentGroups() != null) {
                test.getStudentGroups().clear();
                test.getStudentGroups().addAll(groups);
            } else {
                test.setStudentGroups(groups);
            }
        }
    }

    @lombok.Data
    public static class TestRequest {
        private String name;
        private String description;
        private String selectionMode;
        private Boolean activateImmediately;
        private Long testId;
        private String timeMode;
        private Object timeValue; // Can be string or int from frontend
        private String timeUnit;
        private String examMode;
        private Boolean showResult;
        private Boolean showAnswers;
        private String status;
        private Integer totalQuestions;
        private List<Long> manualQuestionIds;
        private List<CategoryConfigRequest> categoryConfigs;
        private List<StudentGroupRequest> studentGroups;
    }

    @lombok.Data
    public static class CategoryConfigRequest {
        private Long categoryId;
        private String categoryName;
        private Integer questionCount;
    }

    @lombok.Data
    public static class StudentGroupRequest {
        private String examDate;
        private List<Long> studentIds;
    }
}
