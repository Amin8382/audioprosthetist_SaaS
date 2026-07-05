package com.audiosoin.facturation;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/factures")
@RequiredArgsConstructor
public class FactureController {

    private final FactureService factureService;

    @GetMapping
    public ResponseEntity<Page<Facture>> findAll(Pageable pageable) {
        return ResponseEntity.ok(factureService.findAll(pageable));
    }

    @PostMapping
    public ResponseEntity<Facture> create(@RequestBody Map<String, Object> body, Authentication auth) {
        UUID clientId = UUID.fromString((String) body.get("clientId"));
        @SuppressWarnings("unchecked")
        List<String> blIdsRaw = (List<String>) body.get("blIds");
        List<UUID> blIds = blIdsRaw.stream().map(UUID::fromString).toList();
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(factureService.createFromBLs(clientId, blIds, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Facture> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(factureService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Facture> update(@PathVariable UUID id, @RequestBody Facture facture, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(factureService.update(id, facture, userId));
    }

    @PostMapping("/{id}/paiement")
    public ResponseEntity<Paiement> addPaiement(@PathVariable UUID id, @RequestBody Paiement paiement, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(factureService.addPaiement(id, paiement, userId));
    }

    @GetMapping("/{id}/print")
    public ResponseEntity<Map<String, String>> print(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of("pdf", factureService.getPdfContent(id)));
    }

    @PutMapping("/{id}/annuler")
    public ResponseEntity<Facture> annuler(@PathVariable UUID id) {
        return ResponseEntity.ok(factureService.annuler(id));
    }
}
