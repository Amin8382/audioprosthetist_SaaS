package com.odyio.marketplace.catalog.repository;

import java.util.UUID;

import com.odyio.marketplace.catalog.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, UUID> {

    boolean existsByName(String name);

}
