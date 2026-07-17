package com.odyio.catalogue;

import com.odyio.fournisseur.Fournisseur;
import com.odyio.fournisseur.FournisseurRepository;
import com.odyio.fournisseur.BonCommande;
import com.odyio.fournisseur.BonCommandeRepository;
import com.odyio.fournisseur.BCLigne;
import com.odyio.fournisseur.BCLigneRepository;
import com.odyio.stock.StockItem;
import com.odyio.stock.StockItemRepository;
import com.odyio.stock.StockMouvement;
import com.odyio.stock.StockMouvementRepository;
import com.odyio.tresorerie.TresorerieMouvement;
import com.odyio.tresorerie.TresorerieMouvementRepository;
import com.odyio.config.ClinicConfig;
import com.odyio.config.ClinicConfigRepository;
import com.odyio.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CatalogueService {

    private final CatalogueProduitRepository catalogueProduitRepository;
    private final FournisseurRepository fournisseurRepository;
    private final BonCommandeRepository bcRepository;
    private final BCLigneRepository bcLigneRepository;
    private final StockItemRepository stockItemRepository;
    private final StockMouvementRepository stockMouvementRepository;
    private final TresorerieMouvementRepository tresorerieRepository;
    private final ClinicConfigRepository configRepository;
    private final UserRepository userRepository;

    public List<CatalogueProduit> findAll(Boolean availableOnly, UUID fournisseurId, String categorie) {
        if (fournisseurId != null && availableOnly != null && availableOnly) {
            return catalogueProduitRepository.findByIsAvailableTrueAndFournisseurIdOrderByNomProduit(fournisseurId);
        }
        if (fournisseurId != null) {
            return catalogueProduitRepository.findByFournisseurIdOrderByNomProduit(fournisseurId);
        }
        if (categorie != null && availableOnly != null && availableOnly) {
            return catalogueProduitRepository.findByIsAvailableTrueAndCategorieOrderByNomProduit(categorie);
        }
        if (availableOnly != null && availableOnly) {
            return catalogueProduitRepository.findByIsAvailableTrueOrderByNomProduit();
        }
        return catalogueProduitRepository.findAll();
    }

    public CatalogueProduit findById(UUID id) {
        return catalogueProduitRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Produit catalogue non trouvé"));
    }

    @Transactional
    public CatalogueProduit create(CatalogueProduit produit, UUID userId) {
        produit.setCreatedBy(userRepository.getReferenceById(userId));
        produit.setCreatedAt(Instant.now());
        if (produit.getIsAvailable() == null) produit.setIsAvailable(true);
        if (produit.getTvaRate() == null) produit.setTvaRate(new BigDecimal("19.0"));
        return catalogueProduitRepository.save(produit);
    }

    @Transactional
    public CatalogueProduit update(UUID id, CatalogueProduit update) {
        CatalogueProduit p = findById(id);
        if (update.getNomProduit() != null) p.setNomProduit(update.getNomProduit());
        if (update.getReferenceFournisseur() != null) p.setReferenceFournisseur(update.getReferenceFournisseur());
        if (update.getCategorie() != null) p.setCategorie(update.getCategorie());
        if (update.getPrixUnitaireHt() != null) p.setPrixUnitaireHt(update.getPrixUnitaireHt());
        if (update.getTvaRate() != null) p.setTvaRate(update.getTvaRate());
        if (update.getEarSide() != null) p.setEarSide(update.getEarSide());
        if (update.getDescription() != null) p.setDescription(update.getDescription());
        if (update.getIsAvailable() != null) p.setIsAvailable(update.getIsAvailable());
        return catalogueProduitRepository.save(p);
    }

    @Transactional
    public void delete(UUID id) {
        catalogueProduitRepository.deleteById(id);
    }

    @Transactional
    public List<BonCommande> passerCommande(Map<UUID, List<Map<String, Object>>> panier, UUID userId) {
        List<BonCommande> created = new ArrayList<>();
        for (Map.Entry<UUID, List<Map<String, Object>>> entry : panier.entrySet()) {
            UUID fournisseurId = entry.getKey();
            List<Map<String, Object>> items = entry.getValue();
            Fournisseur fournisseur = fournisseurRepository.findById(fournisseurId)
                    .orElseThrow(() -> new IllegalArgumentException("Fournisseur non trouvé: " + fournisseurId));

            ClinicConfig config = configRepository.findFirstByOrderById()
                    .orElseThrow(() -> new RuntimeException("Clinique non configurée"));
            int year = LocalDate.now().getYear();
            if (config.getCurrentYear() != year) {
                config.setCurrentYear(year);
                config.setBcSequence(1);
            }
            int seq = config.getBcSequence();
            config.setBcSequence(seq + 1);
            configRepository.save(config);

            BonCommande bc = new BonCommande();
            bc.setNumero(String.format("BC-%d-%04d", year, seq));
            bc.setFournisseur(fournisseur);
            bc.setDateCommande(LocalDate.now());
            bc.setStatus("ENVOYE");
            bc.setCreatedBy(userRepository.getReferenceById(userId));
            bc.setCreatedAt(Instant.now());
            bc = bcRepository.save(bc);

            BigDecimal total = BigDecimal.ZERO;
            for (Map<String, Object> item : items) {
                BCLigne ligne = new BCLigne();
                UUID produitId = UUID.fromString((String) item.get("produitId"));
                CatalogueProduit prod = findById(produitId);
                ligne.setBc(bc);
                ligne.setDescription(prod.getNomProduit());
                ligne.setQuantity(Integer.parseInt(item.get("quantity").toString()));
                ligne.setUnitPriceHt(prod.getPrixUnitaireHt());
                ligne.setCatalogueProduitId(produitId);
                bcLigneRepository.save(ligne);
                total = total.add(prod.getPrixUnitaireHt().multiply(BigDecimal.valueOf(ligne.getQuantity())));
            }
            bc.setTotalHt(total);
            bc = bcRepository.save(bc);
            created.add(bc);
        }
        return created;
    }

    @Transactional
    public BonCommande recevoirCommande(UUID bcId) {
        BonCommande bc = bcRepository.findById(bcId)
                .orElseThrow(() -> new IllegalArgumentException("Bon de commande non trouvé"));
        bc.setStatus("RECU");
        bc = bcRepository.save(bc);

        List<BCLigne> lignes = bcLigneRepository.findByBcId(bcId);
        for (BCLigne ligne : lignes) {
            if (ligne.getCatalogueProduitId() != null) {
                CatalogueProduit prod = findById(ligne.getCatalogueProduitId());

                StockItem item = new StockItem();
                item.setReference(prod.getReferenceFournisseur() != null ? prod.getReferenceFournisseur() : UUID.randomUUID().toString().substring(0, 8));
                item.setFullName(prod.getNomProduit());
                item.setCategory(prod.getCategorie());
                item.setFournisseur(bc.getFournisseur());
                item.setUnitPriceHt(prod.getPrixUnitaireHt());
                item.setTvaRate(prod.getTvaRate());
                item.setQuantityInStock(ligne.getQuantity());
                item.setQuantityMinimum(0);
                item.setEarSide(prod.getEarSide());
                item.setCreatedAt(Instant.now());
                stockItemRepository.save(item);

                StockMouvement mv = new StockMouvement();
                mv.setStockItem(item);
                mv.setType("ENTREE");
                mv.setQuantity(ligne.getQuantity());
                mv.setReferenceType("BC");
                mv.setReferenceId(bcId);
                mv.setDateMouvement(LocalDate.now());
                mv.setCreatedAt(Instant.now());
                stockMouvementRepository.save(mv);
            } else if (ligne.getStockItem() != null) {
                StockItem item = ligne.getStockItem();
                item.setQuantityInStock(item.getQuantityInStock() + ligne.getQuantity());
                stockItemRepository.save(item);

                StockMouvement mv = new StockMouvement();
                mv.setStockItem(item);
                mv.setType("ENTREE");
                mv.setQuantity(ligne.getQuantity());
                mv.setReferenceType("BC");
                mv.setReferenceId(bcId);
                mv.setDateMouvement(LocalDate.now());
                mv.setCreatedAt(Instant.now());
                stockMouvementRepository.save(mv);
            }
        }

        TresorerieMouvement tm = new TresorerieMouvement();
        tm.setDateMouvement(LocalDate.now());
        tm.setType("DEPENSE");
        tm.setCategorie("ACHAT_STOCK");
        tm.setMontant(bc.getTotalHt());
        tm.setModePaiement("VIREMENT");
        tm.setReferenceType("BC");
        tm.setReferenceId(bcId);
        tm.setDescription("Réception BC " + bc.getNumero());
        tm.setCreatedAt(Instant.now());
        tresorerieRepository.save(tm);

        return bc;
    }

    @Transactional
    public BonCommande livrerCommande(UUID bcId) {
        BonCommande bc = bcRepository.findById(bcId)
                .orElseThrow(() -> new IllegalArgumentException("Bon de commande non trouvé"));
        bc.setStatus("LIVRE");
        return bcRepository.save(bc);
    }
}
