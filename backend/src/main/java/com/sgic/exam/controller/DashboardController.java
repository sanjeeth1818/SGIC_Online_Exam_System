package com.sgic.exam.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgic.exam.controller.SubmissionController.QuestionResult;
import com.sgic.exam.model.TestStudentGroup;
import com.sgic.exam.repository.CategoryRepository;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.SubmissionRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(@RequestParam(defaultValue = "month") String period) {
        LocalDateTime start = getStartTime(period);

        long totalTests = testRepository.count();
        long totalQuestions = questionRepository.count();
        long totalCategories = categoryRepository.count();

        // Count distinct students who have submitted tests in the given period
        long studentsCount = submissionRepository.findAll().stream()
                .filter(s -> s.getSubmittedAt() != null && s.getSubmittedAt().isAfter(start))
                .map(s -> s.getStudentEmail().toLowerCase().trim())
                .distinct()
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTests", totalTests);
        stats.put("totalQuestions", totalQuestions);
        stats.put("totalCategories", totalCategories);
        stats.put("studentsCount", studentsCount);

        return ResponseEntity.ok(stats);
    }

    private LocalDateTime getStartTime(String period) {
        LocalDate today = LocalDate.now();
        switch (period.toLowerCase()) {
            case "today":
                return today.atStartOfDay();
            case "year":
                return today.withDayOfYear(1).atStartOfDay();
            case "month":
            default:
                return today.withDayOfMonth(1).atStartOfDay();
        }
    }

    @GetMapping("/active-tests")
    public ResponseEntity<List<Map<String, Object>>> getActiveTests() {
        // Mocking recent 3 tests for demonstration based on total count
        List<com.sgic.exam.model.Test> allTests = testRepository.findAll();
        List<Map<String, Object>> active = new java.util.ArrayList<>();

        // Return up to 3 most recently created ones
        int limit = Math.min(3, allTests.size());
        for (int i = allTests.size() - 1; i >= allTests.size() - limit; i--) {
            com.sgic.exam.model.Test t = allTests.get(i);
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId());
            map.put("name", t.getName());
            map.put("status", t.getStatus());
            map.put("students", t.getStudentCount());
            map.put("timeRemaining", (t.getTimeValue() != null ? t.getTimeValue() : "0") + " "
                    + (t.getTimeUnit() != null ? t.getTimeUnit() : "mins")); // Approximation
            active.add(map);
        }
        return ResponseEntity.ok(active);
    }

    @GetMapping("/calendar")
    public ResponseEntity<Map<String, List<Integer>>> getCalendarData(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        LocalDate today = LocalDate.now();
        int targetMonth = (month != null) ? month : today.getMonthValue();
        int targetYear = (year != null) ? year : today.getYear();

        List<Integer> past = new ArrayList<>();
        List<Integer> upcoming = new ArrayList<>();

        List<com.sgic.exam.model.Test> tests = testRepository.findAll();
        for (com.sgic.exam.model.Test test : tests) {
            if (test.getStudentGroups() != null) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    if (group.getExamDate() != null) {
                        LocalDate examDate = LocalDate.parse(group.getExamDate());
                        if (examDate.getMonthValue() == targetMonth && examDate.getYear() == targetYear) {
                            if (examDate.isBefore(today)) {
                                past.add(examDate.getDayOfMonth());
                            } else if (examDate.isAfter(today)) {
                                upcoming.add(examDate.getDayOfMonth());
                            }
                        }
                    }
                }
            }
        }

        Map<String, List<Integer>> calendarInfo = new HashMap<>();
        calendarInfo.put("past", past.stream().distinct().collect(Collectors.toList()));
        calendarInfo.put("upcoming", upcoming.stream().distinct().collect(Collectors.toList()));
        return ResponseEntity.ok(calendarInfo);
    }

    @GetMapping("/category-performance")
    public ResponseEntity<List<Map<String, Object>>> getCategoryPerformance(
            @RequestParam(defaultValue = "month") String period) {
        LocalDateTime start = getStartTime(period);
        List<com.sgic.exam.model.Submission> submissions = submissionRepository.findAll().stream()
                .filter(s -> s.getSubmittedAt() != null && s.getSubmittedAt().isAfter(start))
                .collect(Collectors.toList());

        Map<String, List<Boolean>> categoryResults = new HashMap<>();
        ObjectMapper mapper = new ObjectMapper();

        for (com.sgic.exam.model.Submission submission : submissions) {
            try {
                if (submission.getDetailedBreakdownJson() != null) {
                    List<QuestionResult> results = mapper.readValue(submission.getDetailedBreakdownJson(),
                            new TypeReference<List<QuestionResult>>() {
                            });
                    for (QuestionResult res : results) {
                        String cat = res.getCategoryName() != null ? res.getCategoryName() : "General";
                        categoryResults.computeIfAbsent(cat, k -> new ArrayList<>()).add(res.isCorrect());
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        List<Map<String, Object>> performance = new ArrayList<>();
        String[] colors = { "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4" };
        int colorIdx = 0;

        // Ensure all categories are present, even if no submissions
        List<com.sgic.exam.model.Category> allCategories = categoryRepository.findAll();
        for (com.sgic.exam.model.Category category : allCategories) {
            String name = category.getName();
            List<Boolean> results = categoryResults.getOrDefault(name, new ArrayList<>());

            long correct = results.stream().filter(r -> r).count();
            long total = results.size();
            int percent = total == 0 ? 0 : (int) Math.round((double) correct / total * 100);

            Map<String, Object> map = new HashMap<>();
            map.put("label", name);
            map.put("value", percent);
            map.put("totalSubmissions", total);
            map.put("color", colors[colorIdx % colors.length]);
            performance.add(map);
            colorIdx++;
        }

        return ResponseEntity.ok(performance);
    }

    @GetMapping("/trend")
    public ResponseEntity<List<Map<String, Object>>> getCategoryTrend(
            @RequestParam String category,
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer startYear,
            @RequestParam(required = false) Integer endYear,
            @RequestParam(required = false) Integer startMonth,
            @RequestParam(required = false) Integer endMonth) {

        List<com.sgic.exam.model.Submission> allSubmissions = submissionRepository.findAll();
        ObjectMapper mapper = new ObjectMapper();
        Map<String, List<Boolean>> timePoints = new LinkedHashMap<>();

        // Logic for different drill-down levels and ranges
        for (com.sgic.exam.model.Submission submission : allSubmissions) {
            if (submission.getSubmittedAt() == null || submission.getDetailedBreakdownJson() == null)
                continue;

            LocalDateTime at = submission.getSubmittedAt();
            String timeKey = null;

            if ("year_range".equalsIgnoreCase(period) && startYear != null && endYear != null) {
                if (at.getYear() >= startYear && at.getYear() <= endYear) {
                    timeKey = String.valueOf(at.getYear());
                }
            } else if ("month_range".equalsIgnoreCase(period) && year != null && startMonth != null
                    && endMonth != null) {
                if (at.getYear() == year && at.getMonthValue() >= startMonth && at.getMonthValue() <= endMonth) {
                    timeKey = at.getMonth().toString().substring(0, 3);
                }
            } else if (year != null && month != null) {
                // Specific Month -> Daily view
                if (at.getYear() == year && at.getMonthValue() == month) {
                    timeKey = at.toLocalDate().toString();
                }
            } else if (year != null) {
                // Specific Year -> Monthly view
                if (at.getYear() == year) {
                    timeKey = at.getMonth().toString().substring(0, 3);
                }
            } else if ("year".equalsIgnoreCase(period)) {
                // Overview -> Multi-year view (all years)
                timeKey = String.valueOf(at.getYear());
            } else {
                // Default Month -> Daily view (current month)
                LocalDateTime start = getStartTime("month");
                if (at.isAfter(start)) {
                    timeKey = at.toLocalDate().toString();
                }
            }

            if (timeKey != null) {
                try {
                    List<QuestionResult> results = mapper.readValue(submission.getDetailedBreakdownJson(),
                            new TypeReference<List<QuestionResult>>() {
                            });
                    for (QuestionResult res : results) {
                        if (category.equalsIgnoreCase(res.getCategoryName())) {
                            timePoints.computeIfAbsent(timeKey, k -> new ArrayList<>()).add(res.isCorrect());
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        // Sort keys chronologically
        List<String> sortedKeys = new ArrayList<>(timePoints.keySet());
        List<String> monthNamesList = Arrays.asList("JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP",
                "OCT", "NOV", "DEC");

        Collections.sort(sortedKeys, (a, b) -> {
            boolean isAMonth = monthNamesList.contains(a.toUpperCase());
            boolean isBMonth = monthNamesList.contains(b.toUpperCase());

            if (isAMonth && isBMonth) {
                return Integer.compare(monthNamesList.indexOf(a.toUpperCase()),
                        monthNamesList.indexOf(b.toUpperCase()));
            }
            // Fallback to lexicographical for dates (YYYY-MM-DD) and years (YYYY)
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

        return ResponseEntity.ok(trend);
    }

    @GetMapping("/year-range")
    public ResponseEntity<Map<String, Integer>> getYearRange() {
        List<com.sgic.exam.model.Submission> submissions = submissionRepository.findAll();
        int min = LocalDate.now().getYear();
        int max = LocalDate.now().getYear();

        if (!submissions.isEmpty()) {
            min = submissions.stream()
                    .filter(s -> s.getSubmittedAt() != null)
                    .mapToInt(s -> s.getSubmittedAt().getYear())
                    .min().orElse(min);
            max = submissions.stream()
                    .filter(s -> s.getSubmittedAt() != null)
                    .mapToInt(s -> s.getSubmittedAt().getYear())
                    .max().orElse(max);
        }

        Map<String, Integer> range = new HashMap<>();
        range.put("min", min);
        range.put("max", max);
        return ResponseEntity.ok(range);
    }
}
