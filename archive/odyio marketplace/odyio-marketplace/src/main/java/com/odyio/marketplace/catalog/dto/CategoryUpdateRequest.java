package com.odyio.marketplace.catalog.dto;

import com.odyio.marketplace.common.enums.ProductCategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CategoryUpdateRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @NotNull
    private ProductCategoryType type;

    private String description;

}
