package com.campus360.config;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.PgVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class DatabaseConfig {

    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    // --- Secondary PostgreSQL Vector DataSource ---
    @Bean(name = "vectorDataSource")
    @ConfigurationProperties("spring.datasource.vector")
    public DataSource vectorDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "vectorJdbcTemplate")
    public JdbcTemplate vectorJdbcTemplate(@Qualifier("vectorDataSource") DataSource vectorDataSource) {
        return new JdbcTemplate(vectorDataSource);
    }

    @Bean
    public VectorStore vectorStore(@Qualifier("vectorJdbcTemplate") JdbcTemplate vectorJdbcTemplate, 
                                   EmbeddingModel embeddingModel) {
        try {
            if (vectorJdbcTemplate.getDataSource() != null) {
                try (java.sql.Connection conn = vectorJdbcTemplate.getDataSource().getConnection()) {
                    return new PgVectorStore(vectorJdbcTemplate, embeddingModel, 384);
                }
            }
        } catch (Exception e) {
            System.err.println("[DatabaseConfig] PostgreSQL vector database unreachable, using in-memory SimpleVectorStore: " + e.getMessage());
        }
        return new org.springframework.ai.vectorstore.SimpleVectorStore(embeddingModel);
    }
}
