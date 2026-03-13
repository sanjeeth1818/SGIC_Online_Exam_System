package com.sgic.exam.controller;

import com.sgic.exam.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(dashboardService.getDashboardStats(period));
    }

    @GetMapping("/active-tests")
    public ResponseEntity<List<Map<String, Object>>> getActiveTests() {
        return ResponseEntity.ok(dashboardService.getActiveTests());
    }

    @GetMapping("/calendar")
    public ResponseEntity<Map<String, Object>> getCalendarData(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(dashboardService.getCalendarData(month, year));
    }

    @GetMapping("/category-performance")
    public ResponseEntity<List<Map<String, Object>>> getCategoryPerformance(
            @RequestParam(defaultValue = "month") String period) {
        return ResponseEntity.ok(dashboardService.getCategoryPerformance(period));
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
        return ResponseEntity.ok(dashboardService.getCategoryTrend(
                category, period, year, month, startYear, endYear, startMonth, endMonth));
    }

    @GetMapping("/year-range")
    public ResponseEntity<Map<String, Integer>> getYearRange() {
        return ResponseEntity.ok(dashboardService.getYearRange());
    }
}
