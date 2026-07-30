package com.odyio.marketplace.order.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.odyio.marketplace.common.enums.OrderStatus;
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
public class OrderSummaryResponse {

    private UUID id;
    private String orderNumber;
    private OrderStatus status;
    private OrderActorSummaryResponse clinic;
    private OrderActorSummaryResponse supplier;
    private BigDecimal total;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime cancelledAt;
    private UUID supplierOfferId;
    private UUID quotationRequestId;
    private int lineCount;
    private int totalQuantity;

}
