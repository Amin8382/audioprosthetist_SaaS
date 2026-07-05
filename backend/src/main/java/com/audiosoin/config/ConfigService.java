package com.audiosoin.config;

import com.audiosoin.user.User;
import com.audiosoin.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConfigService {

    private final ClinicConfigRepository configRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ClinicConfig getConfig() {
        return configRepository.findFirstByOrderById()
                .orElseGet(() -> configRepository.save(new ClinicConfig()));
    }

    @Transactional
    public ClinicConfig updateConfig(ClinicConfig update) {
        ClinicConfig config = getConfig();
        if (update.getClinicName() != null) config.setClinicName(update.getClinicName());
        if (update.getAddress() != null) config.setAddress(update.getAddress());
        if (update.getPhone() != null) config.setPhone(update.getPhone());
        if (update.getEmail() != null) config.setEmail(update.getEmail());
        if (update.getLogoPath() != null) config.setLogoPath(update.getLogoPath());
        if (update.getTvaNumber() != null) config.setTvaNumber(update.getTvaNumber());
        if (update.getFacturePrefix() != null) config.setFacturePrefix(update.getFacturePrefix());
        if (update.getBlPrefix() != null) config.setBlPrefix(update.getBlPrefix());
        if (update.getBcPrefix() != null) config.setBcPrefix(update.getBcPrefix());
        if (update.getCnamPrefix() != null) config.setCnamPrefix(update.getCnamPrefix());
        config.setUpdatedAt(Instant.now());
        return configRepository.save(config);
    }

    public List<User> getUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User createUser(User user, String password) {
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(UUID id, User update) {
        User user = userRepository.findById(id).orElseThrow();
        if (update.getFullName() != null) user.setFullName(update.getFullName());
        if (update.getEmail() != null) user.setEmail(update.getEmail());
        if (update.getRole() != null) user.setRole(update.getRole());
        if (update.isActive() != user.isActive()) user.setActive(update.isActive());
        return userRepository.save(user);
    }
}
