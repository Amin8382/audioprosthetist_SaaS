package com.odyio.marketplace.catalog.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.catalog.dto.CategoryCreateRequest;
import com.odyio.marketplace.catalog.dto.CategoryResponse;
import com.odyio.marketplace.catalog.dto.CategoryUpdateRequest;

public interface ProductCategoryService {

    CategoryResponse create(CategoryCreateRequest request);

    CategoryResponse getById(UUID id);

    List<CategoryResponse> getAll();

    CategoryResponse update(UUID id, CategoryUpdateRequest request);

    CategoryResponse deactivate(UUID id);

}
