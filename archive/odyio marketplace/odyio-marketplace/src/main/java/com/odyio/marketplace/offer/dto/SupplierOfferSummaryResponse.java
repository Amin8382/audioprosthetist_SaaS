package com.odyio.marketplace.offer.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
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
public class SupplierOfferSummaryResponse {

    private UUID id;
    private UUID quotationRequestId;
    private UUID clinicId;
    private String clinicName;
    private UUID supplierId;
    private String supplierName;
    private SupplierOfferStatus status;
    private BigDecimal totalAmount;
    private Integer deliveryDelayDays;
    private LocalDate validUntil;
    private LocalDateTime submittedAt;
    private LocalDateTime decisionAt;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private boolean hasOrder;
    private UUID orderId;
    private OrderStatus orderStatus;
    private String orderNumber;

}
