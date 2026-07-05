package com.audiosoin.client;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    Optional<Client> findByCode(String code);
    Page<Client> findByFullNameContainingIgnoreCase(String search, Pageable pageable);
}
