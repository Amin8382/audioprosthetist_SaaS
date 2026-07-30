package com.odyio.marketplace.notification.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private String id;
    private String actorType;
    private String type;
    private String title;
    private String message;
    private LocalDateTime createdAt;
    private String targetUrl;
    private String entityType;
    private UUID entityId;

}
