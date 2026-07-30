package com.odyio.marketplace.catalog.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.catalog.dto.CategoryCreateRequest;
import com.odyio.marketplace.catalog.dto.CategoryResponse;
import com.odyio.marketplace.catalog.dto.CategoryUpdateRequest;
import com.odyio.marketplace.catalog.service.ProductCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/categories")
@Tag(name = "Categories", description = "Gestion des categories de produits du catalogue")
public class ProductCategoryController {

    private final ProductCategoryService productCategoryService;

    @PostMapping
    @Operation(summary = "Creer une categorie", description = "Ajoute une nouvelle categorie de produits au catalogue.")
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productCategoryService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lister les categories", description = "Retourne toutes les categories de produits.")
    public ResponseEntity<List<CategoryResponse>> getAll() {
        return ResponseEntity.ok(productCategoryService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulter une categorie", description = "Retourne les details d'une categorie par son identifiant.")
    public ResponseEntity<CategoryResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(productCategoryService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une categorie", description = "Met a jour les informations d'une categorie existante.")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryUpdateRequest request
    ) {
        return ResponseEntity.ok(productCategoryService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactiver une categorie", description = "Desactive une categorie sans la supprimer definitivement.")
    public ResponseEntity<CategoryResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(productCategoryService.deactivate(id));
    }

}
