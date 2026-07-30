package com.odyio.marketplace.quotation.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.QuotationRequestStatus;
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
public class QuotationRequestResponse {

    private UUID id;
    private UUID clinicId;
    private String clinicName;
    private UUID supplierId;
    private String supplierName;
    private QuotationRequestStatus status;
    private String clinicNotes;
    private LocalDate requestedDeliveryDate;
    private LocalDateTime sentAt;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuotationRequestLineResponse> lines;

}
