package com.campus360.controller;

import com.campus360.entity.Trimester;
import com.campus360.repository.TrimesterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/trimesters")
public class TrimesterController {

    @Autowired
    private TrimesterRepository trimesterRepository;

    @GetMapping
    public ResponseEntity<List<Trimester>> getAllTrimesters() {
        return ResponseEntity.ok(trimesterRepository.findAll());
    }
}
