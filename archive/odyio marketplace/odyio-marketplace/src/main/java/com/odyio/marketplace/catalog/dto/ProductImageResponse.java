package com.odyio.marketplace.catalog.dto;

import java.util.UUID;

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
public class ProductImageResponse {

    private UUID id;
    private String imageUrl;
    private String altText;
    private Integer displayOrder;
    private boolean primary;

}
