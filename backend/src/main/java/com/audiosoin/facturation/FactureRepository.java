package com.audiosoin.facturation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface FactureRepository extends JpaRepository<Facture, UUID> {
    Page<Facture> findByClientIdOrderByCreatedAtDesc(UUID clientId, Pageable pageable);
}
