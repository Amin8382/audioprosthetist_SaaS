package com.odyio.marketplace.offer.dto;

import jakarta.validation.constraints.Size;
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
public class RejectSupplierOfferRequest {

    @Size(max = 1000, message = "Rejection reason must not exceed 1000 characters.")
    private String reason;

}
