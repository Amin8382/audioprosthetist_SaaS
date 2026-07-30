package com.odyio.marketplace.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI marketplaceOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Odyio Marketplace API")
                        .description("API du Marketplace B2B Odyio pour les cliniques d'audioprothèse et les fournisseurs.")
                        .version("v1.0"));
    }

}
