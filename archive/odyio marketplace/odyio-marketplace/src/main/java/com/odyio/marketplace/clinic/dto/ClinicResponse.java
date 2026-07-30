package com.odyio.marketplace.clinic.dto;

import java.time.LocalDateTime;
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
public class ClinicResponse {

    private UUID id;
    private String name;
    private String phone;
    private String email;
    private String address;
    private String taxNumber;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
