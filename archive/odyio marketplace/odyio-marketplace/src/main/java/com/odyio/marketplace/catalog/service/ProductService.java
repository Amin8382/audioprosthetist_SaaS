package com.odyio.marketplace.catalog.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.catalog.dto.ProductCreateRequest;
import com.odyio.marketplace.catalog.dto.ProductResponse;
import com.odyio.marketplace.catalog.dto.ProductUpdateRequest;
import com.odyio.marketplace.common.enums.EarSide;

public interface ProductService {

    ProductResponse create(ProductCreateRequest request);

    ProductResponse getById(UUID id);

    List<ProductResponse> getAll();

    List<ProductResponse> search(
            String search,
            UUID supplierId,
            UUID categoryId,
            EarSide earSide,
            Boolean available,
            Boolean active
    );

    List<ProductResponse> getBySupplier(
            UUID supplierId,
            String search,
            UUID categoryId,
            EarSide earSide,
            Boolean available,
            Boolean active
    );

    ProductResponse update(UUID id, ProductUpdateRequest request);

    ProductResponse deactivate(UUID id);

}
