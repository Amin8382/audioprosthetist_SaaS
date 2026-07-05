package com.audiosoin.fournisseur;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FournisseurController {

    private final FournisseurService fournisseurService;

    @GetMapping("/fournisseurs")
    public ResponseEntity<List<Fournisseur>> findAll() { return ResponseEntity.ok(fournisseurService.findAll()); }

    @PostMapping("/fournisseurs")
    public ResponseEntity<Fournisseur> create(@RequestBody Fournisseur f) { return ResponseEntity.ok(fournisseurService.create(f)); }

    @GetMapping("/fournisseurs/{id}")
    public ResponseEntity<Fournisseur> findById(@PathVariable UUID id) { return ResponseEntity.ok(fournisseurService.findById(id)); }

    @PutMapping("/fournisseurs/{id}")
    public ResponseEntity<Fournisseur> update(@PathVariable UUID id, @RequestBody Fournisseur f) { return ResponseEntity.ok(fournisseurService.update(id, f)); }

    @GetMapping("/bons-commande")
    public ResponseEntity<List<BonCommande>> findAllBC() { return ResponseEntity.ok(fournisseurService.findAllBC()); }

    @PostMapping("/bons-commande")
    public ResponseEntity<BonCommande> createBC(@RequestBody Map<String, Object> body, Authentication auth) {
        BonCommande bc = new BonCommande();
        bc.setFournisseur(new Fournisseur());
        bc.getFournisseur().setId(UUID.fromString((String) body.get("fournisseurId")));
        bc.setNotes((String) body.get("notes"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lignesData = (List<Map<String, Object>>) body.get("lignes");
        List<BCLigne> lignes = lignesData.stream().map(ld -> {
            BCLigne l = new BCLigne();
            l.setDescription((String) ld.get("description"));
            l.setQuantity(Integer.parseInt(ld.get("quantity").toString()));
            l.setUnitPriceHt(new java.math.BigDecimal(ld.get("unitPriceHt").toString()));
            if (ld.get("stockItemId") != null) {
                com.audiosoin.stock.StockItem si = new com.audiosoin.stock.StockItem();
                si.setId(UUID.fromString((String) ld.get("stockItemId")));
                l.setStockItem(si);
            }
            return l;
        }).toList();
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(fournisseurService.createBC(bc, lignes, userId));
    }

    @GetMapping("/bons-commande/{id}")
    public ResponseEntity<BonCommande> findBCById(@PathVariable UUID id) {
        return ResponseEntity.ok(bcRepository.findById(id).orElseThrow());
    }

    @PutMapping("/bons-commande/{id}/recevoir")
    public ResponseEntity<BonCommande> recevoir(@PathVariable UUID id) { return ResponseEntity.ok(fournisseurService.recevoirBC(id)); }

    @GetMapping("/reparations")
    public ResponseEntity<List<TicketReparation>> findAllTickets() { return ResponseEntity.ok(fournisseurService.findAllTickets()); }

    @PostMapping("/reparations")
    public ResponseEntity<TicketReparation> createTicket(@RequestBody TicketReparation ticket) { return ResponseEntity.ok(fournisseurService.createTicket(ticket)); }

    @GetMapping("/reparations/{id}")
    public ResponseEntity<TicketReparation> findTicketById(@PathVariable UUID id) {
        return ResponseEntity.ok(ticketRepository.findById(id).orElseThrow());
    }

    @PutMapping("/reparations/{id}/status")
    public ResponseEntity<TicketReparation> updateTicketStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(fournisseurService.updateTicketStatus(id, body.get("status")));
    }

    private final com.audiosoin.fournisseur.BonCommandeRepository bcRepository;
    private final com.audiosoin.fournisseur.TicketReparationRepository ticketRepository;
}
