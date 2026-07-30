package com.odyio.marketplace.offer.dto;

import java.math.BigDecimal;
import java.util.UUID;

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
public class SupplierOfferLineResponse {

    private UUID id;
    private UUID quotationRequestLineId;
    private UUID productId;
    private String productName;
    private String productReference;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineSubtotal;
    private String lineNotes;

}
