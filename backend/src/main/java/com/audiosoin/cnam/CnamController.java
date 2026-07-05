package com.audiosoin.cnam;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cnam")
@RequiredArgsConstructor
public class CnamController {

    private final CnamService cnamService;

    @GetMapping
    public ResponseEntity<List<CnamDemande>> findAll() { return ResponseEntity.ok(cnamService.findAll()); }

    @PostMapping
    public ResponseEntity<CnamDemande> create(@RequestBody Map<String, String> body) {
        UUID clientId = UUID.fromString(body.get("clientId"));
        UUID factureId = UUID.fromString(body.get("factureId"));
        return ResponseEntity.ok(cnamService.create(clientId, factureId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CnamDemande> findById(@PathVariable UUID id) { return ResponseEntity.ok(cnamService.findById(id)); }

    @PostMapping("/{id}/documents/upload")
    public ResponseEntity<CnamDocument> uploadDocument(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(cnamService.uploadDocument(id, body.get("documentType"), body.get("filePath")));
    }

    @PostMapping("/{id}/soumettre")
    public ResponseEntity<CnamDemande> soumettre(@PathVariable UUID id) { return ResponseEntity.ok(cnamService.soumettre(id)); }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<Map<String, String>> getPdf(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of("pdf", cnamService.getPdfContent(id)));
    }

    @PutMapping("/{id}/statut")
    public ResponseEntity<CnamDemande> updateStatus(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        BigDecimal montant = body.get("montantApprouve") != null ? new BigDecimal(body.get("montantApprouve").toString()) : null;
        String motif = (String) body.get("motifRejet");
        return ResponseEntity.ok(cnamService.updateStatus(id, status, montant, motif));
    }

    @PostMapping("/{id}/resoumettre")
    public ResponseEntity<CnamDemande> resoumettre(@PathVariable UUID id) { return ResponseEntity.ok(cnamService.resoumettre(id)); }
}
