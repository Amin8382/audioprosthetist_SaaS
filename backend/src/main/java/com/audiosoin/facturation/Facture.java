package com.audiosoin.facturation;

import com.audiosoin.client.Client;
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
@Table(name = "factures")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Facture {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String numero;
    @ManyToOne @JoinColumn(name = "client_id")
    private Client client;
    @Column(name = "date_facture")
    private LocalDate dateFacture;
    @Column(name = "date_echeance")
    private LocalDate dateEcheance;
    private String status;
    @Column(name = "total_ht")
    private BigDecimal totalHt;
    @Column(name = "tva_rate")
    private BigDecimal tvaRate;
    @Column(name = "montant_tva")
    private BigDecimal montantTva;
    @Column(name = "total_ttc")
    private BigDecimal totalTtc;
    @Column(name = "montant_paye")
    private BigDecimal montantPaye;
    @Column(name = "reste_a_payer")
    private BigDecimal resteAPayer;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "last_edited_at")
    private Instant lastEditedAt;
    @ManyToOne @JoinColumn(name = "last_edited_by")
    private User lastEditedBy;
    @ManyToOne @JoinColumn(name = "created_by")
    private User createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
