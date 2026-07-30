package com.odyio.marketplace.catalog.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.catalog.dto.ProductCreateRequest;
import com.odyio.marketplace.catalog.dto.ProductResponse;
import com.odyio.marketplace.catalog.dto.ProductUpdateRequest;
import com.odyio.marketplace.catalog.service.ProductService;
import com.odyio.marketplace.common.enums.EarSide;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/products")
@Tag(name = "Produits", description = "Gestion des produits du catalogue sans prix public")
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @Operation(
            summary = "Creer un produit",
            description = "Ajoute un produit au catalogue sans prix, TVA ou devise. Le flux recommande est de creer le produit, puis d'uploader ses images via multipart avec l'identifiant produit."
    )
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request));
    }

    @GetMapping
    @Operation(
            summary = "Lister et filtrer les produits",
            description = "Retourne les produits du catalogue avec filtres optionnels combines en ET, tries du plus recent au plus ancien. "
                    + "Chaque produit expose son image principale et sa galerie ordonnee."
    )
    public ResponseEntity<List<ProductResponse>> getAll(
            @Parameter(description = "Recherche insensible a la casse sur nom, marque, modele ou reference")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filtrer par fournisseur")
            @RequestParam(required = false) UUID supplierId,
            @Parameter(description = "Filtrer par categorie")
            @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Filtrer par cote d'oreille")
            @RequestParam(required = false) EarSide earSide,
            @Parameter(description = "Filtrer par disponibilite")
            @RequestParam(required = false) Boolean available,
            @Parameter(description = "Filtrer par etat actif")
            @RequestParam(required = false) Boolean active
    ) {
        return ResponseEntity.ok(productService.search(search, supplierId, categoryId, earSide, available, active));
    }

    @GetMapping("/supplier/{supplierId}")
    @Operation(
            summary = "Lister les produits d'un fournisseur",
            description = "Retourne uniquement les produits d'un fournisseur avec filtres optionnels, tries du plus recent au plus ancien, avec image principale."
    )
    public ResponseEntity<List<ProductResponse>> getBySupplier(
            @PathVariable UUID supplierId,
            @Parameter(description = "Recherche insensible a la casse sur nom, marque, modele ou reference")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filtrer par categorie")
            @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Filtrer par cote d'oreille")
            @RequestParam(required = false) EarSide earSide,
            @Parameter(description = "Filtrer par disponibilite")
            @RequestParam(required = false) Boolean available,
            @Parameter(description = "Filtrer par etat actif")
            @RequestParam(required = false) Boolean active
    ) {
        return ResponseEntity.ok(productService.getBySupplier(supplierId, search, categoryId, earSide, available, active));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Consulter un produit",
            description = "Retourne les details d'un produit et sa galerie d'images ordonnee: image principale d'abord, puis ordre d'affichage."
    )
    public ResponseEntity<ProductResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Modifier un produit",
            description = "Met a jour les informations d'un produit. Les fichiers images se gerent via les endpoints multipart dedies."
    )
    public ResponseEntity<ProductResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ProductUpdateRequest request
    ) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactiver un produit", description = "Desactive un produit sans le supprimer definitivement.")
    public ResponseEntity<ProductResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.deactivate(id));
    }

}
