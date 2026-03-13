package com.sgic.exam.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgic.exam.dto.QuestionResult;
import com.sgic.exam.model.Submission;
import com.sgic.exam.model.TestStudentGroup;
import com.sgic.exam.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private StudentRepository studentRepository;

    // ─── Stats ───────────────────────────────────────────────────────────────

    @Override
    public Map<String, Object> getDashboardStats(String period) {
        LocalDateTime start = getStartTime(period);

        long studentsCount = submissionRepository.findAll().stream()
                .filter(s -> s.getSubmittedAt() != null && s.getSubmittedAt().isAfter(start))
                .map(s -> s.getStudentEmail().toLowerCase().trim())
                .distinct()
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTests", testRepository.count());
        stats.put("totalQuestions", questionRepository.count());
        stats.put("totalCategories", categoryRepository.count());
        stats.put("studentsCount", studentsCount);
        stats.put("totalStudents", studentRepository.count());
        return stats;
    }

    // ─── Active Tests ─────────────────────────────────────────────────────────

    @Override
    public List<Map<String, Object>> getActiveTests() {
        List<com.sgic.exam.model.Test> allTests = testRepository.findAll();
        List<Map<String, Object>> active = new ArrayList<>();

        int limit = Math.min(3, allTests.size());
        for (int i = allTests.size() - 1; i >= allTests.size() - limit; i--) {
            com.sgic.exam.model.Test t = allTests.get(i);
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId());
            map.put("name", t.getName());
            map.put("status", t.getStatus());
            map.put("students", t.getStudentCount());
            map.put("timeRemaining", (t.getTimeValue() != null ? t.getTimeValue() : "0") + " "
                    + (t.getTimeUnit() != null ? t.getTimeUnit() : "mins"));
            active.add(map);
        }
        return active;
    }

    // ─── Calendar ─────────────────────────────────────────────────────────────

    @Override
    public Map<String, Object> getCalendarData(Integer month, Integer year) {
        LocalDate today = LocalDate.now();
        int targetMonth = (month != null) ? month : today.getMonthValue();
        int targetYear = (year != null) ? year : today.getYear();

        Map<Integer, List<String>> pastMap = new LinkedHashMap<>();
        Map<Integer, List<String>> upcomingMap = new LinkedHashMap<>();

        for (com.sgic.exam.model.Test test : testRepository.findAll()) {
            if (test.getStudentGroups() == null)
                continue;
            for (TestStudentGroup group : test.getStudentGroups()) {
                if (group.getExamDate() == null)
                    continue;
                try {
                    LocalDate examDate = LocalDate.parse(group.getExamDate());
                    if (examDate.getMonthValue() == targetMonth && examDate.getYear() == targetYear) {
                        int day = examDate.getDayOfMonth();
                        String examName = test.getName() != null ? test.getName() : "Unnamed Exam";
                        Map<Integer, List<String>> target = examDate.isBefore(today) ? pastMap : upcomingMap;
                        target.computeIfAbsent(day, k -> new ArrayList<>()).add(examName);
                    }
                } catch (Exception ignored) {
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("past", toCalendarList(pastMap));
        result.put("upcoming", toCalendarList(upcomingMap));
        return result;
    }

    private List<Map<String, Object>> toCalendarList(Map<Integer, List<String>> map) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map.Entry<Integer, List<String>> e : map.entrySet()) {
            Map<String, Object> obj = new HashMap<>();
            obj.put("day", e.getKey());
            obj.put("exams", e.getValue().stream().distinct().collect(Collectors.toList()));
            list.add(obj);
        }
        return list;
    }

    // ─── Category Performance ─────────────────────────────────────────────────

    @Override
    public List<Map<String, Object>> getCategoryPerformance(String period) {
        LocalDateTime start = getStartTime(period);
        List<Submission> submissions = submissionRepository.findAll().stream()
                .filter(s -> s.getSubmittedAt() != null && s.getSubmittedAt().isAfter(start))
                .collect(Collectors.toList());

        Map<String, List<Boolean>> categoryResults = new HashMap<>();
        ObjectMapper mapper = new ObjectMapper();

        for (Submission submission : submissions) {
            parseAndAggregate(submission, mapper,
                    (cat, correct) -> categoryResults.computeIfAbsent(cat, k -> new ArrayList<>()).add(correct));
        }

        String[] colors = { "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4" };
        int colorIdx = 0;
        List<Map<String, Object>> performance = new ArrayList<>();

        for (com.sgic.exam.model.Category category : categoryRepository.findAll()) {
            String name = category.getName();
            List<Boolean> results = categoryResults.getOrDefault(name, new ArrayList<>());
            long correct = results.stream().filter(r -> r).count();
            long total = results.size();
            int percent = total == 0 ? 0 : (int) Math.round((double) correct / total * 100);

            Map<String, Object> map = new HashMap<>();
            map.put("label", name);
            map.put("value", percent);
            map.put("totalSubmissions", total);
            map.put("color", colors[colorIdx++ % colors.length]);
            performance.add(map);
        }
        return performance;
    }

    // ─── Category Trend ───────────────────────────────────────────────────────

    @Override
    public List<Map<String, Object>> getCategoryTrend(String category, String period, Integer year, Integer month,
            Integer startYear, Integer endYear,
            Integer startMonth, Integer endMonth) {
        ObjectMapper mapper = new ObjectMapper();
        Map<String, List<Boolean>> timePoints = new LinkedHashMap<>();

        for (Submission submission : submissionRepository.findAll()) {
            if (submission.getSubmittedAt() == null || submission.getDetailedBreakdownJson() == null)
                continue;

            LocalDateTime at = submission.getSubmittedAt();
            String timeKey = resolveTimeKey(at, period, year, month, startYear, endYear, startMonth, endMonth);
            if (timeKey == null)
                continue;

            parseAndAggregate(submission, mapper, (cat, correct) -> {
                if (category.equalsIgnoreCase(cat)) {
                    timePoints.computeIfAbsent(timeKey, k -> new ArrayList<>()).add(correct);
                }
            });
        }

        List<String> sortedKeys = new ArrayList<>(timePoints.keySet());
        List<String> months = Arrays.asList("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV",
                "DEC");
        sortedKeys.sort((a, b) -> {
            boolean aIsMonth = months.contains(a.toUpperCase());
            boolean bIsMonth = months.contains(b.toUpperCase());
            if (aIsMonth && bIsMonth)
                return Integer.compare(months.indexOf(a.toUpperCase()), months.indexOf(b.toUpperCase()));
            return a.compareTo(b);
        });

        List<Map<String, Object>> trend = new ArrayList<>();
        for (String key : sortedKeys) {
            List<Boolean> results = timePoints.get(key);
            long correct = results.stream().filter(r -> r).count();
            int percent = (int) Math.round((double) correct / results.size() * 100);
            Map<String, Object> point = new HashMap<>();
            point.put("time", key);
            point.put("value", percent);
            trend.add(point);
        }
        return trend;
    }

    // ─── Year Range ───────────────────────────────────────────────────────────

    @Override
    public Map<String, Integer> getYearRange() {
        List<Submission> submissions = submissionRepository.findAll();
        int currentYear = LocalDate.now().getYear();
        int min = currentYear, max = currentYear;

        if (!submissions.isEmpty()) {
            min = submissions.stream().filter(s -> s.getSubmittedAt() != null)
                    .mapToInt(s -> s.getSubmittedAt().getYear()).min().orElse(min);
            max = submissions.stream().filter(s -> s.getSubmittedAt() != null)
                    .mapToInt(s -> s.getSubmittedAt().getYear()).max().orElse(max);
        }

        Map<String, Integer> range = new HashMap<>();
        range.put("min", min);
        range.put("max", max);
        return range;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private LocalDateTime getStartTime(String period) {
        LocalDate today = LocalDate.now();
        switch (period.toLowerCase()) {
            case "today":
                return today.atStartOfDay();
            case "year":
                return today.withDayOfYear(1).atStartOfDay();
            default:
                return today.withDayOfMonth(1).atStartOfDay();
        }
    }

    private String resolveTimeKey(LocalDateTime at, String period, Integer year, Integer month,
            Integer startYear, Integer endYear, Integer startMonth, Integer endMonth) {
        if ("year_range".equalsIgnoreCase(period) && startYear != null && endYear != null) {
            return (at.getYear() >= startYear && at.getYear() <= endYear) ? String.valueOf(at.getYear()) : null;
        }
        if ("month_range".equalsIgnoreCase(period) && year != null && startMonth != null && endMonth != null) {
            return (at.getYear() == year && at.getMonthValue() >= startMonth && at.getMonthValue() <= endMonth)
                    ? at.getMonth().toString().substring(0, 3)
                    : null;
        }
        if (year != null && month != null) {
            return (at.getYear() == year && at.getMonthValue() == month) ? at.toLocalDate().toString() : null;
        }
        if (year != null) {
            return (at.getYear() == year) ? at.getMonth().toString().substring(0, 3) : null;
        }
        if ("year".equalsIgnoreCase(period)) {
            return String.valueOf(at.getYear());
        }
        // Default: current month daily view
        return at.isAfter(getStartTime("month")) ? at.toLocalDate().toString() : null;
    }

    @FunctionalInterface
    private interface QuestionResultConsumer {
        void accept(String categoryName, boolean correct);
    }

    private void parseAndAggregate(Submission submission, ObjectMapper mapper, QuestionResultConsumer consumer) {
        try {
            if (submission.getDetailedBreakdownJson() == null)
                return;
            List<QuestionResult> results = mapper.readValue(submission.getDetailedBreakdownJson(),
                    new TypeReference<List<QuestionResult>>() {
                    });
            for (QuestionResult res : results) {
                String cat = res.getCategoryName() != null ? res.getCategoryName() : "General";
                consumer.accept(cat, res.isCorrect());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
