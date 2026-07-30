package com.odyio.marketplace.quotation.dto;

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
public class QuotationRequestLineResponse {

    private UUID id;
    private UUID productId;
    private String productName;
    private String productReference;
    private Integer quantity;
    private String lineNotes;

}
