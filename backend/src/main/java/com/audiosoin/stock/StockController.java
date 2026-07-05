package com.audiosoin.stock;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping
    public ResponseEntity<List<StockItem>> findAll() { return ResponseEntity.ok(stockService.findAll()); }

    @PostMapping
    public ResponseEntity<StockItem> create(@RequestBody StockItem item) { return ResponseEntity.ok(stockService.create(item)); }

    @GetMapping("/{id}")
    public ResponseEntity<StockItem> findById(@PathVariable UUID id) { return ResponseEntity.ok(stockService.findById(id)); }

    @PutMapping("/{id}")
    public ResponseEntity<StockItem> update(@PathVariable UUID id, @RequestBody StockItem item) { return ResponseEntity.ok(stockService.update(id, item)); }

    @GetMapping("/{id}/mouvements")
    public ResponseEntity<List<StockMouvement>> getMouvements(@PathVariable UUID id) { return ResponseEntity.ok(stockService.getMouvements(id)); }

    @GetMapping("/alertes")
    public ResponseEntity<List<StockItem>> getAlertes() { return ResponseEntity.ok(stockService.getAlertes()); }
}
