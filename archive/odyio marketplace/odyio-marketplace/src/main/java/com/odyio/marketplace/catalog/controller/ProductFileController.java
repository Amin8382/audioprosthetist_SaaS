package com.odyio.marketplace.catalog.controller;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import com.odyio.marketplace.catalog.service.ProductImageService;
import com.odyio.marketplace.common.exception.FileStorageException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/files/products")
@Tag(name = "Fichiers produits", description = "Lecture publique securisee des images locales de produits")
public class ProductFileController {

    private final ProductImageService productImageService;

    @GetMapping("/{productId}/{filename:.+}")
    @Operation(
            summary = "Lire une image produit",
            description = "Retourne uniquement les fichiers stockes sous le repertoire local configure pour les images produits."
    )
    public ResponseEntity<Resource> serveProductImage(
            @PathVariable UUID productId,
            @PathVariable String filename
    ) {
        Resource resource = productImageService.load(productId, filename);
        return ResponseEntity.ok()
                .contentType(resolveMediaType(resource))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(resource);
    }

    private MediaType resolveMediaType(Resource resource) {
        try {
            String contentType = resource.getURL().openConnection().getContentType();
            return contentType == null ? MediaType.IMAGE_JPEG : MediaType.parseMediaType(contentType);
        } catch (IOException exception) {
            throw new FileStorageException("Impossible de lire le type du fichier image.", exception);
        }
    }

}
