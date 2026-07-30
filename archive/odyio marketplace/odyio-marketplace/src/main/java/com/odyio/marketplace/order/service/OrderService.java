package com.odyio.marketplace.order.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.order.dto.CancelOrderRequest;
import com.odyio.marketplace.order.dto.OrderResponse;
import com.odyio.marketplace.order.dto.OrderSummaryResponse;

public interface OrderService {

    OrderResponse createFromOffer(UUID offerId, UUID clinicId);

    OrderResponse confirm(UUID orderId, UUID supplierId);

    OrderResponse cancel(UUID orderId, UUID clinicId, CancelOrderRequest request);

    List<OrderSummaryResponse> getByClinic(UUID clinicId, OrderStatus status);

    List<OrderSummaryResponse> getBySupplier(UUID supplierId, OrderStatus status);

    OrderResponse getByClinicAndId(UUID clinicId, UUID orderId);

    OrderResponse getBySupplierAndId(UUID supplierId, UUID orderId);

}
