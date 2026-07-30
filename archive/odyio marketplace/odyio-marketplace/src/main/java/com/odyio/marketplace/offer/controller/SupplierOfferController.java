package com.odyio.marketplace.offer.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.offer.dto.RejectSupplierOfferRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferCreateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferSummaryResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferUpdateRequest;
import com.odyio.marketplace.offer.service.SupplierOfferService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/offers")
@Tag(
        name = "Offres fournisseurs",
        description = "Gestion des offres fournisseurs. Limitation MVP: une seule offre par demande de devis; des offres versionnees multiples seront ajoutees plus tard."
)
public class SupplierOfferController {

    private final SupplierOfferService supplierOfferService;

    @PostMapping
    @Operation(
            summary = "Creer une offre fournisseur",
            description = "Cree une offre fournisseur en brouillon pour une demande de devis envoyee."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Offre creee"),
            @ApiResponse(responseCode = "400", description = "Regle metier ou validation invalide"),
            @ApiResponse(responseCode = "404", description = "Demande de devis ou fournisseur introuvable"),
            @ApiResponse(responseCode = "409", description = "Une offre existe deja pour cette demande")
    })
    public ResponseEntity<SupplierOfferResponse> createDraft(
            @Valid @RequestBody SupplierOfferCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierOfferService.createDraft(request));
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Modifier une offre en brouillon",
            description = "Met a jour une offre fournisseur tant qu'elle est encore en brouillon."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre modifiee"),
            @ApiResponse(responseCode = "400", description = "L'offre ne peut pas etre modifiee"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable")
    })
    public ResponseEntity<SupplierOfferResponse> updateDraft(
            @PathVariable UUID id,
            @Valid @RequestBody SupplierOfferUpdateRequest request
    ) {
        return ResponseEntity.ok(supplierOfferService.updateDraft(id, request));
    }

    @PostMapping("/{id}/submit")
    @Operation(
            summary = "Soumettre une offre fournisseur",
            description = "Soumet une offre en brouillon. Apres soumission, l'offre devient immuable pour ce sprint."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre soumise"),
            @ApiResponse(responseCode = "400", description = "L'offre ne peut pas etre soumise"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable")
    })
    public ResponseEntity<SupplierOfferResponse> submit(@PathVariable UUID id) {
        return ResponseEntity.ok(supplierOfferService.submit(id));
    }

    @PatchMapping("/{id}/withdraw")
    @Operation(
            summary = "Retirer une offre fournisseur",
            description = "Retire une offre soumise sans supprimer les donnees."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre retiree"),
            @ApiResponse(responseCode = "400", description = "L'offre ne peut pas etre retiree"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable")
    })
    public ResponseEntity<SupplierOfferResponse> withdraw(@PathVariable UUID id) {
        return ResponseEntity.ok(supplierOfferService.withdraw(id));
    }

    @PatchMapping("/{id}/accept")
    @Operation(
            summary = "Accepter une offre fournisseur",
            description = "Permet a la clinique proprietaire de la demande d'accepter une offre soumise et encore valide. "
                    + "Le parametre clinicId est temporaire et sera remplace par l'identite authentifiee."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre acceptee"),
            @ApiResponse(responseCode = "400", description = "L'offre n'est pas soumise ou n'est plus valide"),
            @ApiResponse(responseCode = "403", description = "La clinique ne peut pas traiter cette offre"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable"),
            @ApiResponse(responseCode = "409", description = "L'offre est deja dans un etat terminal")
    })
    public ResponseEntity<SupplierOfferResponse> accept(
            @PathVariable UUID id,
            @Parameter(description = "Identifiant temporaire de la clinique actrice")
            @RequestParam UUID clinicId
    ) {
        return ResponseEntity.ok(supplierOfferService.acceptOffer(id, clinicId));
    }

    @PatchMapping("/{id}/reject")
    @Operation(
            summary = "Rejeter une offre fournisseur",
            description = "Permet a la clinique proprietaire de la demande de rejeter une offre soumise. "
                    + "Le motif est optionnel; s'il est fourni, il ne doit pas etre vide. "
                    + "Le parametre clinicId est temporaire et sera remplace par l'identite authentifiee."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre rejetee"),
            @ApiResponse(responseCode = "400", description = "L'offre n'est pas soumise, n'est plus valide ou le motif est invalide"),
            @ApiResponse(responseCode = "403", description = "La clinique ne peut pas traiter cette offre"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable"),
            @ApiResponse(responseCode = "409", description = "L'offre est deja dans un etat terminal")
    })
    public ResponseEntity<SupplierOfferResponse> reject(
            @PathVariable UUID id,
            @Parameter(description = "Identifiant temporaire de la clinique actrice")
            @RequestParam UUID clinicId,
            @Valid @RequestBody(required = false) RejectSupplierOfferRequest request
    ) {
        return ResponseEntity.ok(supplierOfferService.rejectOffer(id, clinicId, request));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Consulter une offre fournisseur",
            description = "Retourne les details complets d'une offre fournisseur."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre trouvee"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable")
    })
    public ResponseEntity<SupplierOfferResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(supplierOfferService.getById(id));
    }

    @GetMapping("/quotation-request/{quotationRequestId}")
    @Operation(
            summary = "Consulter l'offre d'une demande de devis",
            description = "Retourne l'offre fournisseur associee a une demande de devis, si elle existe."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offre trouvee"),
            @ApiResponse(responseCode = "404", description = "Aucune offre pour cette demande")
    })
    public ResponseEntity<SupplierOfferResponse> getByQuotationRequest(@PathVariable UUID quotationRequestId) {
        return ResponseEntity.ok(supplierOfferService.getByQuotationRequest(quotationRequestId));
    }

    @GetMapping("/supplier/{supplierId}")
    @Operation(
            summary = "Lister les offres d'un fournisseur",
            description = "Retourne les offres d'un fournisseur, avec filtre de statut optionnel, du plus recent au plus ancien."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Offres retournees"),
            @ApiResponse(responseCode = "404", description = "Fournisseur introuvable")
    })
    public ResponseEntity<List<SupplierOfferSummaryResponse>> getBySupplier(
            @PathVariable UUID supplierId,
            @Parameter(description = "Filtrer les offres par statut")
            @RequestParam(required = false) SupplierOfferStatus status
    ) {
        return ResponseEntity.ok(supplierOfferService.getBySupplier(supplierId, status));
    }

}
