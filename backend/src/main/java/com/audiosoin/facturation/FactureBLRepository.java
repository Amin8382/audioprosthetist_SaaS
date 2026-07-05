package com.audiosoin.facturation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface FactureBLRepository extends JpaRepository<FactureBL, FactureBL.FactureBLId> {
}
