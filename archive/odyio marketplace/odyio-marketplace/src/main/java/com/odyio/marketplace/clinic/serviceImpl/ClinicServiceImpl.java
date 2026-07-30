package com.odyio.marketplace.clinic.serviceImpl;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import com.odyio.marketplace.clinic.dto.ClinicCreateRequest;
import com.odyio.marketplace.clinic.dto.ClinicResponse;
import com.odyio.marketplace.clinic.dto.ClinicUpdateRequest;
import com.odyio.marketplace.clinic.entity.Clinic;
import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.clinic.service.ClinicService;
import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class ClinicServiceImpl implements ClinicService {

    private final ClinicRepository clinicRepository;

    @Override
    public ClinicResponse create(ClinicCreateRequest request) {
        validateEmailIsUnique(request.getEmail());

        Clinic clinic = Clinic.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .taxNumber(request.getTaxNumber())
                .build();

        return mapToResponse(clinicRepository.save(clinic));
    }

    @Override
    @Transactional(readOnly = true)
    public ClinicResponse getById(UUID id) {
        return mapToResponse(findClinic(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClinicResponse> getAll() {
        return clinicRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public ClinicResponse update(UUID id, ClinicUpdateRequest request) {
        Clinic clinic = findClinic(id);
        if (!Objects.equals(clinic.getEmail(), request.getEmail())) {
            validateEmailIsUnique(request.getEmail());
        }

        clinic.setName(request.getName());
        clinic.setPhone(request.getPhone());
        clinic.setEmail(request.getEmail());
        clinic.setAddress(request.getAddress());
        clinic.setTaxNumber(request.getTaxNumber());

        return mapToResponse(clinicRepository.save(clinic));
    }

    @Override
    public ClinicResponse deactivate(UUID id) {
        Clinic clinic = findClinic(id);
        clinic.setActive(false);
        return mapToResponse(clinicRepository.save(clinic));
    }

    private Clinic findClinic(UUID id) {
        return clinicRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Clinic not found with id: " + id));
    }

    private void validateEmailIsUnique(String email) {
        if (StringUtils.hasText(email) && clinicRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Clinic already exists with email: " + email);
        }
    }

    private ClinicResponse mapToResponse(Clinic clinic) {
        return ClinicResponse.builder()
                .id(clinic.getId())
                .name(clinic.getName())
                .phone(clinic.getPhone())
                .email(clinic.getEmail())
                .address(clinic.getAddress())
                .taxNumber(clinic.getTaxNumber())
                .active(clinic.isActive())
                .createdAt(clinic.getCreatedAt())
                .updatedAt(clinic.getUpdatedAt())
                .build();
    }

}
