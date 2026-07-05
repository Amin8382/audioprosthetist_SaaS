package com.audiosoin.tresorerie;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TresorerieService {

    private final TresorerieMouvementRepository tresorerieRepository;

    public List<TresorerieMouvement> findAll(LocalDate start, LocalDate end) {
        if (start != null && end != null) {
            return tresorerieRepository.findByDateMouvementBetweenOrderByDateMouvement(start, end);
        }
        return tresorerieRepository.findAll();
    }

    @Transactional
    public TresorerieMouvement create(TresorerieMouvement mouvement, UUID userId) {
        mouvement.setCreatedBy(userId);
        mouvement.setCreatedAt(java.time.Instant.now());
        return tresorerieRepository.save(mouvement);
    }

    public Map<String, Object> getBilan(LocalDate start, LocalDate end) {
        BigDecimal recettes = tresorerieRepository.sumByTypeAndDateBetween("RECETTE", start, end);
        BigDecimal depenses = tresorerieRepository.sumByTypeAndDateBetween("DEPENSE", start, end);
        Map<String, Object> bilan = new HashMap<>();
        bilan.put("recettes", recettes);
        bilan.put("depenses", depenses);
        bilan.put("solde", recettes.subtract(depenses));
        bilan.put("dateDebut", start);
        bilan.put("dateFin", end);
        return bilan;
    }

    public List<TresorerieMouvement> getBordereau(LocalDate start, LocalDate end) {
        return tresorerieRepository.findByDateMouvementBetweenOrderByDateMouvement(start, end);
    }
}
