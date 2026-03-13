package com.sgic.exam.service;

import com.sgic.exam.dto.TestRequest;
import com.sgic.exam.dto.TestResponse;
import com.sgic.exam.model.*;
import com.sgic.exam.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TestServiceImpl implements TestService {

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

    @Override
    public List<TestResponse> getAllTests() {
        List<Test> tests = testRepository.findAllByIsDeletedFalseOrIsDeletedIsNull();
        return tests.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public TestResponse getTestById(Long id) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found with id: " + id));
        return convertToResponse(test);
    }

    @Override
    @Transactional
    public TestResponse createTest(TestRequest request) {
        if (testRepository.existsByName(request.getName())) {
            throw new RuntimeException("An examination with this name already exists. Please use a unique title.");
        }

        Test test = new Test();
        mapRequestToTest(request, test);
        test.setStatus(calculateStatusForTest(test));
        test.setStudentCount(calculateUniqueStudentCount(test));

        Test savedTest = testRepository.save(test);

        try {
            notifyScheduledStudents(savedTest);
            emailService.sendAdminTestCreationNotification(savedTest);
        } catch (Exception e) {
            System.err.println("Non-critical error during notifications: " + e.getMessage());
        }

        return convertToResponse(savedTest);
    }

    @Override
    @Transactional
    public TestResponse updateTest(Long id, TestRequest request) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found"));

        String previousStatus = test.getStatus();
        Set<Long> oldStudentIds = getAssignedStudentIds(test);

        mapRequestToTest(request, test);
        Set<Long> newStudentIds = getAssignedStudentIds(test);

        // Participation Safeguard
        validateStudentRemoval(test.getId(), oldStudentIds, newStudentIds);

        // Handle removals
        handleRemovedStudents(test, oldStudentIds, newStudentIds);

        test.setStudentCount(newStudentIds.size());
        test.setStatus(calculateStatusForTest(test));

        Test savedTest = testRepository.save(test);

        try {
            notifyScheduledStudents(savedTest);
            emailService.sendAdminTestUpdateNotification(savedTest, previousStatus);
        } catch (Exception e) {
            System.err.println("Non-critical error during notification: " + e.getMessage());
        }

        return convertToResponse(savedTest);
    }

    @Override
    @Transactional
    public void deleteTest(Long id) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found"));

        if (test.getStudentGroups() != null) {
            List<Student> affectedStudents = new ArrayList<>();
            for (TestStudentGroup group : test.getStudentGroups()) {
                if (group.getStudents() != null) {
                    for (Student s : group.getStudents()) {
                        if ("Allocated".equals(s.getStatus()) || "Rescheduled".equals(s.getStatus())) {
                            emailService.sendCancellationStudentNotification(s, test);
                            updateStudentStatusToReschedule(s, test.getName());
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

        List<StudentExamCode> codes = studentExamCodeRepository.findByTestId(test.getId());
        for (StudentExamCode code : codes) {
            if (!"USED".equalsIgnoreCase(code.getStatus())) {
                code.setStatus("CANCELLED");
                studentExamCodeRepository.save(code);
            }
        }

        test.setIsDeleted(true);
        test.setStatus("Draft");
        testRepository.save(test);
    }

    @Override
    @Transactional
    public TestResponse updateStatus(Long id, String status) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found"));

        String newStatus = status.replace("\"", "");
        test.setStatus(newStatus);
        Test savedTest = testRepository.save(test);

        if ("Published".equalsIgnoreCase(newStatus)) {
            notifyScheduledStudents(savedTest);
            emailService.sendAdminTestCreationNotification(savedTest);
        }

        return convertToResponse(savedTest);
    }

    @Override
    public List<Map<String, String>> getStudentCodes(Long id) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found"));

        List<Map<String, String>> result = new ArrayList<>();
        if (test.getStudentGroups() != null) {
            for (TestStudentGroup group : test.getStudentGroups()) {
                if (group.getStudents() != null) {
                    for (Student student : group.getStudents()) {
                        StudentExamCode code = studentExamCodeRepository
                                .findByTestIdAndStudentId(test.getId(), student.getId())
                                .orElse(null);

                        Map<String, String> map = new HashMap<>();
                        map.put("studentId", String.valueOf(student.getId()));
                        map.put("studentName", student.getName());
                        map.put("studentEmail", student.getEmail());
                        map.put("examCode", code != null ? code.getExamCode() : "N/A");
                        map.put("status", code != null ? code.getStatus() : "PENDING");
                        map.put("examDate", group.getExamDate());
                        map.put("additionalTime", String.valueOf(
                                code != null && code.getAdditionalTime() != null ? code.getAdditionalTime() : 0));
                        map.put("timeExtensionComment", code != null ? code.getTimeExtensionComment() : null);
                        result.add(map);
                    }
                }
            }
        }
        return result;
    }

    @Override
    @Transactional
    public TestResponse addExtraTime(Long id, Map<String, Object> payload) {
        Test test = testRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Test not found"));

        Object studentIdsObj = payload.get("studentIds");
        if (studentIdsObj == null || !(studentIdsObj instanceof List)) {
            throw new RuntimeException("studentIds must be a valid list.");
        }

        List<?> rawList = (List<?>) studentIdsObj;
        List<Long> studentIds = rawList.stream()
                .filter(Objects::nonNull)
                .map(idObj -> Long.valueOf(idObj.toString()))
                .collect(Collectors.toList());

        Integer extraTime = payload.get("extraTime") != null ? Integer.valueOf(payload.get("extraTime").toString())
                : null;
        String comment = (String) payload.get("comment");

        if (extraTime == null || extraTime <= 0) {
            throw new RuntimeException("Extra time must be greater than 0.");
        }

        for (Long studentId : studentIds) {
            Optional<StudentExamCode> codeOpt = studentExamCodeRepository.findByTestIdAndStudentId(test.getId(),
                    studentId);
            if (codeOpt.isPresent()) {
                StudentExamCode code = codeOpt.get();
                code.setTimeExtensionComment(comment);

                if ("USED".equalsIgnoreCase(code.getStatus())) {
                    code.setStatus("ACTIVE");
                    code.setIsReopened(true);
                    code.setAdditionalTime(extraTime);
                    code.setStartedAt(null);
                    code.setCurrentSessionToken(null);
                } else {
                    code.setAdditionalTime(
                            (code.getAdditionalTime() != null ? code.getAdditionalTime() : 0) + extraTime);
                }
                studentExamCodeRepository.save(code);

                studentRepository.findById(studentId).ifPresent(student -> {
                    logStudentExtraTime(student, test.getName(), extraTime, comment);
                    studentRepository.save(student);
                });
            }
        }
        return convertToResponse(test);
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
        if (test.getStudentGroups() == null || test.getStudentGroups().isEmpty())
            return;

        for (TestStudentGroup group : test.getStudentGroups()) {
            if (group.getStudents() == null)
                continue;

            String examDate = group.getExamDate() != null ? group.getExamDate() : "TBD";
            List<Student> shiftedStudents = new ArrayList<>();
            String previousDateForShift = null;

            for (Student student : group.getStudents()) {
                final boolean[] isNew = { false };
                final boolean[] dateChanged = { false };
                final String[] oldDate = { null };

                Optional<StudentExamCode> existingCode = studentExamCodeRepository
                        .findByTestIdAndStudentId(test.getId(), student.getId());

                if (existingCode.isPresent()) {
                    oldDate[0] = existingCode.get().getExpiryDate();
                    if (!examDate.equals(oldDate[0])) {
                        studentExamCodeRepository.delete(existingCode.get());
                        dateChanged[0] = true;
                    }
                }

                StudentExamCode codeEntry = studentExamCodeRepository
                        .findByTestIdAndStudentId(test.getId(), student.getId())
                        .orElseGet(() -> {
                            StudentExamCode newEntry = new StudentExamCode();
                            newEntry.setTestId(test.getId());
                            newEntry.setStudentId(student.getId());
                            newEntry.setExamCode(generateUniqueExamCode());
                            newEntry.setExpiryDate(examDate);
                            isNew[0] = true;
                            return studentExamCodeRepository.save(newEntry);
                        });

                handleStudentNotificationAndStatus(student, test, codeEntry, isNew[0], dateChanged[0], oldDate[0],
                        examDate, existingCode, shiftedStudents);
                if (dateChanged[0] && oldDate[0] != null)
                    previousDateForShift = oldDate[0];
            }

            if (!shiftedStudents.isEmpty() && previousDateForShift != null) {
                emailService.sendBatchDateChangeAdminNotification(test, previousDateForShift, examDate,
                        shiftedStudents);
            }
        }
    }

    private void handleStudentNotificationAndStatus(Student student, Test test, StudentExamCode codeEntry,
            boolean isNew, boolean dateChanged, String oldDate, String examDate, Optional<StudentExamCode> existingCode,
            List<Student> shiftedStudents) {
        studentRepository.findById(student.getId()).ifPresent(studentEntity -> {
            String oldStatus = studentEntity.getStatus();
            boolean needsUpdate = isNew || dateChanged || (!"Took Exam".equals(oldStatus)
                    && !"Allocated".equals(oldStatus) && !"Rescheduled".equals(oldStatus));

            if (needsUpdate) {
                String newStatus = "Allocated";
                boolean isCodeUsedOrStarted = existingCode.isPresent()
                        && ("STARTED".equalsIgnoreCase(existingCode.get().getStatus())
                                || "USED".equalsIgnoreCase(existingCode.get().getStatus()));

                if (isCodeUsedOrStarted)
                    return;

                if (dateChanged && oldDate != null) {
                    newStatus = "Rescheduled";
                    emailService.sendBatchDateChangeStudentNotification(studentEntity, test, oldDate, examDate,
                            codeEntry.getExamCode());
                    shiftedStudents.add(studentEntity);
                } else if ("Have to Reschedule".equalsIgnoreCase(oldStatus)
                        || "Rescheduled".equalsIgnoreCase(oldStatus)) {
                    newStatus = "Rescheduled";
                    emailService.sendReschedulingEmail(studentEntity, test, codeEntry.getExamCode(), examDate);
                } else if (isNew) {
                    emailService.sendSchedulingEmail(studentEntity, test, codeEntry.getExamCode(), examDate);
                }

                logStudentStatusUpdate(studentEntity, newStatus, test.getName(), examDate, codeEntry.getExamCode());
                studentEntity.setStatus(newStatus);
                studentEntity.setExamName(test.getName());
                studentEntity.setExamDate(examDate);
                studentEntity.setExamCode(codeEntry.getExamCode());
                studentRepository.save(studentEntity);
            }
        });
    }

    private String generateUniqueExamCode() {
        Random random = new Random();
        return String.valueOf(1000 + random.nextInt(9000));
    }

    private String calculateStatusForTest(Test test) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        boolean hasTodayBatch = false;
        boolean hasFutureBatch = false;
        boolean allBatchesPast = true;

        if (test.getStudentGroups() != null && !test.getStudentGroups().isEmpty()) {
            for (TestStudentGroup group : test.getStudentGroups()) {
                String examDate = group.getExamDate();
                if (examDate == null || examDate.isEmpty() || "TBD".equalsIgnoreCase(examDate))
                    continue;
                try {
                    LocalDate batchDate = LocalDate.parse(examDate, formatter);
                    if (batchDate.equals(today)) {
                        hasTodayBatch = true;
                        allBatchesPast = false;
                    } else if (batchDate.isAfter(today)) {
                        hasFutureBatch = true;
                        allBatchesPast = false;
                    }
                } catch (Exception ignored) {
                }
            }
            if (hasTodayBatch)
                return "Published";
            if (allBatchesPast)
                return "Expired";
            if (hasFutureBatch)
                return "Draft";
        }
        return "Draft";
    }

    private int calculateUniqueStudentCount(Test test) {
        if (test.getStudentGroups() == null)
            return 0;
        Set<Long> uniqueIds = new HashSet<>();
        for (TestStudentGroup group : test.getStudentGroups()) {
            if (group.getStudents() != null) {
                for (Student s : group.getStudents())
                    uniqueIds.add(s.getId());
            }
        }
        return uniqueIds.size();
    }

    private Set<Long> getAssignedStudentIds(Test test) {
        Set<Long> ids = new HashSet<>();
        if (test.getStudentGroups() != null) {
            for (TestStudentGroup group : test.getStudentGroups()) {
                if (group.getStudents() != null) {
                    for (Student s : group.getStudents())
                        ids.add(s.getId());
                }
            }
        }
        return ids;
    }

    private void validateStudentRemoval(Long testId, Set<Long> oldIds, Set<Long> newIds) {
        List<String> lockedStudentNames = new ArrayList<>();
        for (Long oldId : oldIds) {
            if (!newIds.contains(oldId)) {
                studentExamCodeRepository.findByTestIdAndStudentId(testId, oldId).ifPresent(code -> {
                    if ("STARTED".equalsIgnoreCase(code.getStatus()) || "USED".equalsIgnoreCase(code.getStatus())) {
                        studentRepository.findById(oldId).ifPresent(s -> lockedStudentNames.add(s.getName()));
                    }
                });
            }
        }
        if (!lockedStudentNames.isEmpty()) {
            throw new RuntimeException("Cannot remove students who have already started or finished the exam: "
                    + String.join(", ", lockedStudentNames));
        }
    }

    private void handleRemovedStudents(Test test, Set<Long> oldIds, Set<Long> newIds) {
        List<Student> removedStudents = new ArrayList<>();
        for (Long oldId : oldIds) {
            if (!newIds.contains(oldId)) {
                studentRepository.findById(oldId).ifPresent(student -> {
                    Optional<StudentExamCode> codeOpt = studentExamCodeRepository.findByTestIdAndStudentId(test.getId(),
                            student.getId());
                    boolean isCodeActive = codeOpt.map(c -> "ACTIVE".equalsIgnoreCase(c.getStatus())).orElse(true);

                    if (isCodeActive
                            && ("Allocated".equals(student.getStatus()) || "Rescheduled".equals(student.getStatus()))) {
                        emailService.sendCancellationStudentNotification(student, test);
                        removedStudents.add(student);
                    }
                    updateStudentStatusToReschedule(student, "Removed from Examination: " + test.getName());
                    studentRepository.save(student);
                    studentExamCodeRepository.findByTestIdAndStudentId(test.getId(), oldId)
                            .ifPresent(studentExamCodeRepository::delete);
                });
            }
        }
        if (!removedStudents.isEmpty()) {
            emailService.sendCancellationAdminNotification(test, removedStudents,
                    "Students were removed from the examination during an update.");
        }
    }

    private void updateStudentStatusToReschedule(Student student, String reason) {
        student.setStatus("Have to Reschedule");
        student.setStatusComment(reason);
        student.setExamName(null);
        student.setExamDate(null);
        student.setExamCode(null);
        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
        String logEntry = String.format("[%s] Status: Have to Reschedule (%s)", timestamp, reason);
        student.setStatusHistory(
                student.getStatusHistory() == null ? logEntry : logEntry + "\n" + student.getStatusHistory());
    }

    private void logStudentStatusUpdate(Student student, String status, String examName, String date, String code) {
        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
        String logEntry = String.format("[%s] Status: %s (Exam: %s on %s, Code: %s)", timestamp, status, examName, date,
                code);
        student.setStatusHistory(
                student.getStatusHistory() == null ? logEntry : logEntry + "\n" + student.getStatusHistory());
    }

    private void logStudentExtraTime(Student student, String examName, Integer extraTime, String comment) {
        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
        String logEntry = String.format("[%s] Added %d mins extra time for Exam: %s. Reason: %s", timestamp, extraTime,
                examName, comment != null ? comment : "No comment");
        student.setStatusHistory(
                student.getStatusHistory() == null ? logEntry : logEntry + "\n" + student.getStatusHistory());
    }
}
