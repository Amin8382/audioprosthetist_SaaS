package com.audiosoin.cnam;

import com.audiosoin.client.Client;
import com.audiosoin.facturation.Facture;
import com.audiosoin.vente.BonLivraison;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "cnam_demandes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CnamDemande {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String numero;
    @ManyToOne @JoinColumn(name = "client_id")
    private Client client;
    @ManyToOne @JoinColumn(name = "facture_id")
    private Facture facture;
    @ManyToOne @JoinColumn(name = "bl_id")
    private BonLivraison bl;
    private String status;
    @Column(name = "montant_demande")
    private BigDecimal montantDemande;
    @Column(name = "montant_approuve")
    private BigDecimal montantApprouve;
    @Column(name = "motif_rejet", columnDefinition = "TEXT")
    private String motifRejet;
    @Column(name = "success_probability")
    private Double successProbability;
    @Column(name = "shap_explanation")
    @JdbcTypeCode(SqlTypes.JSON)
    private String shapExplanation;
    @Column(name = "date_soumission")
    private LocalDate dateSoumission;
    @Column(name = "date_resolution")
    private LocalDate dateResolution;
    @Column(name = "created_at")
    private Instant createdAt;
}
