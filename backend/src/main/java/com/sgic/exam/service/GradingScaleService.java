package com.sgic.exam.service;

import com.sgic.exam.model.GradingScale;
import com.sgic.exam.repository.GradingScaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GradingScaleService {

    @Autowired
    private GradingScaleRepository repository;

    public List<GradingScale> getAllScales() {
        return repository.findAll();
    }

    public List<GradingScale> saveAllScales(List<GradingScale> scales) {
        repository.deleteAll();
        return repository.saveAll(scales);
    }
}
