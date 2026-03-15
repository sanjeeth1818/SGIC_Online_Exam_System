package com.sgic.exam.controller;

import com.sgic.exam.model.GradingScale;
import com.sgic.exam.service.GradingScaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings/grading")
public class GradingScaleController {

    @Autowired
    private GradingScaleService service;

    @GetMapping
    public ResponseEntity<List<GradingScale>> getGradingScales() {
        return ResponseEntity.ok(service.getAllScales());
    }

    @PostMapping
    public ResponseEntity<List<GradingScale>> updateGradingScales(@RequestBody List<GradingScale> scales) {
        return ResponseEntity.ok(service.saveAllScales(scales));
    }
}
