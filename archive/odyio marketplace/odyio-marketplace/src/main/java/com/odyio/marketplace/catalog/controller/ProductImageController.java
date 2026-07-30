package com.odyio.marketplace.catalog.controller;

import java.util.UUID;

import com.odyio.marketplace.catalog.dto.ProductImageResponse;
import com.odyio.marketplace.catalog.dto.ProductImageUpdateRequest;
import com.odyio.marketplace.catalog.service.ProductImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/products/{productId}/images")
@Tag(name = "Images produits", description = "Upload et gestion des images locales des produits")
public class ProductImageController {

    private final ProductImageService productImageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Uploader une image produit",
            description = "Recoit un fichier image multipart, le valide, le normalise en JPEG local et cree la metadonnee ProductImage."
    )
    public ResponseEntity<ProductImageResponse> upload(
            @PathVariable UUID productId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String altText,
            @RequestParam(required = false) Integer displayOrder,
            @RequestParam(required = false) Boolean primary
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productImageService.upload(productId, file, altText, displayOrder, primary));
    }

    @PatchMapping("/{imageId}")
    @Operation(
            summary = "Modifier les metadonnees d'une image produit",
            description = "Met a jour le texte alternatif, l'ordre et l'image principale sans renvoyer de fichier binaire."
    )
    public ResponseEntity<ProductImageResponse> updateMetadata(
            @PathVariable UUID productId,
            @PathVariable UUID imageId,
            @Valid @RequestBody ProductImageUpdateRequest request
    ) {
        return ResponseEntity.ok(productImageService.updateMetadata(productId, imageId, request));
    }

    @DeleteMapping("/{imageId}")
    @Operation(
            summary = "Supprimer une image produit",
            description = "Supprime la metadonnee et le fichier local associe, puis promeut une autre image principale si necessaire."
    )
    public ResponseEntity<Void> delete(
            @PathVariable UUID productId,
            @PathVariable UUID imageId
    ) {
        productImageService.delete(productId, imageId);
        return ResponseEntity.noContent().build();
    }

}
