package com.odyio.marketplace.catalog.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.EarSide;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductResponse {

    private UUID id;
    private UUID supplierId;
    private String supplierName;
    private UUID categoryId;
    private String categoryName;
    private String name;
    private String brand;
    private String model;
    private String reference;
    private String description;
    private String technicalSpecs;
    private EarSide earSide;
    private boolean available;
    private boolean active;
    private ProductImageResponse primaryImage;
    private List<ProductImageResponse> images;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
