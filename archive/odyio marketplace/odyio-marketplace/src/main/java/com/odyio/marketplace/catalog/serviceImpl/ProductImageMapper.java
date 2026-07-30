package com.odyio.marketplace.catalog.serviceImpl;

import java.util.Comparator;
import java.util.List;

import com.odyio.marketplace.catalog.dto.ProductImageResponse;
import com.odyio.marketplace.catalog.entity.ProductImage;
import com.odyio.marketplace.common.config.MarketplaceStorageProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProductImageMapper {

    private final MarketplaceStorageProperties storageProperties;

    public List<ProductImageResponse> toOrderedResponses(List<ProductImage> images) {
        return images.stream()
                .sorted(productImageComparator())
                .map(this::toResponse)
                .toList();
    }

    public ProductImageResponse toResponse(ProductImage image) {
        return ProductImageResponse.builder()
                .id(image.getId())
                .imageUrl(toImageUrl(image))
                .altText(image.getAltText())
                .displayOrder(image.getDisplayOrder())
                .primary(image.isMainImage())
                .build();
    }

    private String toImageUrl(ProductImage image) {
        String imagePath = image.getImagePath();
        if (imagePath == null || imagePath.startsWith("http://") || imagePath.startsWith("https://")
                || imagePath.startsWith("/")) {
            return imagePath;
        }

        return storageProperties.getProductImagesPublicPath()
                + "/"
                + image.getProduct().getId()
                + "/"
                + imagePath;
    }

    private Comparator<ProductImage> productImageComparator() {
        return Comparator.comparing(ProductImage::isMainImage).reversed()
                .thenComparing(image -> image.getDisplayOrder() == null ? 0 : image.getDisplayOrder())
                .thenComparing(ProductImage::getId);
    }

}
