package com.campus360.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SemanticSearchService {

    private final VectorStore vectorStore;

    public SemanticSearchService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        // Pre-warm the embedding model so the first request doesn't timeout
        try {
            System.out.println("Pre-warming embedding model...");
            SearchRequest preWarm = SearchRequest.query("warmup").withTopK(1);
            vectorStore.similaritySearch(preWarm);
            System.out.println("Embedding model pre-warmed successfully!");
        } catch (Exception e) {
            System.err.println("Pre-warm failed (can be ignored if table doesn't exist yet): " + e.getMessage());
        }
    }

    /**
     * Executes a similarity search against the pgvector database.
     *
     * @param query The student's search query (e.g., "How does CPU concurrency work?")
     * @param courseId The ID of the course to restrict the search to
     * @return A list of matching documents with their metadata and text snippets
     */
    public List<Map<String, Object>> searchMaterials(String query, Long courseId) {
        FilterExpressionBuilder b = new FilterExpressionBuilder();

        // Build a search request to find the top 5 most conceptually similar chunks
        SearchRequest searchRequest = SearchRequest.query(query).withTopK(5);
        
        // We filter by courseId so students only see materials for their specific course
        if (courseId != null) {
            searchRequest = searchRequest.withFilterExpression(b.eq("courseId", courseId).build());
        }

        List<Document> results = vectorStore.similaritySearch(searchRequest);

        // Map the raw Document chunks to a friendly JSON response format for the frontend
        return results.stream().map(doc -> {
            Map<String, Object> responseMap = new HashMap<>(doc.getMetadata());
            
            // Include a snippet of the matched text so the frontend can display why it matched
            String content = doc.getContent();
            responseMap.put("textSnippet", content != null && content.length() > 300 
                ? content.substring(0, 300) + "..." 
                : content);
                
            return responseMap;
        }).collect(Collectors.toList());
    }
}
