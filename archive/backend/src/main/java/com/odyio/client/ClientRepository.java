package com.odyio.client;

import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    Optional<Client> findByCode(String code);
    Page<Client> findByFullNameContainingIgnoreCase(String search, Pageable pageable);
    Optional<Client> findByNoahPatientId(String noahPatientId);
    Optional<Client> findByFullNameAndDateOfBirth(String fullName, LocalDate dateOfBirth);
}
