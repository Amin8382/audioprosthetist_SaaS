package com.odyio.marketplace.catalog.serviceImpl;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import com.odyio.marketplace.catalog.dto.CategoryCreateRequest;
import com.odyio.marketplace.catalog.dto.CategoryResponse;
import com.odyio.marketplace.catalog.dto.CategoryUpdateRequest;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.service.ProductCategoryService;
import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductCategoryServiceImpl implements ProductCategoryService {

    private final ProductCategoryRepository productCategoryRepository;

    @Override
    public CategoryResponse create(CategoryCreateRequest request) {
        validateNameIsUnique(request.getName());

        ProductCategory category = ProductCategory.builder()
                .name(request.getName())
                .type(request.getType())
                .description(request.getDescription())
                .build();

        return mapToResponse(productCategoryRepository.save(category));
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getById(UUID id) {
        return mapToResponse(findCategory(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        return productCategoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public CategoryResponse update(UUID id, CategoryUpdateRequest request) {
        ProductCategory category = findCategory(id);
        if (!Objects.equals(category.getName(), request.getName())) {
            validateNameIsUnique(request.getName());
        }

        category.setName(request.getName());
        category.setType(request.getType());
        category.setDescription(request.getDescription());

        return mapToResponse(productCategoryRepository.save(category));
    }

    @Override
    public CategoryResponse deactivate(UUID id) {
        ProductCategory category = findCategory(id);
        category.setActive(false);
        return mapToResponse(productCategoryRepository.save(category));
    }

    private ProductCategory findCategory(UUID id) {
        return productCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product category not found with id: " + id));
    }

    private void validateNameIsUnique(String name) {
        if (productCategoryRepository.existsByName(name)) {
            throw new DuplicateResourceException("Product category already exists with name: " + name);
        }
    }

    private CategoryResponse mapToResponse(ProductCategory category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .type(category.getType())
                .description(category.getDescription())
                .active(category.isActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

}
