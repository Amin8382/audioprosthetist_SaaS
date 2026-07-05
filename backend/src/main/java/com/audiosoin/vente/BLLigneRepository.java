package com.audiosoin.vente;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BLLigneRepository extends JpaRepository<BLLigne, UUID> {
    List<BLLigne> findByBlId(UUID blId);
}
