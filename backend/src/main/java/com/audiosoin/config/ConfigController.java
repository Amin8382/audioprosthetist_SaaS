package com.audiosoin.config;

import com.audiosoin.user.User;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;

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
        user.setRole(com.audiosoin.user.Role.valueOf(body.get("role")));
        return ResponseEntity.ok(configService.createUser(user, body.get("password")));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable UUID id, @RequestBody User user) { return ResponseEntity.ok(configService.updateUser(id, user)); }
}
