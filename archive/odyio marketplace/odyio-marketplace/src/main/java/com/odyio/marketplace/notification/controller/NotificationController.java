package com.odyio.marketplace.notification.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.notification.dto.NotificationResponse;
import com.odyio.marketplace.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/marketplace/notifications")
@Tag(
        name = "Notifications",
        description = "Flux de notifications derivees et en lecture seule. L'etat lu/non lu est gere par le frontend; aucun email, push ou WebSocket n'est envoye."
)
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/clinic/{clinicId}")
    @Operation(
            summary = "Notifications d'une clinique",
            description = "Retourne les notifications derivees des offres d'une clinique, triees de la plus recente a la plus ancienne."
    )
    public ResponseEntity<List<NotificationResponse>> getClinicNotifications(
            @PathVariable UUID clinicId,
            @Parameter(description = "Nombre maximum de notifications, 20 par defaut")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Retourner seulement les notifications apres cet instant")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
            @Parameter(description = "Filtrer par type de notification")
            @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(notificationService.getClinicNotifications(clinicId, limit, since, type));
    }

    @GetMapping("/supplier/{supplierId}")
    @Operation(
            summary = "Notifications d'un fournisseur",
            description = "Retourne les notifications derivees des demandes envoyees et decisions d'offres d'un fournisseur."
    )
    public ResponseEntity<List<NotificationResponse>> getSupplierNotifications(
            @PathVariable UUID supplierId,
            @Parameter(description = "Nombre maximum de notifications, 20 par defaut")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Retourner seulement les notifications apres cet instant")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since,
            @Parameter(description = "Filtrer par type de notification")
            @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(notificationService.getSupplierNotifications(supplierId, limit, since, type));
    }

}
