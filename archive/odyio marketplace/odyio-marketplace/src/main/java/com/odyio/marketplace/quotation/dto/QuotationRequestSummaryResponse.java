package com.odyio.marketplace.quotation.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.common.enums.QuotationRequestStatus;
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
public class QuotationRequestSummaryResponse {

    private UUID id;
    private UUID quotationRequestId;
    private UUID clinicId;
    private String clinicName;
    private QuotationActorSummaryResponse clinic;
    private UUID supplierId;
    private String supplierName;
    private QuotationActorSummaryResponse supplier;
    private QuotationRequestStatus status;
    private int lineCount;
    private int totalRequestedQuantity;
    private boolean hasOffer;
    private UUID offerId;
    private SupplierOfferStatus offerStatus;
    private LocalDateTime offerSubmittedAt;
    private LocalDateTime offerDecisionAt;
    private boolean hasOrder;
    private UUID orderId;
    private OrderStatus orderStatus;
    private String orderNumber;
    private LocalDate requestedDeliveryDate;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;

}
