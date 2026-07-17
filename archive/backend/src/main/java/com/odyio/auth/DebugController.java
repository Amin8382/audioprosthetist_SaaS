package com.odyio.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @GetMapping("/auth")
    public ResponseEntity<Map<String, Object>> checkGetAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(Map.of(
            "authenticated", auth != null && auth.isAuthenticated(),
            "principal", auth != null ? String.valueOf(auth.getPrincipal()) : null,
            "authorities", auth != null ? auth.getAuthorities().toString() : null
        ));
    }

    @PostMapping("/auth")
    public ResponseEntity<Map<String, Object>> checkPostAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(Map.of(
            "authenticated", auth != null && auth.isAuthenticated(),
            "principal", auth != null ? String.valueOf(auth.getPrincipal()) : null,
            "authorities", auth != null ? auth.getAuthorities().toString() : null
        ));
    }
}
