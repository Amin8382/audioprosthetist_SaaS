package com.audiosoin.fournisseur;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BCLigneRepository extends JpaRepository<BCLigne, UUID> {
    List<BCLigne> findByBcId(UUID bcId);
}
