package com.audiosoin.tresorerie;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tresorerie")
@RequiredArgsConstructor
public class TresorerieController {

    private final TresorerieService tresorerieService;

    @GetMapping
    public ResponseEntity<List<TresorerieMouvement>> findAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(tresorerieService.findAll(start, end));
    }

    @PostMapping
    public ResponseEntity<TresorerieMouvement> create(@RequestBody TresorerieMouvement mouvement, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(tresorerieService.create(mouvement, userId));
    }

    @GetMapping("/bilan")
    public ResponseEntity<Map<String, Object>> getBilan(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(tresorerieService.getBilan(start, end));
    }

    @GetMapping("/bordereau")
    public ResponseEntity<List<TresorerieMouvement>> getBordereau(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(tresorerieService.getBordereau(start, end));
    }
}
