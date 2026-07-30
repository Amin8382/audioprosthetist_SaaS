package com.odyio.marketplace.supplier.repository;

import java.util.UUID;

import com.odyio.marketplace.supplier.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    boolean existsByEmail(String email);

}
