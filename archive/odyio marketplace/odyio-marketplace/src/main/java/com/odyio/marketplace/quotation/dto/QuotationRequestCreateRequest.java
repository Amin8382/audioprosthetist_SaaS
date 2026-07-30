package com.odyio.marketplace.quotation.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
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
public class QuotationRequestCreateRequest {

    @NotNull
    private UUID clinicId;

    @NotNull
    private UUID supplierId;

    private String clinicNotes;

    private LocalDate requestedDeliveryDate;

    @Valid
    @NotEmpty
    private List<QuotationRequestLineCreateRequest> lines;

}
