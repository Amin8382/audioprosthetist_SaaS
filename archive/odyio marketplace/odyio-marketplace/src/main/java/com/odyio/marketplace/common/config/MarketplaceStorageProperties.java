package com.odyio.marketplace.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "marketplace.storage")
public class MarketplaceStorageProperties {

    private String productImagesRoot = "./storage/product-images";
    private String productImagesPublicPath = "/api/marketplace/files/products";
    private long maxImageSizeBytes = 5 * 1024 * 1024;

    public String getProductImagesRoot() {
        return productImagesRoot;
    }

    public void setProductImagesRoot(String productImagesRoot) {
        this.productImagesRoot = productImagesRoot;
    }

    public String getProductImagesPublicPath() {
        return productImagesPublicPath;
    }

    public void setProductImagesPublicPath(String productImagesPublicPath) {
        this.productImagesPublicPath = productImagesPublicPath;
    }

    public long getMaxImageSizeBytes() {
        return maxImageSizeBytes;
    }

    public void setMaxImageSizeBytes(long maxImageSizeBytes) {
        this.maxImageSizeBytes = maxImageSizeBytes;
    }

}
