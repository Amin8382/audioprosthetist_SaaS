package com.odyio.marketplace.catalog.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
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
public class ProductImageUpdateRequest {

    @Size(max = 255)
    private String altText;

    @Min(0)
    private Integer displayOrder;

    private Boolean primary;

}
