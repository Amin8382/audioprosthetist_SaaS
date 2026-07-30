package com.odyio.marketplace.catalog.service;

import java.util.UUID;

import com.odyio.marketplace.catalog.dto.ProductImageResponse;
import com.odyio.marketplace.catalog.dto.ProductImageUpdateRequest;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface ProductImageService {

    ProductImageResponse upload(
            UUID productId,
            MultipartFile file,
            String altText,
            Integer displayOrder,
            Boolean primary
    );

    ProductImageResponse updateMetadata(UUID productId, UUID imageId, ProductImageUpdateRequest request);

    void delete(UUID productId, UUID imageId);

    Resource load(UUID productId, String filename);

}
