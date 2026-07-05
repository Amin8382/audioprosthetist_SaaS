package com.audiosoin.facturation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PaiementRepository extends JpaRepository<Paiement, UUID> {
    List<Paiement> findByFactureId(UUID factureId);
}
