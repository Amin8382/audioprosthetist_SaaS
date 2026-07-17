package com.odyio.vente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BonLivraisonRepository extends JpaRepository<BonLivraison, UUID> {
    Page<BonLivraison> findByClientIdOrderByCreatedAtDesc(UUID clientId, Pageable pageable);
    List<BonLivraison> findByClientIdAndStatus(UUID clientId, String status);
}
