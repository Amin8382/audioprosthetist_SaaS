package com.odyio.marketplace.catalog.serviceImpl;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import com.odyio.marketplace.catalog.dto.ProductImageResponse;
import com.odyio.marketplace.catalog.dto.ProductImageUpdateRequest;
import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductImage;
import com.odyio.marketplace.catalog.repository.ProductImageRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.catalog.service.ProductImageService;
import com.odyio.marketplace.common.config.MarketplaceStorageProperties;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.FileStorageException;
import com.odyio.marketplace.common.exception.FileTooLargeException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductImageServiceImpl implements ProductImageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProductImageServiceImpl.class);
    private static final int MAX_DIMENSION = 1600;
    private static final float JPEG_QUALITY = 0.86f;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9._-]+$");

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductImageMapper productImageMapper;
    private final MarketplaceStorageProperties storageProperties;

    @Override
    public ProductImageResponse upload(
            UUID productId,
            MultipartFile file,
            String altText,
            Integer displayOrder,
            Boolean primary
    ) {
        Product product = findProduct(productId);
        validateFile(file);

        BufferedImage decodedImage = decodeImage(file);
        BufferedImage processedImage = resizeAndNormalize(decodedImage);
        String filename = "product-" + productId + "-" + UUID.randomUUID() + ".jpg";
        Path targetPath = resolveProductImagePath(productId, filename);

        writeJpeg(processedImage, targetPath);

        try {
            boolean firstImage = productImageRepository.findByProductId(productId).isEmpty();
            boolean primaryImage = firstImage || Boolean.TRUE.equals(primary);
            if (primaryImage) {
                clearPrimaryImages(productId);
            }

            ProductImage savedImage = productImageRepository.save(ProductImage.builder()
                    .product(product)
                    .imagePath(filename)
                    .altText(normalizeOptionalText(altText))
                    .displayOrder(displayOrder == null ? 0 : displayOrder)
                    .mainImage(primaryImage)
                    .build());

            return productImageMapper.toResponse(savedImage);
        } catch (RuntimeException exception) {
            deleteLocalFileIfExists(targetPath);
            throw exception;
        }
    }

    @Override
    public ProductImageResponse updateMetadata(UUID productId, UUID imageId, ProductImageUpdateRequest request) {
        findProduct(productId);
        ProductImage image = findProductImage(productId, imageId);

        image.setAltText(normalizeOptionalText(request.getAltText()));
        if (request.getDisplayOrder() != null) {
            image.setDisplayOrder(request.getDisplayOrder());
        }

        if (Boolean.TRUE.equals(request.getPrimary())) {
            clearPrimaryImages(productId);
            image.setMainImage(true);
        } else if (Boolean.FALSE.equals(request.getPrimary())) {
            image.setMainImage(false);
            promotePrimaryIfMissing(productId, imageId);
        }

        return productImageMapper.toResponse(productImageRepository.save(image));
    }

    @Override
    public void delete(UUID productId, UUID imageId) {
        findProduct(productId);
        ProductImage image = findProductImage(productId, imageId);
        String imagePath = image.getImagePath();
        boolean wasPrimary = image.isMainImage();

        productImageRepository.delete(image);
        productImageRepository.flush();

        if (isLocalStoredImage(imagePath)) {
            deleteLocalFile(resolveProductImagePath(productId, imagePath));
        }

        if (wasPrimary) {
            promotePrimaryIfMissing(productId, imageId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Resource load(UUID productId, String filename) {
        findProduct(productId);
        Path filePath = resolveProductImagePath(productId, filename);
        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            throw new ResourceNotFoundException("Image file not found.");
        }
        return new FileSystemResource(filePath);
    }

    private Product findProduct(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
    }

    private ProductImage findProductImage(UUID productId, UUID imageId) {
        return productImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product image not found with id: " + imageId));
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Le fichier image est obligatoire.");
        }
        if (file.getSize() > storageProperties.getMaxImageSizeBytes()) {
            throw new FileTooLargeException("Le fichier image depasse la taille maximale autorisee.");
        }
        if (file.getContentType() != null && !ALLOWED_CONTENT_TYPES.contains(file.getContentType().toLowerCase())) {
            throw new BadRequestException("Format d'image non supporte.");
        }
    }

    private BufferedImage decodeImage(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            try (ImageInputStream imageInputStream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (imageInputStream == null) {
                    throw new BadRequestException("Image invalide ou corrompue.");
                }

                var readers = ImageIO.getImageReaders(imageInputStream);
                if (!readers.hasNext()) {
                    throw new BadRequestException("Image invalide ou corrompue.");
                }

                ImageReader reader = readers.next();
                try {
                    reader.setInput(imageInputStream, true, true);
                    String formatName = reader.getFormatName();
                    if (!isAllowedDecodedFormat(formatName)) {
                        throw new BadRequestException("Format d'image non supporte.");
                    }

                    BufferedImage image = reader.read(0);
                    if (image == null) {
                        throw new BadRequestException("Image invalide ou corrompue.");
                    }
                    return image;
                } finally {
                    reader.dispose();
                }
            }
        } catch (BadRequestException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new BadRequestException("Image invalide ou corrompue.");
        }
    }

    private boolean isAllowedDecodedFormat(String formatName) {
        if (formatName == null) {
            return false;
        }
        String normalizedFormat = formatName.toLowerCase();
        return normalizedFormat.equals("jpeg")
                || normalizedFormat.equals("jpg")
                || normalizedFormat.equals("png")
                || normalizedFormat.equals("webp");
    }

    private BufferedImage resizeAndNormalize(BufferedImage image) {
        int sourceWidth = image.getWidth();
        int sourceHeight = image.getHeight();
        double scale = Math.min(1.0, Math.min((double) MAX_DIMENSION / sourceWidth, (double) MAX_DIMENSION / sourceHeight));
        int targetWidth = Math.max(1, (int) Math.round(sourceWidth * scale));
        int targetHeight = Math.max(1, (int) Math.round(sourceHeight * scale));

        BufferedImage target = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.setColor(java.awt.Color.WHITE);
            graphics.fillRect(0, 0, targetWidth, targetHeight);
            graphics.drawImage(image, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return target;
    }

    private void writeJpeg(BufferedImage image, Path targetPath) {
        try {
            Files.createDirectories(targetPath.getParent());
            ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (OutputStream outputStream = Files.newOutputStream(targetPath);
                 ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(outputStream)) {
                ImageWriteParam writeParam = writer.getDefaultWriteParam();
                writeParam.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                writeParam.setCompressionQuality(JPEG_QUALITY);
                writer.setOutput(imageOutputStream);
                writer.write(null, new IIOImage(image, null, null), writeParam);
            } finally {
                writer.dispose();
            }
        } catch (IOException exception) {
            throw new FileStorageException("Impossible d'enregistrer le fichier image.", exception);
        }
    }

    private void clearPrimaryImages(UUID productId) {
        productImageRepository.findByProductId(productId).forEach(image -> {
            image.setMainImage(false);
            productImageRepository.save(image);
        });
    }

    private void promotePrimaryIfMissing(UUID productId, UUID excludedImageId) {
        List<ProductImage> images = productImageRepository.findByProductId(productId).stream()
                .filter(image -> !image.getId().equals(excludedImageId))
                .sorted(productImageComparator())
                .toList();
        if (images.isEmpty() || images.stream().anyMatch(ProductImage::isMainImage)) {
            return;
        }

        ProductImage promotedImage = images.get(0);
        promotedImage.setMainImage(true);
        productImageRepository.save(promotedImage);
    }

    private Comparator<ProductImage> productImageComparator() {
        return Comparator.comparing(ProductImage::isMainImage).reversed()
                .thenComparing(image -> image.getDisplayOrder() == null ? 0 : image.getDisplayOrder())
                .thenComparing(ProductImage::getId);
    }

    private Path resolveProductImagePath(UUID productId, String filename) {
        if (filename == null || filename.isBlank() || filename.contains("..") || !SAFE_FILENAME.matcher(filename).matches()) {
            throw new BadRequestException("Nom de fichier image invalide.");
        }

        Path rootPath = Path.of(storageProperties.getProductImagesRoot()).toAbsolutePath().normalize();
        Path productDirectory = rootPath.resolve(productId.toString()).normalize();
        Path targetPath = productDirectory.resolve(filename).normalize();
        if (!targetPath.startsWith(productDirectory) || !productDirectory.startsWith(rootPath)) {
            throw new BadRequestException("Chemin de fichier image invalide.");
        }
        return targetPath;
    }

    private boolean isLocalStoredImage(String imagePath) {
        return imagePath != null
                && !imagePath.startsWith("http://")
                && !imagePath.startsWith("https://")
                && !imagePath.startsWith("/");
    }

    private void deleteLocalFile(Path filePath) {
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException exception) {
            LOGGER.warn("Unable to delete product image file {}", filePath, exception);
        }
    }

    private void deleteLocalFileIfExists(Path filePath) {
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException exception) {
            LOGGER.warn("Unable to clean up product image file {}", filePath, exception);
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

}
