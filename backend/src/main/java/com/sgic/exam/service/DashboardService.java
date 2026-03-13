package com.sgic.exam.service;

import java.util.List;
import java.util.Map;

public interface DashboardService {
    Map<String, Object> getDashboardStats(String period);

    List<Map<String, Object>> getActiveTests();

    Map<String, Object> getCalendarData(Integer month, Integer year);

    List<Map<String, Object>> getCategoryPerformance(String period);

    List<Map<String, Object>> getCategoryTrend(String category, String period, Integer year, Integer month,
            Integer startYear, Integer endYear, Integer startMonth, Integer endMonth);

    Map<String, Integer> getYearRange();
}
