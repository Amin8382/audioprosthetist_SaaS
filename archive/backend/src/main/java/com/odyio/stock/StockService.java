package com.odyio.stock;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final StockMouvementRepository stockMouvementRepository;

    public List<StockItem> findAll() { return stockItemRepository.findAll(); }

    public StockItem findById(UUID id) {
        return stockItemRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Stock item not found"));
    }

    @Transactional
    public StockItem create(StockItem item) {
        item.setCreatedAt(Instant.now());
        return stockItemRepository.save(item);
    }

    @Transactional
    public StockItem update(UUID id, StockItem update) {
        StockItem item = findById(id);
        if (update.getFullName() != null) item.setFullName(update.getFullName());
        if (update.getCategory() != null) item.setCategory(update.getCategory());
        if (update.getUnitPriceHt() != null) item.setUnitPriceHt(update.getUnitPriceHt());
        if (update.getQuantityMinimum() != 0) item.setQuantityMinimum(update.getQuantityMinimum());
        if (update.getEarSide() != null) item.setEarSide(update.getEarSide());
        if (update.getNotes() != null) item.setNotes(update.getNotes());
        return stockItemRepository.save(item);
    }

    public List<StockMouvement> getMouvements(UUID stockItemId) {
        return stockMouvementRepository.findByStockItemIdOrderByDateMouvementDesc(stockItemId);
    }

    public List<StockItem> getAlertes() {
        return stockItemRepository.findLowStockItems();
    }
}
