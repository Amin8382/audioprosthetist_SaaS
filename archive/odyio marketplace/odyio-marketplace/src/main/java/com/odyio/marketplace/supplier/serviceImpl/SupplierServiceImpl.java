package com.odyio.marketplace.supplier.serviceImpl;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.supplier.dto.SupplierCreateRequest;
import com.odyio.marketplace.supplier.dto.SupplierResponse;
import com.odyio.marketplace.supplier.dto.SupplierUpdateRequest;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import com.odyio.marketplace.supplier.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;

    @Override
    public SupplierResponse create(SupplierCreateRequest request) {
        validateEmailIsUnique(request.getEmail());

        Supplier supplier = Supplier.builder()
                .companyName(request.getCompanyName())
                .contactName(request.getContactName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .website(request.getWebsite())
                .logoPath(request.getLogoPath())
                .build();

        return mapToResponse(supplierRepository.save(supplier));
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierResponse getById(UUID id) {
        return mapToResponse(findSupplier(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierResponse> getAll() {
        return supplierRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public SupplierResponse update(UUID id, SupplierUpdateRequest request) {
        Supplier supplier = findSupplier(id);
        if (!Objects.equals(supplier.getEmail(), request.getEmail())) {
            validateEmailIsUnique(request.getEmail());
        }

        supplier.setCompanyName(request.getCompanyName());
        supplier.setContactName(request.getContactName());
        supplier.setPhone(request.getPhone());
        supplier.setEmail(request.getEmail());
        supplier.setAddress(request.getAddress());
        supplier.setWebsite(request.getWebsite());
        supplier.setLogoPath(request.getLogoPath());

        return mapToResponse(supplierRepository.save(supplier));
    }

    @Override
    public SupplierResponse deactivate(UUID id) {
        Supplier supplier = findSupplier(id);
        supplier.setActive(false);
        return mapToResponse(supplierRepository.save(supplier));
    }

    private Supplier findSupplier(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
    }

    private void validateEmailIsUnique(String email) {
        if (StringUtils.hasText(email) && supplierRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Supplier already exists with email: " + email);
        }
    }

    private SupplierResponse mapToResponse(Supplier supplier) {
        return SupplierResponse.builder()
                .id(supplier.getId())
                .companyName(supplier.getCompanyName())
                .contactName(supplier.getContactName())
                .phone(supplier.getPhone())
                .email(supplier.getEmail())
                .address(supplier.getAddress())
                .website(supplier.getWebsite())
                .logoPath(supplier.getLogoPath())
                .active(supplier.isActive())
                .verified(supplier.isVerified())
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }

}
