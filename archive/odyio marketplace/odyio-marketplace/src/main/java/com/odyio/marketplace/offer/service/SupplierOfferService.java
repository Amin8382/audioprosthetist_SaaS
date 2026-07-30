package com.odyio.marketplace.offer.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.offer.dto.RejectSupplierOfferRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferCreateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferSummaryResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferUpdateRequest;

public interface SupplierOfferService {

    SupplierOfferResponse createDraft(SupplierOfferCreateRequest request);

    SupplierOfferResponse updateDraft(UUID offerId, SupplierOfferUpdateRequest request);

    SupplierOfferResponse submit(UUID offerId);

    SupplierOfferResponse withdraw(UUID offerId);

    SupplierOfferResponse acceptOffer(UUID offerId, UUID clinicId);

    SupplierOfferResponse rejectOffer(UUID offerId, UUID clinicId, RejectSupplierOfferRequest request);

    SupplierOfferResponse getById(UUID offerId);

    SupplierOfferResponse getByQuotationRequest(UUID quotationRequestId);

    List<SupplierOfferSummaryResponse> getBySupplier(UUID supplierId, SupplierOfferStatus status);

}
