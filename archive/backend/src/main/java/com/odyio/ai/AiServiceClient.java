package com.odyio.ai;

import com.odyio.document.Document;
import com.odyio.document.DocumentRepository;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceClient {

    private final DocumentRepository documentRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Async
    public CompletableFuture<Void> extractDocumentAsync(Document doc) {
        return CompletableFuture.runAsync(() -> {
            try {
                doc.setExtractionStatus("PROCESSING");
                documentRepository.save(doc);

                String documentType = doc.getDocumentType().name();

                Map<String, String> body = Map.of(
                    "filePath", doc.getFilePath(),
                    "documentType", documentType
                );

                Map<String, Object> result = restTemplate.postForObject(
                    aiServiceUrl + "/ai/extract-document",
                    body,
                    Map.class
                );

                if (result != null) {
                    doc.setExtractedData(toJsonString(result));
                    doc.setExtractionStatus("DONE");
                } else {
                    doc.setExtractionStatus("ERROR");
                    doc.setExtractionError("Empty response from AI service");
                }
            } catch (Exception e) {
                log.error("AI extraction failed for document {}", doc.getId(), e);
                doc.setExtractionStatus("ERROR");
                doc.setExtractionError(e.getMessage());
            }
            documentRepository.save(doc);
        });
    }

    @Async
    public CompletableFuture<Void> extractBlAsync(Document doc) {
        return CompletableFuture.runAsync(() -> {
            try {
                doc.setExtractionStatus("PROCESSING");
                documentRepository.save(doc);

                Map<String, String> body = Map.of("filePath", doc.getFilePath());

                Map<String, Object> result = restTemplate.postForObject(
                    aiServiceUrl + "/ai/extract-bl",
                    body,
                    Map.class
                );

                if (result != null) {
                    doc.setExtractedData(toJsonString(result));
                    doc.setExtractionStatus("DONE");
                } else {
                    doc.setExtractionStatus("ERROR");
                    doc.setExtractionError("Empty response from AI service");
                }
            } catch (Exception e) {
                log.error("AI BL extraction failed for document {}", doc.getId(), e);
                doc.setExtractionStatus("ERROR");
                doc.setExtractionError(e.getMessage());
            }
            documentRepository.save(doc);
        });
    }

    private String toJsonString(Map<String, Object> map) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(map);
        } catch (Exception e) {
            return map.toString();
        }
    }
}
