package com.sgic.exam.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class WelcomeController {

    @GetMapping("/")
    public Map<String, String> welcome() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "SGIC Exam Backend is running successfully!");
        response.put("status", "UP");
        response.put("api_base_url", "/api/categories");
        return response;
    }
}
