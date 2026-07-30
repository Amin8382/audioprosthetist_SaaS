package com.odyio.marketplace.supplier.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.supplier.dto.SupplierCreateRequest;
import com.odyio.marketplace.supplier.dto.SupplierResponse;
import com.odyio.marketplace.supplier.dto.SupplierUpdateRequest;

public interface SupplierService {

    SupplierResponse create(SupplierCreateRequest request);

    SupplierResponse getById(UUID id);

    List<SupplierResponse> getAll();

    SupplierResponse update(UUID id, SupplierUpdateRequest request);

    SupplierResponse deactivate(UUID id);

}
