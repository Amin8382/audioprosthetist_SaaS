package com.audiosoin.vente;

import com.audiosoin.config.ClinicConfig;
import com.audiosoin.config.ClinicConfigRepository;
import com.audiosoin.stock.StockItem;
import com.audiosoin.stock.StockItemRepository;
import com.audiosoin.stock.StockMouvement;
import com.audiosoin.stock.StockMouvementRepository;
import com.audiosoin.user.User;
import com.audiosoin.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VenteService {

    private final BonLivraisonRepository blRepository;
    private final BLLigneRepository blLigneRepository;
    private final StockItemRepository stockItemRepository;
    private final StockMouvementRepository stockMouvementRepository;
    private final ClinicConfigRepository configRepository;
    private final UserRepository userRepository;

    public Page<BonLivraison> findAll(Pageable pageable) {
        return blRepository.findAll(pageable);
    }

    public BonLivraison findById(UUID id) {
        return blRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("BL not found"));
    }

    public List<BLLigne> getLignes(UUID blId) {
        return blLigneRepository.findByBlId(blId);
    }

    @Transactional
    public BonLivraison create(BonLivraison bl, List<BLLigne> lignes, UUID userId) {
        ClinicConfig config = configRepository.findFirstByOrderById()
                .orElseThrow(() -> new RuntimeException("Clinic not configured"));
        
        int year = LocalDate.now().getYear();
        if (config.getCurrentYear() != year) {
            config.setCurrentYear(year);
            config.setBlSequence(1);
        }
        int seq = config.getBlSequence();
        config.setBlSequence(seq + 1);
        configRepository.save(config);
        
        bl.setNumero(String.format("BL-%d-%04d", year, seq));
        bl.setStatus("DRAFT");
        bl.setDateBl(LocalDate.now());
        bl.setCreatedBy(userRepository.getReferenceById(userId));
        bl.setCreatedAt(Instant.now());
        bl = blRepository.save(bl);

        BigDecimal totalHt = BigDecimal.ZERO;
        for (BLLigne ligne : lignes) {
            ligne.setBl(bl);
            BigDecimal lineTotal = ligne.getUnitPriceHt().multiply(ligne.getQuantity());
            totalHt = totalHt.add(lineTotal);
            blLigneRepository.save(ligne);
        }

        bl.setTotalHt(totalHt);
        BigDecimal tvaRate = bl.getTvaRate() != null ? bl.getTvaRate() : new BigDecimal("19.0");
        BigDecimal tva = totalHt.multiply(tvaRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        bl.setTotalTtc(totalHt.add(tva));
        return blRepository.save(bl);
    }

    @Transactional
    public BonLivraison update(UUID id, BonLivraison update, List<BLLigne> lignes) {
        BonLivraison bl = findById(id);
        if (!"DRAFT".equals(bl.getStatus())) {
            throw new IllegalStateException("Only DRAFT BLs can be edited");
        }
        if (update.getClient() != null) bl.setClient(update.getClient());
        if (update.getType() != null) bl.setType(update.getType());
        if (update.getNotes() != null) bl.setNotes(update.getNotes());

        blLigneRepository.findByBlId(id).forEach(l -> blLigneRepository.delete(l));
        BigDecimal totalHt = BigDecimal.ZERO;
        for (BLLigne ligne : lignes) {
            ligne.setBl(bl);
            ligne.setId(null);
            BigDecimal lineTotal = ligne.getUnitPriceHt().multiply(ligne.getQuantity());
            totalHt = totalHt.add(lineTotal);
            blLigneRepository.save(ligne);
        }
        bl.setTotalHt(totalHt);
        BigDecimal tva = totalHt.multiply(bl.getTvaRate()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        bl.setTotalTtc(totalHt.add(tva));
        return blRepository.save(bl);
    }

    @Transactional
    public BonLivraison confirm(UUID id) {
        BonLivraison bl = findById(id);
        if (!"DRAFT".equals(bl.getStatus())) {
            throw new IllegalStateException("Only DRAFT BLs can be confirmed");
        }
        bl.setStatus("CONFIRMED");
        bl = blRepository.save(bl);

        List<BLLigne> lignes = blLigneRepository.findByBlId(id);
        for (BLLigne ligne : lignes) {
            if (ligne.getStockItem() != null) {
                StockItem item = ligne.getStockItem();
                int qty = ligne.getQuantity().intValue();
                item.setQuantityInStock(item.getQuantityInStock() - qty);
                stockItemRepository.save(item);

                StockMouvement mv = new StockMouvement();
                mv.setStockItem(item);
                mv.setType("SORTIE");
                mv.setQuantity(qty);
                mv.setReferenceType("BL");
                mv.setReferenceId(id);
                mv.setDateMouvement(LocalDate.now());
                mv.setCreatedAt(Instant.now());
                stockMouvementRepository.save(mv);
            }
        }
        return bl;
    }

    public String getPdfContent(UUID id) {
        return "PDF generation placeholder for BL " + id;
    }
}
