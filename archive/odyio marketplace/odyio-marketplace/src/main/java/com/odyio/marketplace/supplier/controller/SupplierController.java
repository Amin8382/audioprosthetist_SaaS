package com.odyio.marketplace.supplier.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.supplier.dto.SupplierCreateRequest;
import com.odyio.marketplace.supplier.dto.SupplierResponse;
import com.odyio.marketplace.supplier.dto.SupplierUpdateRequest;
import com.odyio.marketplace.supplier.service.SupplierService;
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
@RequestMapping("/api/marketplace/suppliers")
@Tag(name = "Fournisseurs", description = "Gestion des fournisseurs du Marketplace")
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    @Operation(summary = "Creer un fournisseur", description = "Ajoute un nouveau fournisseur au Marketplace.")
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lister les fournisseurs", description = "Retourne tous les fournisseurs enregistres.")
    public ResponseEntity<List<SupplierResponse>> getAll() {
        return ResponseEntity.ok(supplierService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulter un fournisseur", description = "Retourne les details d'un fournisseur par son identifiant.")
    public ResponseEntity<SupplierResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(supplierService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un fournisseur", description = "Met a jour les informations d'un fournisseur existant.")
    public ResponseEntity<SupplierResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody SupplierUpdateRequest request
    ) {
        return ResponseEntity.ok(supplierService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactiver un fournisseur", description = "Desactive un fournisseur sans le supprimer definitivement.")
    public ResponseEntity<SupplierResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(supplierService.deactivate(id));
    }

}
