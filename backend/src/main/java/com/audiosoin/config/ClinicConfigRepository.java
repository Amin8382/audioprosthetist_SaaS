package com.audiosoin.config;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ClinicConfigRepository extends JpaRepository<ClinicConfig, UUID> {
    Optional<ClinicConfig> findFirstByOrderById();
}
