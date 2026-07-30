package com.odyio.marketplace.catalog.serviceImpl;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.odyio.marketplace.catalog.dto.ProductResponse;
import com.odyio.marketplace.catalog.dto.ProductCreateRequest;
import com.odyio.marketplace.catalog.dto.ProductImageRequest;
import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.entity.ProductImage;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.repository.ProductImageRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.catalog.service.ProductService;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.enums.ProductCategoryType;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProductFilteringIntegrationTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductImageRepository productImageRepository;

    private Supplier supplierOne;
    private Supplier supplierTwo;
    private ProductCategory hearingAidCategory;
    private ProductCategory accessoryCategory;
    private Product phonakProduct;
    private Product oticonProduct;
    private Product inactiveProduct;

    @BeforeEach
    void setUp() {
        supplierOne = supplierRepository.save(Supplier.builder()
                .companyName("Supplier One")
                .email("supplier-one-filter@test.local")
                .active(true)
                .build());
        supplierTwo = supplierRepository.save(Supplier.builder()
                .companyName("Supplier Two")
                .email("supplier-two-filter@test.local")
                .active(true)
                .build());

        hearingAidCategory = productCategoryRepository.save(ProductCategory.builder()
                .name("Hearing Aid Filter Test")
                .type(ProductCategoryType.APPAREIL_AUDITIF)
                .active(true)
                .build());
        accessoryCategory = productCategoryRepository.save(ProductCategory.builder()
                .name("Accessory Filter Test")
                .type(ProductCategoryType.ACCESSOIRE)
                .active(true)
                .build());

        phonakProduct = productRepository.save(Product.builder()
                .supplier(supplierOne)
                .category(hearingAidCategory)
                .name("Phonak Lumity")
                .brand("Phonak")
                .model("L90")
                .reference("PH-L90")
                .earSide(EarSide.BILATERAL)
                .available(true)
                .active(true)
                .build());
        oticonProduct = productRepository.save(Product.builder()
                .supplier(supplierTwo)
                .category(accessoryCategory)
                .name("Oticon Charger")
                .brand("Oticon")
                .model("SmartCharger")
                .reference("OT-SC")
                .earSide(EarSide.NA)
                .available(false)
                .active(true)
                .build());
        inactiveProduct = productRepository.save(Product.builder()
                .supplier(supplierOne)
                .category(accessoryCategory)
                .name("Archived Accessory")
                .brand("ArchiveBrand")
                .model("Legacy")
                .reference("ARCH-1")
                .earSide(EarSide.LEFT)
                .available(true)
                .active(false)
                .build());

        productImageRepository.save(ProductImage.builder()
                .product(phonakProduct)
                .imagePath("https://images.test/phonak-gallery.jpg")
                .altText("Phonak gallery")
                .displayOrder(0)
                .mainImage(false)
                .build());
        productImageRepository.save(ProductImage.builder()
                .product(phonakProduct)
                .imagePath("https://images.test/phonak-primary.jpg")
                .altText("Phonak primary")
                .displayOrder(5)
                .mainImage(true)
                .build());
        productImageRepository.save(ProductImage.builder()
                .product(oticonProduct)
                .imagePath("https://images.test/oticon-primary.jpg")
                .altText("Oticon primary")
                .displayOrder(0)
                .mainImage(true)
                .build());

        productRepository.flush();
        productImageRepository.flush();
    }

    @Test
    void searchMatchesName() {
        List<ProductResponse> results = productService.search("lumity", null, null, null, null, null);

        assertThat(results).extracting(ProductResponse::getId).contains(phonakProduct.getId());
        assertThat(results).extracting(ProductResponse::getId).doesNotContain(oticonProduct.getId());
    }

    @Test
    void searchMatchesBrandModelAndReference() {
        assertThat(productService.search("oticon", null, null, null, null, null))
                .extracting(ProductResponse::getId)
                .contains(oticonProduct.getId());
        assertThat(productService.search("smartcharger", null, null, null, null, null))
                .extracting(ProductResponse::getId)
                .contains(oticonProduct.getId());
        assertThat(productService.search("ph-l90", null, null, null, null, null))
                .extracting(ProductResponse::getId)
                .contains(phonakProduct.getId());
    }

    @Test
    void supplierFilterWorks() {
        List<ProductResponse> results = productService.search(null, supplierOne.getId(), null, null, null, null);

        assertThat(results).extracting(ProductResponse::getId)
                .contains(phonakProduct.getId(), inactiveProduct.getId())
                .doesNotContain(oticonProduct.getId());
    }

    @Test
    void categoryFilterWorks() {
        List<ProductResponse> results = productService.search(null, null, accessoryCategory.getId(), null, null, null);

        assertThat(results).extracting(ProductResponse::getId)
                .contains(oticonProduct.getId(), inactiveProduct.getId())
                .doesNotContain(phonakProduct.getId());
    }

    @Test
    void earSideFilterWorks() {
        List<ProductResponse> results = productService.search(null, null, null, EarSide.BILATERAL, null, null);

        assertThat(results).extracting(ProductResponse::getId)
                .contains(phonakProduct.getId())
                .doesNotContain(oticonProduct.getId(), inactiveProduct.getId());
    }

    @Test
    void availableAndActiveFiltersWork() {
        assertThat(productService.search(null, null, null, null, false, null))
                .extracting(ProductResponse::getId)
                .contains(oticonProduct.getId())
                .doesNotContain(phonakProduct.getId());
        assertThat(productService.search(null, null, null, null, null, false))
                .extracting(ProductResponse::getId)
                .contains(inactiveProduct.getId())
                .doesNotContain(phonakProduct.getId());
    }

    @Test
    void combinedFiltersUseAndSemantics() {
        List<ProductResponse> results = productService.search(
                "phonak",
                supplierOne.getId(),
                hearingAidCategory.getId(),
                EarSide.BILATERAL,
                true,
                true
        );

        assertThat(results).extracting(ProductResponse::getId)
                .containsExactly(phonakProduct.getId());
    }

    @Test
    void supplierScopedListReturnsOnlySupplierProducts() {
        List<ProductResponse> results = productService.getBySupplier(
                supplierOne.getId(),
                null,
                null,
                null,
                null,
                null
        );

        assertThat(results).extracting(ProductResponse::getId)
                .contains(phonakProduct.getId(), inactiveProduct.getId())
                .doesNotContain(oticonProduct.getId());
    }

    @Test
    void productListExposesPrimaryImage() {
        List<ProductResponse> results = productService.search("lumity", null, null, null, null, null);

        ProductResponse response = results.stream()
                .filter(product -> product.getId().equals(phonakProduct.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(response.getPrimaryImage()).isNotNull();
        assertThat(response.getPrimaryImage().getImageUrl()).isEqualTo("https://images.test/phonak-primary.jpg");
        assertThat(response.getImages()).hasSize(2);
    }

    @Test
    void productDetailExposesOrderedImages() {
        ProductResponse response = productService.getById(phonakProduct.getId());

        assertThat(response.getImages())
                .extracting(image -> image.getImageUrl())
                .containsExactly("https://images.test/phonak-primary.jpg", "https://images.test/phonak-gallery.jpg");
    }

    @Test
    void atMostOneImageCanBePrimary() {
        ProductCreateRequest request = ProductCreateRequest.builder()
                .supplierId(supplierOne.getId())
                .categoryId(hearingAidCategory.getId())
                .name("Product With Duplicate Primary Images")
                .earSide(EarSide.NA)
                .images(List.of(
                        ProductImageRequest.builder()
                                .imageUrl("https://images.test/a.jpg")
                                .primary(true)
                                .displayOrder(0)
                                .build(),
                        ProductImageRequest.builder()
                                .imageUrl("https://images.test/b.jpg")
                                .primary(true)
                                .displayOrder(1)
                                .build()
                ))
                .build();

        assertThrows(BadRequestException.class, () -> productService.create(request));
    }

    @Test
    void invalidImageMetadataIsRejected() {
        ProductCreateRequest request = ProductCreateRequest.builder()
                .supplierId(supplierOne.getId())
                .categoryId(hearingAidCategory.getId())
                .name("Product With Invalid Image")
                .earSide(EarSide.NA)
                .images(List.of(ProductImageRequest.builder()
                        .imageUrl(" ")
                        .displayOrder(-1)
                        .build()))
                .build();

        assertThrows(BadRequestException.class, () -> productService.create(request));
    }

}
