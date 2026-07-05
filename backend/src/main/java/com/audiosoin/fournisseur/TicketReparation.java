package com.audiosoin.fournisseur;

import com.audiosoin.client.Client;
import com.audiosoin.stock.StockItem;
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
@Table(name = "tickets_reparation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class TicketReparation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String numero;
    @ManyToOne @JoinColumn(name = "client_id")
    private Client client;
    @ManyToOne @JoinColumn(name = "fournisseur_id")
    private Fournisseur fournisseur;
    @ManyToOne @JoinColumn(name = "stock_item_id")
    private StockItem stockItem;
    @Column(name = "description_panne", columnDefinition = "TEXT")
    private String descriptionPanne;
    private String status;
    @Column(name = "date_envoi")
    private LocalDate dateEnvoi;
    @Column(name = "date_retour_prevue")
    private LocalDate dateRetourPrevue;
    @Column(name = "date_retour_reel")
    private LocalDate dateRetourReel;
    @Column(name = "cout_reparation")
    private BigDecimal coutReparation;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "created_at")
    private Instant createdAt;
}
