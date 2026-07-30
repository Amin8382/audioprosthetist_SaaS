package com.odyio.marketplace.supplier.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class SupplierCreateRequest {

    @NotBlank
    @Size(max = 255)
    private String companyName;

    @Size(max = 255)
    private String contactName;

    @Size(max = 50)
    private String phone;

    @Email
    @Size(max = 255)
    private String email;

    private String address;

    @Size(max = 255)
    private String website;

    @Size(max = 500)
    private String logoPath;

}
