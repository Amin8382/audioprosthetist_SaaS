package com.odyio.marketplace.catalog.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.odyio.marketplace.catalog.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findByProductId(UUID productId);

    Optional<ProductImage> findByIdAndProductId(UUID id, UUID productId);

    void deleteByProductId(UUID productId);

}
