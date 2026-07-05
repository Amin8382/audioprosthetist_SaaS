package com.audiosoin.vente;

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
@Table(name = "bons_livraison")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BonLivraison {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String numero;
    @ManyToOne @JoinColumn(name = "client_id")
    private Client client;
    @Column(name = "date_bl")
    private LocalDate dateBl;
    private String type;
    private String status;
    @Column(name = "total_ht")
    private BigDecimal totalHt;
    @Column(name = "tva_rate")
    private BigDecimal tvaRate;
    @Column(name = "total_ttc")
    private BigDecimal totalTtc;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @ManyToOne @JoinColumn(name = "created_by")
    private User createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
