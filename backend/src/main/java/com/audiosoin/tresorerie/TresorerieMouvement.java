package com.audiosoin.tresorerie;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tresorerie_mouvements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class TresorerieMouvement {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "date_mouvement")
    private LocalDate dateMouvement;
    private String type;
    private String categorie;
    private BigDecimal montant;
    @Column(name = "mode_paiement")
    private String modePaiement;
    @Column(name = "reference_type")
    private String referenceType;
    @Column(name = "reference_id")
    private UUID referenceId;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "created_by")
    private UUID createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
