package com.odyio.fournisseur;

import com.odyio.stock.StockItem;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bc_lignes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BCLigne {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "bc_id")
    private BonCommande bc;
    @ManyToOne @JoinColumn(name = "stock_item_id")
    private StockItem stockItem;
    @Column(columnDefinition = "TEXT")
    private String description;
    private int quantity;
    @Column(name = "unit_price_ht")
    private BigDecimal unitPriceHt;
    @Column(name = "catalogue_produit_id")
    private UUID catalogueProduitId;
}
