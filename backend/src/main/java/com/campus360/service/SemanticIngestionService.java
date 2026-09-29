package com.campus360.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class SemanticIngestionService {

    private final VectorStore vectorStore;

    public SemanticIngestionService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    /**
     * Parses a file (PDF, PPTX, etc.), chunks the text, and saves it to pgvector.
     *
     * @param localFilePath The absolute path to the file on disk
     * @param originalFileName The original filename
     * @param uploaderId The ID of the student who uploaded it
     * @param courseId The ID of the course this material belongs to
     * @param fileUrl The URL to download the actual file (Drive link or S3 URL)
     */
    public void ingestFile(String localFilePath, String originalFileName, Long uploaderId, Long courseId, String fileUrl) {
        try {
            // 1. Convert FilePath to Spring Resource
            Resource resource = new FileSystemResource(localFilePath);

            // 2. Extract Text using Tika
            TikaDocumentReader documentReader = new TikaDocumentReader(resource);
            List<Document> documents = documentReader.get();

            // 3. Add Custom Metadata for Filtering Later
            for (Document document : documents) {
                Map<String, Object> metadata = document.getMetadata();
                metadata.put("uploaderId", uploaderId);
                if (courseId != null) {
                    metadata.put("courseId", courseId);
                }
                metadata.put("fileUrl", fileUrl);
                metadata.put("fileName", originalFileName);
            }

            // 4. Chunk the extracted text
            TokenTextSplitter splitter = new TokenTextSplitter();
            List<Document> chunkedDocuments = splitter.apply(documents);

            // 5. Generate embeddings and save to pgvector database
            vectorStore.add(chunkedDocuments);
            System.out.println("Semantic ingestion successful for file: " + originalFileName);
        } catch (Exception e) {
            System.err.println("Failed to ingest file for semantic search: " + e.getMessage());
        }
    }
}
