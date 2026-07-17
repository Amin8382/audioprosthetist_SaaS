package com.odyio.document;

import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<Document> upload(
            @RequestParam UUID ownerId,
            @RequestParam OwnerType ownerType,
            @RequestParam DocumentType documentType,
            @RequestParam MultipartFile file,
            Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(
            documentService.store(file, ownerType, ownerId, documentType, userId));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        Resource resource = documentService.loadAsResource(id, userId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/{id}/extraction-status")
    public ResponseEntity<Map<String, Object>> extractionStatus(
            @PathVariable UUID id, Authentication auth) {
        Document doc = documentService.getExtractionStatus(id);
        return ResponseEntity.ok(Map.of(
            "status", doc.getExtractionStatus() != null ? doc.getExtractionStatus() : "PENDING",
            "extractedData", doc.getExtractedData(),
            "extractionError", doc.getExtractionError()
        ));
    }

    @PostMapping("/{id}/delete")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documentService.delete(id);
        return ResponseEntity.ok().build();
    }
}
