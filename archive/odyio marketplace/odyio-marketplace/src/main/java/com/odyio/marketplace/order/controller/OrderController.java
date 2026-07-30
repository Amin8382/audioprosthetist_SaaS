package com.odyio.marketplace.order.controller;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.order.dto.CancelOrderRequest;
import com.odyio.marketplace.order.dto.OrderResponse;
import com.odyio.marketplace.order.dto.OrderSummaryResponse;
import com.odyio.marketplace.order.service.OrderService;
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
@RequestMapping("/api/marketplace/orders")
@Tag(
        name = "Commandes",
        description = "Commandes creees explicitement depuis une offre acceptee. Les montants sont des snapshots immuables; aucun paiement ni expedition n'est implemente."
)
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/from-offer/{offerId}")
    @Operation(
            summary = "Creer une commande depuis une offre acceptee",
            description = "Cree une commande pour la clinique proprietaire a partir d'une offre fournisseur ACCEPTEE. "
                    + "Une seule commande peut exister par offre."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Commande creee"),
            @ApiResponse(responseCode = "400", description = "Donnees commerciales invalides"),
            @ApiResponse(responseCode = "403", description = "La clinique ne peut pas creer cette commande"),
            @ApiResponse(responseCode = "404", description = "Offre introuvable"),
            @ApiResponse(responseCode = "409", description = "Offre non acceptee ou commande deja existante")
    })
    public ResponseEntity<OrderResponse> createFromOffer(
            @PathVariable UUID offerId,
            @Parameter(description = "Identifiant temporaire de la clinique actrice")
            @RequestParam UUID clinicId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createFromOffer(offerId, clinicId));
    }

    @PatchMapping("/{orderId}/confirm")
    @Operation(
            summary = "Confirmer une commande",
            description = "Confirmation fournisseur uniquement: elle indique que le fournisseur prend la commande en charge. "
                    + "Elle n'implique ni paiement, ni expedition, ni livraison."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Commande confirmee"),
            @ApiResponse(responseCode = "403", description = "Le fournisseur ne peut pas confirmer cette commande"),
            @ApiResponse(responseCode = "404", description = "Commande introuvable"),
            @ApiResponse(responseCode = "409", description = "Transition de statut invalide")
    })
    public ResponseEntity<OrderResponse> confirm(
            @PathVariable UUID orderId,
            @Parameter(description = "Identifiant temporaire du fournisseur acteur")
            @RequestParam UUID supplierId
    ) {
        return ResponseEntity.ok(orderService.confirm(orderId, supplierId));
    }

    @PatchMapping("/{orderId}/cancel")
    @Operation(
            summary = "Annuler une commande",
            description = "Annule une commande encore au statut CREATED. Le motif est optionnel; s'il est fourni, il est nettoye et ne doit pas etre vide."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Commande annulee"),
            @ApiResponse(responseCode = "400", description = "Motif invalide"),
            @ApiResponse(responseCode = "403", description = "La clinique ne peut pas annuler cette commande"),
            @ApiResponse(responseCode = "404", description = "Commande introuvable"),
            @ApiResponse(responseCode = "409", description = "Transition de statut invalide")
    })
    public ResponseEntity<OrderResponse> cancel(
            @PathVariable UUID orderId,
            @Parameter(description = "Identifiant temporaire de la clinique actrice")
            @RequestParam UUID clinicId,
            @Valid @RequestBody(required = false) CancelOrderRequest request
    ) {
        return ResponseEntity.ok(orderService.cancel(orderId, clinicId, request));
    }

    @GetMapping("/clinic/{clinicId}")
    @Operation(
            summary = "Lister les commandes d'une clinique",
            description = "Retourne uniquement les commandes appartenant a la clinique, du plus recent au plus ancien, avec filtre de statut optionnel."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Commandes retournees"),
            @ApiResponse(responseCode = "404", description = "Clinique introuvable")
    })
    public ResponseEntity<List<OrderSummaryResponse>> getByClinic(
            @PathVariable UUID clinicId,
            @Parameter(description = "Filtrer les commandes par statut")
            @RequestParam(required = false) OrderStatus status
    ) {
        return ResponseEntity.ok(orderService.getByClinic(clinicId, status));
    }

    @GetMapping("/supplier/{supplierId}")
    @Operation(
            summary = "Lister les commandes d'un fournisseur",
            description = "Retourne uniquement les commandes appartenant au fournisseur, du plus recent au plus ancien, avec filtre de statut optionnel."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Commandes retournees"),
            @ApiResponse(responseCode = "404", description = "Fournisseur introuvable")
    })
    public ResponseEntity<List<OrderSummaryResponse>> getBySupplier(
            @PathVariable UUID supplierId,
            @Parameter(description = "Filtrer les commandes par statut")
            @RequestParam(required = false) OrderStatus status
    ) {
        return ResponseEntity.ok(orderService.getBySupplier(supplierId, status));
    }

    @GetMapping("/clinic/{clinicId}/{orderId}")
    @Operation(
            summary = "Consulter une commande cote clinique",
            description = "Retourne le detail d'une commande seulement si elle appartient a la clinique."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Commande trouvee"),
            @ApiResponse(responseCode = "403", description = "Commande non accessible a cette clinique"),
            @ApiResponse(responseCode = "404", description = "Clinique ou commande introuvable")
    })
    public ResponseEntity<OrderResponse> getClinicOrder(
            @PathVariable UUID clinicId,
            @PathVariable UUID orderId
    ) {
        return ResponseEntity.ok(orderService.getByClinicAndId(clinicId, orderId));
    }

    @GetMapping("/supplier/{supplierId}/{orderId}")
    @Operation(
            summary = "Consulter une commande cote fournisseur",
            description = "Retourne le detail d'une commande seulement si elle appartient au fournisseur."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Commande trouvee"),
            @ApiResponse(responseCode = "403", description = "Commande non accessible a ce fournisseur"),
            @ApiResponse(responseCode = "404", description = "Fournisseur ou commande introuvable")
    })
    public ResponseEntity<OrderResponse> getSupplierOrder(
            @PathVariable UUID supplierId,
            @PathVariable UUID orderId
    ) {
        return ResponseEntity.ok(orderService.getBySupplierAndId(supplierId, orderId));
    }

}
