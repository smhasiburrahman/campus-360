package com.campus360.controller;

import com.campus360.service.SemanticSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/materials")
public class SemanticSearchController {

    private final SemanticSearchService searchService;

    public SemanticSearchController(SemanticSearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * REST Endpoint for Semantic Search
     * Example: GET /api/materials/semantic-search?q=cpu%20multitasking&courseId=101
     */
    @GetMapping("/semantic-search")
    public ResponseEntity<List<Map<String, Object>>> semanticSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "courseId", required = false) Long courseId) {
        
        List<Map<String, Object>> results = searchService.searchMaterials(query, courseId);
        return ResponseEntity.ok(results);
    }
}
