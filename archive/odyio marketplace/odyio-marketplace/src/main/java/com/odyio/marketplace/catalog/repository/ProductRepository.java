package com.odyio.marketplace.catalog.repository;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.catalog.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    List<Product> findBySupplierId(UUID supplierId);

    List<Product> findByCategoryId(UUID categoryId);

    List<Product> findByActiveTrueAndAvailableTrue();

}
