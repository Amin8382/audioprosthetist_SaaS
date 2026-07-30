package com.odyio.marketplace.order.serviceImpl;

import java.util.Comparator;
import java.util.UUID;

import com.odyio.marketplace.order.dto.OrderActorSummaryResponse;
import com.odyio.marketplace.order.dto.OrderLineResponse;
import com.odyio.marketplace.order.dto.OrderResponse;
import com.odyio.marketplace.order.dto.OrderSummaryResponse;
import com.odyio.marketplace.order.entity.Order;
import com.odyio.marketplace.order.entity.OrderLine;
import org.springframework.stereotype.Component;

@Component
public class OrderMapper {

    public OrderResponse toResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .clinic(OrderActorSummaryResponse.builder()
                        .id(order.getClinic().getId())
                        .name(order.getClinic().getName())
                        .build())
                .supplier(OrderActorSummaryResponse.builder()
                        .id(order.getSupplier().getId())
                        .name(order.getSupplier().getCompanyName())
                        .build())
                .quotationRequestId(order.getQuotationRequest().getId())
                .supplierOfferId(order.getSupplierOffer().getId())
                .currency(order.getCurrency())
                .subtotal(order.getSubtotal())
                .total(order.getTotal())
                .deliveryDelayDays(order.getDeliveryDelayDaysSnapshot())
                .validUntil(order.getValidUntilSnapshot())
                .supplierNotes(order.getSupplierNotesSnapshot())
                .createdAt(order.getCreatedAt())
                .confirmedAt(order.getConfirmedAt())
                .cancelledAt(order.getCancelledAt())
                .cancellationReason(order.getCancellationReason())
                .lines(order.getLines().stream()
                        .sorted(orderLineComparator())
                        .map(this::toLineResponse)
                        .toList())
                .build();
    }

    public OrderSummaryResponse toSummaryResponse(Order order) {
        int totalQuantity = order.getLines().stream()
                .map(OrderLine::getQuantity)
                .reduce(0, Integer::sum);

        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .clinic(OrderActorSummaryResponse.builder()
                        .id(order.getClinic().getId())
                        .name(order.getClinic().getName())
                        .build())
                .supplier(OrderActorSummaryResponse.builder()
                        .id(order.getSupplier().getId())
                        .name(order.getSupplier().getCompanyName())
                        .build())
                .total(order.getTotal())
                .currency(order.getCurrency())
                .createdAt(order.getCreatedAt())
                .confirmedAt(order.getConfirmedAt())
                .cancelledAt(order.getCancelledAt())
                .supplierOfferId(order.getSupplierOffer().getId())
                .quotationRequestId(order.getQuotationRequest().getId())
                .lineCount(order.getLines().size())
                .totalQuantity(totalQuantity)
                .build();
    }

    private OrderLineResponse toLineResponse(OrderLine line) {
        return OrderLineResponse.builder()
                .id(line.getId())
                .productId(line.getProductIdSnapshot())
                .productName(line.getProductNameSnapshot())
                .productReference(line.getProductReferenceSnapshot())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .lineTotal(line.getLineTotal())
                .displayOrder(line.getDisplayOrder())
                .build();
    }

    private Comparator<OrderLine> orderLineComparator() {
        return Comparator.comparing(OrderLine::getDisplayOrder)
                .thenComparing(OrderLine::getId, Comparator.nullsLast(UUID::compareTo));
    }

}
