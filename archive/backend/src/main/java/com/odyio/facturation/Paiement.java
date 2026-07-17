package com.odyio.facturation;

import com.odyio.user.User;
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
@Table(name = "paiements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Paiement {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "facture_id")
    private Facture facture;
    private BigDecimal montant;
    @Column(name = "mode_paiement")
    private String modePaiement;
    private String reference;
    @Column(name = "date_paiement")
    private LocalDate datePaiement;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @ManyToOne @JoinColumn(name = "created_by")
    private User createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
