package com.odyio.marketplace.order.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
public class OrderResponse {

    private UUID id;
    private String orderNumber;
    private OrderStatus status;
    private OrderActorSummaryResponse clinic;
    private OrderActorSummaryResponse supplier;
    private UUID quotationRequestId;
    private UUID supplierOfferId;
    private String currency;
    private BigDecimal subtotal;
    private BigDecimal total;
    private Integer deliveryDelayDays;
    private LocalDate validUntil;
    private String supplierNotes;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
    private List<OrderLineResponse> lines;

}
