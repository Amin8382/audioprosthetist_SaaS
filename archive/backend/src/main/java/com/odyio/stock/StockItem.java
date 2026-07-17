package com.odyio.stock;

import com.odyio.fournisseur.Fournisseur;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stock_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StockItem {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String reference;
    @Column(name = "full_name")
    private String fullName;
    private String category;
    @ManyToOne @JoinColumn(name = "fournisseur_id")
    private Fournisseur fournisseur;
    @Column(name = "unit_price_ht")
    private BigDecimal unitPriceHt;
    @Column(name = "tva_rate")
    private BigDecimal tvaRate;
    @Column(name = "quantity_in_stock")
    private int quantityInStock;
    @Column(name = "quantity_minimum")
    private int quantityMinimum;
    @Column(name = "ear_side")
    private String earSide;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "created_at")
    private Instant createdAt;
}
