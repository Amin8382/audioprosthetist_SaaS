package com.odyio.marketplace.clinic.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.clinic.dto.ClinicCreateRequest;
import com.odyio.marketplace.clinic.dto.ClinicResponse;
import com.odyio.marketplace.clinic.dto.ClinicUpdateRequest;

public interface ClinicService {

    ClinicResponse create(ClinicCreateRequest request);

    ClinicResponse getById(UUID id);

    List<ClinicResponse> getAll();

    ClinicResponse update(UUID id, ClinicUpdateRequest request);

    ClinicResponse deactivate(UUID id);

}
