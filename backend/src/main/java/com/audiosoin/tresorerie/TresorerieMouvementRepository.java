package com.audiosoin.tresorerie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TresorerieMouvementRepository extends JpaRepository<TresorerieMouvement, UUID> {
    List<TresorerieMouvement> findByDateMouvementBetweenOrderByDateMouvement(LocalDate start, LocalDate end);
    
    @Query("SELECT COALESCE(SUM(m.montant), 0) FROM TresorerieMouvement m WHERE m.type = :type AND m.dateMouvement BETWEEN :start AND :end")
    BigDecimal sumByTypeAndDateBetween(@Param("type") String type, @Param("start") LocalDate start, @Param("end") LocalDate end);
}
