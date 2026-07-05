package com.audiosoin.stock;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "stock_mouvements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StockMouvement {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "stock_item_id")
    private StockItem stockItem;
    private String type;
    private int quantity;
    @Column(name = "reference_type")
    private String referenceType;
    @Column(name = "reference_id")
    private UUID referenceId;
    @Column(name = "date_mouvement")
    private LocalDate dateMouvement;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "created_by")
    private UUID createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
