package com.odyio.document;

import com.odyio.client.ClientService;
import com.odyio.fournisseur.FournisseurService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
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
    private final ClientService clientService;
    private final FournisseurService fournisseurService;

    private final Tika tika = new Tika();

    private static final Map<String, Set<String>> ALLOWED_MIME = Map.of(
        "CLIENT", Set.of("image/jpeg", "image/png", "application/pdf"),
        "BC", Set.of("image/jpeg", "image/png", "application/pdf"),
        "CONFIG", Set.of("image/jpeg", "image/png", "image/svg+xml"),
        "CATALOGUE", Set.of("image/jpeg", "image/png", "image/webp")
    );

    private static final Map<String, Long> MAX_SIZE_BYTES = Map.of(
        "CLIENT", 10L * 1024 * 1024,
        "BC", 20L * 1024 * 1024,
        "CONFIG", 2L * 1024 * 1024,
        "CATALOGUE", 5L * 1024 * 1024
    );

    @Value("${app.storage.path:./uploads}")
    private String storagePath;

    @Transactional
    public Document store(MultipartFile file, OwnerType ownerType, UUID ownerId,
                          DocumentType documentType, UUID userId) {
        String typeKey = ownerType.name();
        Set<String> allowedMime = ALLOWED_MIME.get(typeKey);
        Long maxSize = MAX_SIZE_BYTES.get(typeKey);

        String detectedMime = detectMime(file);
        if (allowedMime != null && !allowedMime.contains(detectedMime)) {
            throw new IllegalArgumentException(
                "Format non supporté. Types autorisés: " + String.join(", ", allowedMime));
        }
        if (maxSize != null && file.getSize() > maxSize) {
            throw new IllegalArgumentException("Fichier trop volumineux. Maximum: " +
                (maxSize / (1024 * 1024)) + " Mo");
        }
        if (file.getSize() == 0) {
            throw new IllegalArgumentException("Fichier vide");
        }

        String ext = extractExtension(file.getOriginalFilename());
        String safeFilename = UUID.randomUUID() + ext;
        Path targetDir = Paths.get(storagePath, typeKey.toLowerCase(), ownerId.toString());
        try {
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(safeFilename);
            Files.write(targetPath, file.getBytes());

            Document doc = new Document();
            doc.setOwnerId(ownerId);
            doc.setOwnerType(ownerType);
            doc.setDocumentType(documentType);
            doc.setFilePath(targetPath.toString());
            doc.setFileName(file.getOriginalFilename());
            doc.setMimeType(detectedMime);
            doc.setExtractionStatus("PENDING");
            doc.setUploadedBy(userId);
            doc.setUploadedAt(Instant.now());
            return documentRepository.save(doc);
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors du stockage du fichier", e);
        }
    }

    public Document download(UUID documentId, UUID requestingUserId) {
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new IllegalArgumentException("Document introuvable"));
        verifyAccess(doc, requestingUserId);
        Path file = Paths.get(doc.getFilePath());
        if (!Files.exists(file)) {
            throw new IllegalArgumentException("Fichier non trouvé sur le disque");
        }
        return doc;
    }

    @Transactional
    public void delete(UUID documentId) {
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new IllegalArgumentException("Document introuvable"));
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la suppression du fichier", e);
        }
        documentRepository.delete(doc);
    }

    public Resource loadAsResource(UUID documentId, UUID requestingUserId) {
        Document doc = download(documentId, requestingUserId);
        return new FileSystemResource(Paths.get(doc.getFilePath()));
    }

    public Document getExtractionStatus(UUID documentId) {
        return documentRepository.findById(documentId)
            .orElseThrow(() -> new IllegalArgumentException("Document introuvable"));
    }

    private void verifyAccess(Document doc, UUID userId) {
        String ot = doc.getOwnerType().name();
        if ("CLIENT".equals(ot) || "PATIENT".equals(ot)) {
            clientService.verifyAccess(doc.getOwnerId(), userId);
        } else if ("BC".equals(ot)) {
            fournisseurService.verifyAccess(doc.getOwnerId(), userId);
        }
    }

    private String detectMime(MultipartFile file) {
        try {
            String detected = tika.detect(file.getInputStream(), file.getOriginalFilename());
            if (detected != null) return detected;
        } catch (IOException e) {
            throw new RuntimeException("Impossible de détecter le type du fichier", e);
        }
        return file.getContentType();
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.'));
    }
}
