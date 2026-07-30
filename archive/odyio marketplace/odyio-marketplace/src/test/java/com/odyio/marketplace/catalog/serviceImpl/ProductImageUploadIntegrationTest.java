package com.odyio.marketplace.catalog.serviceImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

import javax.imageio.ImageIO;

import com.odyio.marketplace.catalog.dto.ProductImageResponse;
import com.odyio.marketplace.catalog.dto.ProductImageUpdateRequest;
import com.odyio.marketplace.catalog.dto.ProductResponse;
import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.repository.ProductImageRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.catalog.service.ProductImageService;
import com.odyio.marketplace.catalog.service.ProductService;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.enums.ProductCategoryType;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.FileTooLargeException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProductImageUploadIntegrationTest {

    private static final Path TEST_STORAGE_ROOT = Path.of(
            System.getProperty("java.io.tmpdir"),
            "odyio-marketplace-product-image-tests-" + UUID.randomUUID()
    );

    @Autowired
    private ProductImageService productImageService;

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

    private Product product;
    private Product otherProduct;

    @DynamicPropertySource
    static void storageProperties(DynamicPropertyRegistry registry) {
        registry.add("marketplace.storage.product-images-root", () -> TEST_STORAGE_ROOT.toString());
        registry.add("marketplace.storage.max-image-size-bytes", () -> "5242880");
    }

    @BeforeEach
    void setUp() {
        Supplier supplier = supplierRepository.save(Supplier.builder()
                .companyName("Upload Supplier")
                .email("upload-supplier@test.local")
                .active(true)
                .build());
        ProductCategory category = productCategoryRepository.save(ProductCategory.builder()
                .name("Upload Category")
                .type(ProductCategoryType.APPAREIL_AUDITIF)
                .active(true)
                .build());
        product = productRepository.save(Product.builder()
                .supplier(supplier)
                .category(category)
                .name("Upload Product")
                .earSide(EarSide.NA)
                .active(true)
                .available(true)
                .build());
        otherProduct = productRepository.save(Product.builder()
                .supplier(supplier)
                .category(category)
                .name("Other Upload Product")
                .earSide(EarSide.NA)
                .active(true)
                .available(true)
                .build());
    }

    @AfterEach
    void cleanStorage() throws IOException {
        deleteRecursively(TEST_STORAGE_ROOT);
    }

    @AfterAll
    static void cleanStorageAfterAll() throws IOException {
        deleteRecursively(TEST_STORAGE_ROOT);
    }

    @Test
    void validJpegUploadStoresFileAndReturnsUsableUrl() throws IOException {
        ProductImageResponse response = productImageService.upload(
                product.getId(),
                imageFile("clinic-upload.jpg", "image/jpeg", "jpg"),
                "Produit upload",
                2,
                false
        );

        assertThat(response.getImageUrl())
                .startsWith("/api/marketplace/files/products/" + product.getId() + "/product-" + product.getId())
                .endsWith(".jpg");
        assertThat(response.getImageUrl()).doesNotContain("clinic-upload");
        assertThat(response.isPrimary()).isTrue();
        assertThat(storedFile(response)).exists().isRegularFile();
    }

    @Test
    void validPngUploadIsAcceptedAndNormalizedToJpeg() throws IOException {
        ProductImageResponse response = productImageService.upload(
                product.getId(),
                imageFile("transparent.png", "image/png", "png"),
                null,
                null,
                null
        );

        assertThat(response.getImageUrl()).endsWith(".jpg");
        assertThat(storedFile(response)).exists();
    }

    @Test
    void unsupportedFileIsRejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "not an image".getBytes()
        );

        assertThrows(BadRequestException.class, () ->
                productImageService.upload(product.getId(), file, null, null, null));
    }

    @Test
    void fakeImageWithImageContentTypeIsRejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "fake.png",
                "image/png",
                "not an image".getBytes()
        );

        assertThrows(BadRequestException.class, () ->
                productImageService.upload(product.getId(), file, null, null, null));
    }

    @Test
    void oversizedFileIsRejectedBeforeDecode() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "huge.jpg",
                "image/jpeg",
                new byte[5 * 1024 * 1024 + 1]
        );

        assertThrows(FileTooLargeException.class, () ->
                productImageService.upload(product.getId(), file, null, null, null));
    }

    @Test
    void settingAnotherPrimaryClearsOldPrimary() throws IOException {
        ProductImageResponse first = productImageService.upload(
                product.getId(),
                imageFile("first.jpg", "image/jpeg", "jpg"),
                null,
                0,
                null
        );
        ProductImageResponse second = productImageService.upload(
                product.getId(),
                imageFile("second.png", "image/png", "png"),
                null,
                1,
                false
        );

        ProductImageResponse updatedSecond = productImageService.updateMetadata(
                product.getId(),
                second.getId(),
                ProductImageUpdateRequest.builder().primary(true).build()
        );

        ProductResponse productResponse = productService.getById(product.getId());
        assertThat(updatedSecond.isPrimary()).isTrue();
        assertThat(productResponse.getPrimaryImage().getId()).isEqualTo(second.getId());
        assertThat(productResponse.getImages()).filteredOn(ProductImageResponse::isPrimary).hasSize(1);
        assertThat(productImageRepository.findById(first.getId()).orElseThrow().isMainImage()).isFalse();
    }

    @Test
    void deletingPrimaryPromotesNextOrderedImageAndRemovesFile() throws IOException {
        ProductImageResponse first = productImageService.upload(
                product.getId(),
                imageFile("first.jpg", "image/jpeg", "jpg"),
                null,
                0,
                null
        );
        ProductImageResponse second = productImageService.upload(
                product.getId(),
                imageFile("second.jpg", "image/jpeg", "jpg"),
                null,
                1,
                null
        );
        Path firstFile = storedFile(first);

        productImageService.delete(product.getId(), first.getId());

        ProductResponse productResponse = productService.getById(product.getId());
        assertThat(firstFile).doesNotExist();
        assertThat(productResponse.getPrimaryImage().getId()).isEqualTo(second.getId());
    }

    @Test
    void productMismatchCannotDeleteImage() throws IOException {
        ProductImageResponse image = productImageService.upload(
                product.getId(),
                imageFile("image.jpg", "image/jpeg", "jpg"),
                null,
                null,
                null
        );

        assertThrows(ResourceNotFoundException.class, () ->
                productImageService.delete(otherProduct.getId(), image.getId()));
    }

    @Test
    void pathTraversalAttemptsAreRejected() {
        assertThrows(BadRequestException.class, () ->
                productImageService.load(product.getId(), "../secret.jpg"));
    }

    @Test
    void testProfileUsesTemporaryStorage() throws IOException {
        ProductImageResponse response = productImageService.upload(
                product.getId(),
                imageFile("image.jpg", "image/jpeg", "jpg"),
                null,
                null,
                null
        );

        assertThat(storedFile(response).toAbsolutePath().normalize()).startsWith(TEST_STORAGE_ROOT);
    }

    @Test
    void productListAndDetailReturnPrimaryAndOrderedImages() throws IOException {
        productImageService.upload(product.getId(), imageFile("first.jpg", "image/jpeg", "jpg"), null, 5, null);
        ProductImageResponse second = productImageService.upload(
                product.getId(),
                imageFile("second.jpg", "image/jpeg", "jpg"),
                null,
                0,
                true
        );

        ProductResponse detail = productService.getById(product.getId());
        ProductResponse listed = productService.search("Upload Product", null, null, null, null, null).stream()
                .filter(result -> result.getId().equals(product.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(detail.getPrimaryImage().getId()).isEqualTo(second.getId());
        assertThat(detail.getImages()).extracting(ProductImageResponse::getId).startsWith(second.getId());
        assertThat(listed.getPrimaryImage().getId()).isEqualTo(second.getId());
    }

    private MockMultipartFile imageFile(String filename, String contentType, String format) throws IOException {
        BufferedImage image = new BufferedImage(24, 16, BufferedImage.TYPE_INT_RGB);
        image.createGraphics().setColor(Color.BLUE);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(image, format, outputStream);
        return new MockMultipartFile("file", filename, contentType, outputStream.toByteArray());
    }

    private Path storedFile(ProductImageResponse response) {
        String filename = response.getImageUrl().substring(response.getImageUrl().lastIndexOf('/') + 1);
        return TEST_STORAGE_ROOT.resolve(product.getId().toString()).resolve(filename);
    }

    private static void deleteRecursively(Path path) throws IOException {
        if (!Files.exists(path)) {
            return;
        }
        try (var paths = Files.walk(path)) {
            paths.sorted(Comparator.reverseOrder()).forEach(currentPath -> {
                try {
                    Files.deleteIfExists(currentPath);
                } catch (IOException exception) {
                    throw new IllegalStateException(exception);
                }
            });
        }
    }

}
