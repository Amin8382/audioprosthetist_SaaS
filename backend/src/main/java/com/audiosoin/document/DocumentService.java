package com.audiosoin.document;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;

    @Value("${app.storage.path:./uploads}")
    private String storagePath;

    @Transactional
    public Document uploadDocument(UUID ownerId, OwnerType ownerType, DocumentType documentType,
                                    MultipartFile file) {
        try {
            String filename = ownerId + "/" + Instant.now().toEpochMilli() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(storagePath, filename);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, file.getBytes());

            Document doc = new Document();
            doc.setOwnerId(ownerId);
            doc.setOwnerType(ownerType);
            doc.setDocumentType(documentType);
            doc.setFilePath(filePath.toString());
            doc.setUploadedAt(Instant.now());
            return documentRepository.save(doc);
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload document", e);
        }
    }

    public Resource downloadDocument(UUID documentId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        Path file = Paths.get(doc.getFilePath());
        if (!Files.exists(file)) {
            throw new IllegalArgumentException("File not found on storage");
        }
        return new FileSystemResource(file);
    }
}
