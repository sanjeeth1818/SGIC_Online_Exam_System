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
import java.util.HashMap;
import java.util.Random;
import java.util.stream.Collectors;

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
                            map.put("studentName", student.getName());
                            map.put("studentEmail", student.getEmail());
                            map.put("examCode", code != null ? code.getExamCode() : "N/A");
                            map.put("status", code != null ? code.getStatus() : "PENDING");
                            map.put("examDate", group.getExamDate());
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

    @PostMapping
    public ResponseEntity<?> createTest(@Valid @RequestBody TestRequest testRequest) {
        System.out.println("Received request to create test: " + testRequest.getName());
        try {
            Test test = new Test();
            mapRequestToTest(testRequest, test);

            if (test.getStatus() == null) {
                test.setStatus("Published");
            }

            // Calculate student count
            int totalStudents = 0;
            if (test.getStudentGroups() != null) {
                totalStudents = test.getStudentGroups().stream()
                        .filter(g -> g.getStudents() != null)
                        .mapToInt(g -> g.getStudents().size())
                        .sum();
            }
            test.setStudentCount(totalStudents);

            // Save test first
            Test savedTest = testRepository.save(test);

            // Handle notifications in a separate try block
            try {
                if ("Published".equalsIgnoreCase(savedTest.getStatus())) {
                    notifyScheduledStudents(savedTest);
                }
            } catch (Exception e) {
                System.err.println("Non-critical error during student notification: " + e.getMessage());
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

            mapRequestToTest(testRequest, test);

            int totalStudents = 0;
            if (test.getStudentGroups() != null) {
                totalStudents = test.getStudentGroups().stream()
                        .filter(g -> g.getStudents() != null)
                        .mapToInt(g -> g.getStudents().size())
                        .sum();
            }
            test.setStudentCount(totalStudents);

            Test savedTest = testRepository.save(test);

            try {
                if ("Published".equalsIgnoreCase(savedTest.getStatus())) {
                    notifyScheduledStudents(savedTest);
                }
            } catch (Exception e) {
                System.err.println("Non-critical error during student notification: " + e.getMessage());
                e.printStackTrace();
            }

            return ResponseEntity.ok(convertToResponse(savedTest));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Failed to update test: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTest(@PathVariable Long id) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            testRepository.delete(test);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TestResponse> updateStatus(@PathVariable Long id, @RequestBody String status) {
        try {
            Test test = testRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Test not found"));

            String newStatus = status.replace("\"", "");
            test.setStatus(newStatus);
            Test savedTest = testRepository.save(test);

            if ("Published".equalsIgnoreCase(newStatus)) {
                notifyScheduledStudents(savedTest);
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

                for (Student student : group.getStudents()) {
                    System.out.println("Processing student: " + student.getName() + " (" + student.getEmail() + ")");

                    final boolean[] isNew = { false };
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

                    if (isNew[0]) {
                        emailService.sendSchedulingEmail(student, test, codeEntry.getExamCode(), examDate);
                    } else {
                        System.out.println(
                                "Student " + student.getEmail() + " already has a code. Skipping notification.");
                    }
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
            List<Question> questions = questionRepository.findAllById(req.getManualQuestionIds());
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
                            List<Student> students = studentRepository.findAllById(gReq.getStudentIds());
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
