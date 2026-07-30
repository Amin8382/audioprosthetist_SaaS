package com.odyio.marketplace.notification.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.notification.dto.NotificationResponse;

public interface NotificationService {

    List<NotificationResponse> getClinicNotifications(UUID clinicId, Integer limit, LocalDateTime since, String type);

    List<NotificationResponse> getSupplierNotifications(UUID supplierId, Integer limit, LocalDateTime since, String type);

}
