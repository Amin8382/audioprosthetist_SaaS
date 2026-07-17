package com.odyio.vente;

import com.odyio.stock.StockItem;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bl_lignes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BLLigne {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "bl_id")
    private BonLivraison bl;
    @ManyToOne @JoinColumn(name = "stock_item_id")
    private StockItem stockItem;
    @Column(columnDefinition = "TEXT")
    private String description;
    private BigDecimal quantity;
    @Column(name = "unit_price_ht")
    private BigDecimal unitPriceHt;
    @Column(name = "tva_rate")
    private BigDecimal tvaRate;
    @Column(name = "ear_side")
    private String earSide;
}
