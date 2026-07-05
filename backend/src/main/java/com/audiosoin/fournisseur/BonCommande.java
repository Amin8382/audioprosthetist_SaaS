package com.audiosoin.fournisseur;

import com.audiosoin.user.User;
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
@Table(name = "bons_commande")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BonCommande {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String numero;
    @ManyToOne @JoinColumn(name = "fournisseur_id")
    private Fournisseur fournisseur;
    @Column(name = "date_commande")
    private LocalDate dateCommande;
    @Column(name = "date_livraison_prevue")
    private LocalDate dateLivraisonPrevue;
    private String status;
    @Column(name = "total_ht")
    private BigDecimal totalHt;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @ManyToOne @JoinColumn(name = "created_by")
    private User createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
