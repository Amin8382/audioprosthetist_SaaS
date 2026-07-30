package com.odyio.marketplace.quotation.service;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierQuotationWorkflowStatus;
import com.odyio.marketplace.quotation.dto.QuotationRequestCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestResponse;
import com.odyio.marketplace.quotation.dto.QuotationRequestSummaryResponse;

public interface QuotationRequestService {

    QuotationRequestResponse createDraft(QuotationRequestCreateRequest request);

    QuotationRequestResponse send(UUID requestId);

    QuotationRequestResponse getById(UUID requestId);

    List<QuotationRequestSummaryResponse> getAll();

    List<QuotationRequestSummaryResponse> getByClinic(UUID clinicId, QuotationRequestStatus status);

    List<QuotationRequestSummaryResponse> getBySupplier(UUID supplierId, QuotationRequestStatus status);

    List<QuotationRequestSummaryResponse> getBySupplier(
            UUID supplierId,
            QuotationRequestStatus status,
            SupplierQuotationWorkflowStatus workflowStatus
    );

    QuotationRequestResponse getBySupplierAndId(UUID supplierId, UUID requestId);

    QuotationRequestResponse cancel(UUID requestId);

}
