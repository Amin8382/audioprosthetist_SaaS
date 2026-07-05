package com.audiosoin.catalogue;

import com.audiosoin.fournisseur.BonCommande;
import com.audiosoin.fournisseur.BonCommandeRepository;
import com.audiosoin.fournisseur.BCLigne;
import com.audiosoin.fournisseur.BCLigneRepository;
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
public class CatalogueController {

    private final CatalogueService catalogueService;
    private final CatalogueProduitRepository catalogueProduitRepository;
    private final BonCommandeRepository bcRepository;
    private final BCLigneRepository bcLigneRepository;

    @GetMapping("/catalogue")
    public ResponseEntity<List<CatalogueProduit>> findAll(
            @RequestParam(required = false) Boolean disponibles,
            @RequestParam(required = false) UUID fournisseurId,
            @RequestParam(required = false) String categorie) {
        return ResponseEntity.ok(catalogueService.findAll(disponibles, fournisseurId, categorie));
    }

    @GetMapping("/catalogue/{id}")
    public ResponseEntity<CatalogueProduit> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(catalogueService.findById(id));
    }

    @PostMapping("/catalogue")
    public ResponseEntity<CatalogueProduit> create(@RequestBody CatalogueProduit produit, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(catalogueService.create(produit, userId));
    }

    @PutMapping("/catalogue/{id}")
    public ResponseEntity<CatalogueProduit> update(@PathVariable UUID id, @RequestBody CatalogueProduit update) {
        return ResponseEntity.ok(catalogueService.update(id, update));
    }

    @DeleteMapping("/catalogue/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        catalogueService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/marketplace/commander")
    public ResponseEntity<List<BonCommande>> passerCommande(
            @RequestBody Map<UUID, List<Map<String, Object>>> panier, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(catalogueService.passerCommande(panier, userId));
    }

    @GetMapping("/marketplace/commandes")
    public ResponseEntity<List<BonCommande>> getCommandes(Authentication auth) {
        String role = (String) auth.getDetails();
        if ("FOURNISSEUR".equals(role)) {
            return ResponseEntity.ok(bcRepository.findAll());
        }
        return ResponseEntity.ok(bcRepository.findAll());
    }

    @GetMapping("/marketplace/commandes/{id}")
    public ResponseEntity<BonCommande> getCommande(@PathVariable UUID id) {
        return ResponseEntity.ok(bcRepository.findById(id).orElseThrow());
    }

    @GetMapping("/marketplace/commandes/{id}/lignes")
    public ResponseEntity<List<BCLigne>> getCommandeLignes(@PathVariable UUID id) {
        return ResponseEntity.ok(bcLigneRepository.findByBcId(id));
    }

    @PutMapping("/marketplace/commandes/{id}/recevoir")
    public ResponseEntity<BonCommande> recevoirCommande(@PathVariable UUID id) {
        return ResponseEntity.ok(catalogueService.recevoirCommande(id));
    }

    @PutMapping("/marketplace/commandes/{id}/livrer")
    public ResponseEntity<BonCommande> livrerCommande(@PathVariable UUID id) {
        return ResponseEntity.ok(catalogueService.livrerCommande(id));
    }
}
