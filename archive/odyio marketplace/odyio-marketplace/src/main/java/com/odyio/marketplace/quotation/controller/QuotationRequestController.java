package com.odyio.marketplace.quotation.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierQuotationWorkflowStatus;
import com.odyio.marketplace.quotation.dto.QuotationRequestCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestResponse;
import com.odyio.marketplace.quotation.dto.QuotationRequestSummaryResponse;
import com.odyio.marketplace.quotation.service.QuotationRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/quotation-requests")
@Tag(name = "Demandes de devis", description = "Gestion des demandes de devis sans prix public")
public class QuotationRequestController {

    private final QuotationRequestService quotationRequestService;

    @PostMapping
    @Operation(
            summary = "Creer une demande de devis",
            description = "Cree une demande de devis en brouillon pour une clinique et un fournisseur."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Demande de devis creee"),
            @ApiResponse(responseCode = "400", description = "Regle metier ou validation invalide"),
            @ApiResponse(responseCode = "404", description = "Clinique, fournisseur ou produit introuvable")
    })
    public ResponseEntity<QuotationRequestResponse> createDraft(
            @Valid @RequestBody QuotationRequestCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quotationRequestService.createDraft(request));
    }

    @PostMapping("/{id}/send")
    @Operation(
            summary = "Envoyer une demande de devis",
            description = "Envoie une demande de devis en brouillon et fixe sa date d'expiration."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demande de devis envoyee"),
            @ApiResponse(responseCode = "400", description = "La demande ne peut pas etre envoyee"),
            @ApiResponse(responseCode = "404", description = "Demande de devis introuvable")
    })
    public ResponseEntity<QuotationRequestResponse> send(@PathVariable UUID id) {
        return ResponseEntity.ok(quotationRequestService.send(id));
    }

    @GetMapping
    @Operation(
            summary = "Lister les demandes de devis",
            description = "Retourne les resumes de toutes les demandes de devis."
    )
    public ResponseEntity<List<QuotationRequestSummaryResponse>> getAll() {
        return ResponseEntity.ok(quotationRequestService.getAll());
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Consulter une demande de devis",
            description = "Retourne les details complets d'une demande de devis."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demande de devis trouvee"),
            @ApiResponse(responseCode = "404", description = "Demande de devis introuvable")
    })
    public ResponseEntity<QuotationRequestResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(quotationRequestService.getById(id));
    }

    @GetMapping("/clinic/{clinicId}")
    @Operation(
            summary = "Lister les demandes d'une clinique",
            description = "Retourne les resumes des demandes de devis creees par une clinique, avec filtre de statut optionnel et resume d'offre liee."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demandes de devis retournees"),
            @ApiResponse(responseCode = "404", description = "Clinique introuvable")
    })
    public ResponseEntity<List<QuotationRequestSummaryResponse>> getByClinic(
            @PathVariable UUID clinicId,
            @Parameter(description = "Filtrer par statut de demande")
            @RequestParam(required = false) QuotationRequestStatus status
    ) {
        return ResponseEntity.ok(quotationRequestService.getByClinic(clinicId, status));
    }

    @GetMapping("/supplier/{supplierId}")
    @Operation(
            summary = "Lister les demandes d'un fournisseur",
            description = "Retourne les demandes visibles par un fournisseur. Les brouillons ne sont jamais retournes. "
                    + "workflowStatus est derive: TO_PROCESS = envoyee sans offre, ANSWERED = avec offre, CANCELLED = annulee historiquement visible."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demandes de devis retournees"),
            @ApiResponse(responseCode = "404", description = "Fournisseur introuvable")
    })
    public ResponseEntity<List<QuotationRequestSummaryResponse>> getBySupplier(
            @PathVariable UUID supplierId,
            @Parameter(description = "Filtrer par statut de demande")
            @RequestParam(required = false) QuotationRequestStatus status,
            @Parameter(description = "Filtrer par etat de travail fournisseur derive")
            @RequestParam(required = false) SupplierQuotationWorkflowStatus workflowStatus
    ) {
        return ResponseEntity.ok(quotationRequestService.getBySupplier(supplierId, status, workflowStatus));
    }

    @GetMapping("/supplier/{supplierId}/{quotationRequestId}")
    @Operation(
            summary = "Consulter une demande cote fournisseur",
            description = "Retourne une demande seulement si elle appartient au fournisseur et si elle n'est pas en brouillon."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demande de devis trouvee"),
            @ApiResponse(responseCode = "403", description = "Demande non visible par ce fournisseur"),
            @ApiResponse(responseCode = "404", description = "Fournisseur ou demande introuvable")
    })
    public ResponseEntity<QuotationRequestResponse> getSupplierScopedById(
            @PathVariable UUID supplierId,
            @PathVariable UUID quotationRequestId
    ) {
        return ResponseEntity.ok(quotationRequestService.getBySupplierAndId(supplierId, quotationRequestId));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(
            summary = "Annuler une demande de devis",
            description = "Annule une demande de devis sans supprimer les lignes associees."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Demande de devis annulee"),
            @ApiResponse(responseCode = "400", description = "La demande ne peut pas etre annulee"),
            @ApiResponse(responseCode = "404", description = "Demande de devis introuvable")
    })
    public ResponseEntity<QuotationRequestResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(quotationRequestService.cancel(id));
    }

}
