package com.odyio.marketplace.offer.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class SupplierOfferCreateRequest {

    @NotNull
    private UUID quotationRequestId;

    @NotNull
    private UUID supplierId;

    private String supplierNotes;

    @NotNull
    @Min(0)
    private Integer deliveryDelayDays;

    @NotNull
    private LocalDate validUntil;

    @Valid
    @NotEmpty
    private List<SupplierOfferLineCreateRequest> lines;

}
