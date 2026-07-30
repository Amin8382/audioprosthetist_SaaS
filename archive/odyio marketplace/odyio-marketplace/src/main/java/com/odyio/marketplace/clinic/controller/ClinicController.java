package com.odyio.marketplace.clinic.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.clinic.dto.ClinicCreateRequest;
import com.odyio.marketplace.clinic.dto.ClinicResponse;
import com.odyio.marketplace.clinic.dto.ClinicUpdateRequest;
import com.odyio.marketplace.clinic.service.ClinicService;
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
@RequestMapping("/api/marketplace/clinics")
@Tag(name = "Cliniques", description = "Gestion des cliniques clientes du Marketplace")
public class ClinicController {

    private final ClinicService clinicService;

    @PostMapping
    @Operation(summary = "Creer une clinique", description = "Ajoute une nouvelle clinique cliente au Marketplace.")
    public ResponseEntity<ClinicResponse> create(@Valid @RequestBody ClinicCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clinicService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lister les cliniques", description = "Retourne toutes les cliniques enregistrees.")
    public ResponseEntity<List<ClinicResponse>> getAll() {
        return ResponseEntity.ok(clinicService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulter une clinique", description = "Retourne les details d'une clinique par son identifiant.")
    public ResponseEntity<ClinicResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(clinicService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une clinique", description = "Met a jour les informations d'une clinique existante.")
    public ResponseEntity<ClinicResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ClinicUpdateRequest request
    ) {
        return ResponseEntity.ok(clinicService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactiver une clinique", description = "Desactive une clinique sans la supprimer definitivement.")
    public ResponseEntity<ClinicResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(clinicService.deactivate(id));
    }

}
