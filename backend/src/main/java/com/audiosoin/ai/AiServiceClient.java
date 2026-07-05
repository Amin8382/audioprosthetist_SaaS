package com.audiosoin.ai;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestTemplate restTemplate;

    @Value("${app.ai.service-url}")
    private String aiServiceUrl;

    public Map extractDocument(MultipartFile file) {
        return Map.of("source", "local_pipeline", "confidence", 0.0);
    }

    public Map predictClaim(Map<String, Object> features) {
        try {
            return restTemplate.postForObject(
                aiServiceUrl + "/ai/predict-claim",
                features,
                Map.class
            );
        } catch (Exception e) {
            return Map.of("success_probability", 0.5, "risk_factors", java.util.List.of());
        }
    }

    public Map predictNoshow(Map<String, Object> features) {
        try {
            return restTemplate.postForObject(
                aiServiceUrl + "/ai/predict-noshow",
                features,
                Map.class
            );
        } catch (Exception e) {
            return Map.of("noshow_probability", 0.0, "recommended_reminders", java.util.List.of());
        }
    }

    public Map detectAnomalies(Map<String, Object> claimsData) {
        try {
            return restTemplate.postForObject(
                aiServiceUrl + "/ai/detect-anomalies",
                claimsData,
                Map.class
            );
        } catch (Exception e) {
            return Map.of("flagged_claims", java.util.List.of());
        }
    }
}
