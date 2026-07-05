package com.audiosoin.client;

import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public ResponseEntity<Page<Client>> findAll(@RequestParam(required = false) String search, Pageable pageable) {
        return ResponseEntity.ok(clientService.findAll(search, pageable));
    }

    @PostMapping
    public ResponseEntity<Client> create(@RequestBody Client client) {
        return ResponseEntity.ok(clientService.create(client));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(clientService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> update(@PathVariable UUID id, @RequestBody Client client) {
        return ResponseEntity.ok(clientService.update(id, client));
    }

    @GetMapping("/{id}/historique")
    public ResponseEntity<Map<String, Object>> getHistorique(@PathVariable UUID id) {
        return ResponseEntity.ok(clientService.getHistorique(id));
    }
}
