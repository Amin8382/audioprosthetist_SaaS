package com.odyio.marketplace.catalog.dto;

import java.util.UUID;
import java.util.List;

import com.odyio.marketplace.common.enums.EarSide;
import jakarta.validation.Valid;
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
public class ProductCreateRequest {

    @NotNull
    private UUID supplierId;

    @NotNull
    private UUID categoryId;

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 255)
    private String brand;

    @Size(max = 255)
    private String model;

    @Size(max = 100)
    private String reference;

    private String description;

    private String technicalSpecs;

    @NotNull
    private EarSide earSide;

    private Boolean available;

    private List<@Valid ProductImageRequest> images;

}
