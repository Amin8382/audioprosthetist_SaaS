package com.odyio.marketplace.catalog.serviceImpl;

import java.util.List;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

import com.odyio.marketplace.catalog.dto.ProductCreateRequest;
import com.odyio.marketplace.catalog.dto.ProductImageRequest;
import com.odyio.marketplace.catalog.dto.ProductImageResponse;
import com.odyio.marketplace.catalog.dto.ProductResponse;
import com.odyio.marketplace.catalog.dto.ProductUpdateRequest;
import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.entity.ProductImage;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.repository.ProductImageRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.catalog.service.ProductService;
import com.odyio.marketplace.catalog.specification.ProductSpecifications;
import com.odyio.marketplace.common.config.MarketplaceStorageProperties;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProductServiceImpl.class);
    private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9._-]+$");

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductImageMapper productImageMapper;
    private final MarketplaceStorageProperties storageProperties;

    @Override
    public ProductResponse create(ProductCreateRequest request) {
        Supplier supplier = findSupplier(request.getSupplierId());
        ProductCategory category = findCategory(request.getCategoryId());

        Product product = Product.builder()
                .supplier(supplier)
                .category(category)
                .name(request.getName())
                .brand(request.getBrand())
                .model(request.getModel())
                .reference(request.getReference())
                .description(request.getDescription())
                .technicalSpecs(request.getTechnicalSpecs())
                .earSide(request.getEarSide())
                .available(request.getAvailable() == null || request.getAvailable())
                .build();

        Product savedProduct = productRepository.save(product);
        replaceImagesIfProvided(savedProduct, request.getImages());
        return mapToResponse(savedProduct);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getById(UUID id) {
        return mapToResponse(findProduct(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getAll() {
        return search(null, null, null, null, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> search(
            String search,
            UUID supplierId,
            UUID categoryId,
            EarSide earSide,
            Boolean available,
            Boolean active
    ) {
        return productRepository.findAll(
                        ProductSpecifications.withFilters(search, supplierId, categoryId, earSide, available, active),
                        Sort.by(Sort.Direction.DESC, "createdAt")
                ).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getBySupplier(
            UUID supplierId,
            String search,
            UUID categoryId,
            EarSide earSide,
            Boolean available,
            Boolean active
    ) {
        findSupplier(supplierId);
        return search(search, supplierId, categoryId, earSide, available, active);
    }

    @Override
    public ProductResponse update(UUID id, ProductUpdateRequest request) {
        Product product = findProduct(id);
        Supplier supplier = findSupplier(request.getSupplierId());
        ProductCategory category = findCategory(request.getCategoryId());

        product.setSupplier(supplier);
        product.setCategory(category);
        product.setName(request.getName());
        product.setBrand(request.getBrand());
        product.setModel(request.getModel());
        product.setReference(request.getReference());
        product.setDescription(request.getDescription());
        product.setTechnicalSpecs(request.getTechnicalSpecs());
        product.setEarSide(request.getEarSide());
        product.setAvailable(request.getAvailable() == null || request.getAvailable());

        Product savedProduct = productRepository.save(product);
        replaceImagesIfProvided(savedProduct, request.getImages());
        return mapToResponse(savedProduct);
    }

    @Override
    public ProductResponse deactivate(UUID id) {
        Product product = findProduct(id);
        product.setActive(false);
        return mapToResponse(productRepository.save(product));
    }

    private Product findProduct(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private Supplier findSupplier(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
    }

    private ProductCategory findCategory(UUID id) {
        return productCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product category not found with id: " + id));
    }

    private ProductResponse mapToResponse(Product product) {
        List<ProductImageResponse> orderedImages = productImageMapper.toOrderedResponses(
                productImageRepository.findByProductId(product.getId())
        );

        return ProductResponse.builder()
                .id(product.getId())
                .supplierId(product.getSupplier().getId())
                .supplierName(product.getSupplier().getCompanyName())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .name(product.getName())
                .brand(product.getBrand())
                .model(product.getModel())
                .reference(product.getReference())
                .description(product.getDescription())
                .technicalSpecs(product.getTechnicalSpecs())
                .earSide(product.getEarSide())
                .available(product.isAvailable())
                .active(product.isActive())
                .primaryImage(orderedImages.stream().filter(ProductImageResponse::isPrimary).findFirst().orElse(null))
                .images(orderedImages)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private void replaceImagesIfProvided(Product product, List<ProductImageRequest> imageRequests) {
        if (imageRequests == null) {
            return;
        }
        validateImages(imageRequests);
        productImageRepository.findByProductId(product.getId())
                .forEach(image -> deleteLocalFileIfManaged(product.getId(), image.getImagePath()));
        productImageRepository.deleteByProductId(product.getId());
        imageRequests.stream()
                .map(imageRequest -> ProductImage.builder()
                        .product(product)
                        .imagePath(imageRequest.getImageUrl().trim())
                        .altText(normalizeOptionalText(imageRequest.getAltText()))
                        .displayOrder(imageRequest.getDisplayOrder() == null ? 0 : imageRequest.getDisplayOrder())
                        .mainImage(Boolean.TRUE.equals(imageRequest.getPrimary()))
                        .build())
                .forEach(productImageRepository::save);
    }

    private void validateImages(List<ProductImageRequest> imageRequests) {
        long primaryCount = imageRequests.stream()
                .filter(imageRequest -> Boolean.TRUE.equals(imageRequest.getPrimary()))
                .count();
        if (primaryCount > 1) {
            throw new BadRequestException("Un produit ne peut avoir qu'une seule image principale.");
        }
        imageRequests.forEach(imageRequest -> {
            if (imageRequest.getImageUrl() == null || imageRequest.getImageUrl().trim().isEmpty()) {
                throw new BadRequestException("L'URL de l'image est obligatoire.");
            }
            if (imageRequest.getDisplayOrder() != null && imageRequest.getDisplayOrder() < 0) {
                throw new BadRequestException("L'ordre d'affichage de l'image doit etre positif ou nul.");
            }
        });
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void deleteLocalFileIfManaged(UUID productId, String imagePath) {
        if (imagePath == null
                || imagePath.startsWith("http://")
                || imagePath.startsWith("https://")
                || imagePath.startsWith("/")
                || imagePath.contains("..")
                || !SAFE_FILENAME.matcher(imagePath).matches()) {
            return;
        }

        try {
            Path rootPath = Path.of(storageProperties.getProductImagesRoot()).toAbsolutePath().normalize();
            Path productDirectory = rootPath.resolve(productId.toString()).normalize();
            Path targetPath = productDirectory.resolve(imagePath).normalize();
            if (!targetPath.startsWith(productDirectory) || !productDirectory.startsWith(rootPath)) {
                LOGGER.warn("Skipped unsafe product image cleanup path {}", targetPath);
                return;
            }
            Files.deleteIfExists(targetPath);
        } catch (Exception exception) {
            LOGGER.warn("Unable to delete replaced product image file {}", imagePath, exception);
        }
    }

}
