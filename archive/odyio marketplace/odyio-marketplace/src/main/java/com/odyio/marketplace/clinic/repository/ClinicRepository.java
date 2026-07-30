package com.odyio.marketplace.clinic.repository;

import java.util.UUID;

import com.odyio.marketplace.clinic.entity.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicRepository extends JpaRepository<Clinic, UUID> {

    boolean existsByEmail(String email);

}
