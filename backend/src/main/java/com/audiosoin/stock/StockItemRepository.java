package com.audiosoin.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface StockItemRepository extends JpaRepository<StockItem, UUID> {
    @Query("SELECT s FROM StockItem s WHERE s.quantityInStock <= s.quantityMinimum")
    List<StockItem> findLowStockItems();
}
