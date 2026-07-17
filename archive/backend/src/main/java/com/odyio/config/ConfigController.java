package com.odyio.config;

import com.odyio.document.DocumentService;
import com.odyio.user.User;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;
    private final DocumentService documentService;

    @GetMapping
    public ResponseEntity<ClinicConfig> getConfig() { return ResponseEntity.ok(configService.getConfig()); }

    @PutMapping
    public ResponseEntity<ClinicConfig> updateConfig(@RequestBody ClinicConfig config) { return ResponseEntity.ok(configService.updateConfig(config)); }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() { return ResponseEntity.ok(configService.getUsers()); }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        User user = new User();
        user.setEmail(body.get("email"));
        user.setFullName(body.get("fullName"));
        user.setRole(com.odyio.user.Role.valueOf(body.get("role")));
        return ResponseEntity.ok(configService.createUser(user, body.get("password")));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable UUID id, @RequestBody User user) { return ResponseEntity.ok(configService.updateUser(id, user)); }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadLogo(@RequestParam MultipartFile file, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        String logoId = configService.uploadLogo(file, userId);
        return ResponseEntity.ok(Map.of("documentId", logoId));
    }
}
