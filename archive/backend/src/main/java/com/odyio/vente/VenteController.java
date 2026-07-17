package com.odyio.vente;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bls")
@RequiredArgsConstructor
public class VenteController {

    private final VenteService venteService;

    @GetMapping
    public ResponseEntity<Page<BonLivraison>> findAll(Pageable pageable) {
        return ResponseEntity.ok(venteService.findAll(pageable));
    }

    @PostMapping
    public ResponseEntity<BonLivraison> create(@RequestBody Map<String, Object> body, Authentication auth) {
        BonLivraison bl = new BonLivraison();
        bl.setType((String) body.get("type"));
        if (body.get("tvaRate") != null) {
            bl.setTvaRate(new java.math.BigDecimal(body.get("tvaRate").toString()));
        }
        bl.setNotes((String) body.get("notes"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lignesData = (List<Map<String, Object>>) body.get("lignes");
        List<BLLigne> lignes = lignesData.stream().map(ld -> {
            BLLigne l = new BLLigne();
            l.setDescription((String) ld.get("description"));
            l.setQuantity(new java.math.BigDecimal(ld.get("quantity").toString()));
            l.setUnitPriceHt(new java.math.BigDecimal(ld.get("unitPriceHt").toString()));
            l.setEarSide((String) ld.get("earSide"));
            if (ld.get("stockItemId") != null) {
                com.odyio.stock.StockItem si = new com.odyio.stock.StockItem();
                si.setId(UUID.fromString((String) ld.get("stockItemId")));
                l.setStockItem(si);
            }
            return l;
        }).toList();
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(venteService.create(bl, lignes, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BonLivraison> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(venteService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BonLivraison> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        BonLivraison bl = venteService.findById(id);
        if (body.get("notes") != null) bl.setNotes((String) body.get("notes"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lignesData = (List<Map<String, Object>>) body.get("lignes");
        List<BLLigne> lignes = lignesData.stream().map(ld -> {
            BLLigne l = new BLLigne();
            l.setDescription((String) ld.get("description"));
            l.setQuantity(new java.math.BigDecimal(ld.get("quantity").toString()));
            l.setUnitPriceHt(new java.math.BigDecimal(ld.get("unitPriceHt").toString()));
            l.setEarSide((String) ld.get("earSide"));
            return l;
        }).toList();
        return ResponseEntity.ok(venteService.update(id, bl, lignes));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<BonLivraison> confirm(@PathVariable UUID id) {
        return ResponseEntity.ok(venteService.confirm(id));
    }

    @GetMapping("/{id}/print")
    public ResponseEntity<byte[]> print(@PathVariable UUID id) {
        byte[] pdf = venteService.getPdfContent(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"BL-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
