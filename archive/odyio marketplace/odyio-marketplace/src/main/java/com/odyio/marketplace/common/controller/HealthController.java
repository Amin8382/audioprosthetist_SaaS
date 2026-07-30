package com.odyio.marketplace.common.controller;

import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Sante", description = "Verification de disponibilite du service Marketplace")
public class HealthController {

    @GetMapping("/api/marketplace/health")
    @Operation(summary = "Verifier la sante du service", description = "Retourne l'etat de disponibilite du service Marketplace.")
    public Map<String, String> health() {
        return Map.of(
                "service", "odyio-marketplace-service",
                "status", "UP"
        );
    }

}
