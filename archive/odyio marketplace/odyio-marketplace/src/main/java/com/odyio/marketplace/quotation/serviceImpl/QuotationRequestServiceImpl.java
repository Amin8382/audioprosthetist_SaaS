package com.odyio.marketplace.quotation.serviceImpl;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.clinic.entity.Clinic;
import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.common.enums.SupplierQuotationWorkflowStatus;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.ForbiddenOperationException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.order.entity.Order;
import com.odyio.marketplace.order.repository.OrderRepository;
import com.odyio.marketplace.quotation.dto.QuotationActorSummaryResponse;
import com.odyio.marketplace.quotation.dto.QuotationRequestCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestLineCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestLineResponse;
import com.odyio.marketplace.quotation.dto.QuotationRequestResponse;
import com.odyio.marketplace.quotation.dto.QuotationRequestSummaryResponse;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
import com.odyio.marketplace.quotation.repository.QuotationRequestRepository;
import com.odyio.marketplace.quotation.service.QuotationRequestService;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class QuotationRequestServiceImpl implements QuotationRequestService {

    private static final int EXPIRATION_DAYS = 14;

    private final QuotationRequestRepository quotationRequestRepository;
    private final ClinicRepository clinicRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final SupplierOfferRepository supplierOfferRepository;
    private final OrderRepository orderRepository;

    @Override
    public QuotationRequestResponse createDraft(QuotationRequestCreateRequest request) {
        Clinic clinic = findActiveClinic(request.getClinicId());
        Supplier supplier = findActiveSupplier(request.getSupplierId());
        validateLinesArePresent(request.getLines());

        QuotationRequest quotationRequest = QuotationRequest.builder()
                .clinic(clinic)
                .supplier(supplier)
                .status(QuotationRequestStatus.DRAFT)
                .clinicNotes(request.getClinicNotes())
                .requestedDeliveryDate(request.getRequestedDeliveryDate())
                .build();

        Set<UUID> productIds = new HashSet<>();
        for (QuotationRequestLineCreateRequest lineRequest : request.getLines()) {
            validateQuantity(lineRequest.getQuantity());
            if (!productIds.add(lineRequest.getProductId())) {
                throw new BadRequestException("Product cannot appear more than once in a quotation request: "
                        + lineRequest.getProductId());
            }

            Product product = findValidProductForSupplier(lineRequest.getProductId(), supplier.getId());
            quotationRequest.addLine(QuotationRequestLine.builder()
                    .product(product)
                    .quantity(lineRequest.getQuantity())
                    .lineNotes(lineRequest.getLineNotes())
                    .build());
        }

        return mapToResponse(quotationRequestRepository.save(quotationRequest));
    }

    @Override
    public QuotationRequestResponse send(UUID requestId) {
        QuotationRequest quotationRequest = findQuotationRequest(requestId);
        if (quotationRequest.getStatus() != QuotationRequestStatus.DRAFT) {
            throw new BadRequestException("Only draft quotation requests can be sent.");
        }
        if (quotationRequest.getLines().isEmpty()) {
            throw new BadRequestException("Quotation request must contain at least one line before sending.");
        }

        UUID supplierId = quotationRequest.getSupplier().getId();
        quotationRequest.getLines().forEach(line ->
                validateProductForSupplier(line.getProduct(), supplierId)
        );

        LocalDateTime sentAt = LocalDateTime.now();
        quotationRequest.setStatus(QuotationRequestStatus.SENT);
        quotationRequest.setSentAt(sentAt);
        quotationRequest.setExpiresAt(sentAt.plusDays(EXPIRATION_DAYS));

        return mapToResponse(quotationRequestRepository.save(quotationRequest));
    }

    @Override
    @Transactional(readOnly = true)
    public QuotationRequestResponse getById(UUID requestId) {
        return mapToResponse(findQuotationRequest(requestId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuotationRequestSummaryResponse> getAll() {
        List<QuotationRequest> requests = quotationRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        return mapToSummaryResponses(requests);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuotationRequestSummaryResponse> getByClinic(UUID clinicId, QuotationRequestStatus status) {
        ensureClinicExists(clinicId);

        List<QuotationRequest> requests = status == null
                ? quotationRequestRepository.findByClinicIdOrderByCreatedAtDesc(clinicId)
                : quotationRequestRepository.findByClinicIdAndStatusOrderByCreatedAtDesc(clinicId, status);

        return mapToSummaryResponses(requests);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuotationRequestSummaryResponse> getBySupplier(UUID supplierId, QuotationRequestStatus status) {
        return getBySupplier(supplierId, status, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuotationRequestSummaryResponse> getBySupplier(
            UUID supplierId,
            QuotationRequestStatus status,
            SupplierQuotationWorkflowStatus workflowStatus
    ) {
        ensureSupplierExists(supplierId);

        if (status == QuotationRequestStatus.DRAFT) {
            return List.of();
        }

        List<QuotationRequest> requests;
        if (workflowStatus == null) {
            requests = status == null
                    ? quotationRequestRepository.findSupplierVisibleOrderByCreatedAtDesc(supplierId)
                    : quotationRequestRepository.findSupplierVisibleByStatusOrderByCreatedAtDesc(supplierId, status);
        } else if (workflowStatus == SupplierQuotationWorkflowStatus.TO_PROCESS) {
            requests = findSupplierRequestsToProcess(supplierId, status);
        } else if (workflowStatus == SupplierQuotationWorkflowStatus.ANSWERED) {
            requests = status == null
                    ? quotationRequestRepository.findSupplierVisibleWithOfferOrderByCreatedAtDesc(supplierId)
                    : quotationRequestRepository.findSupplierVisibleByStatusWithOfferOrderByCreatedAtDesc(supplierId, status);
        } else {
            requests = findSupplierCancelledRequests(supplierId, status);
        }

        return mapToSummaryResponses(requests);
    }

    @Override
    @Transactional(readOnly = true)
    public QuotationRequestResponse getBySupplierAndId(UUID supplierId, UUID requestId) {
        ensureSupplierExists(supplierId);
        QuotationRequest quotationRequest = findQuotationRequest(requestId);
        if (!quotationRequest.getSupplier().getId().equals(supplierId)) {
            throw new ForbiddenOperationException("Ce fournisseur ne peut pas consulter cette demande de devis.");
        }
        if (quotationRequest.getStatus() == QuotationRequestStatus.DRAFT) {
            throw new ForbiddenOperationException("Cette demande de devis n'est pas visible par le fournisseur.");
        }
        return mapToResponse(quotationRequest);
    }

    @Override
    public QuotationRequestResponse cancel(UUID requestId) {
        QuotationRequest quotationRequest = findQuotationRequest(requestId);
        if (quotationRequest.getStatus() == QuotationRequestStatus.CANCELLED
                || quotationRequest.getStatus() == QuotationRequestStatus.EXPIRED) {
            throw new BadRequestException("Quotation request cannot be cancelled from status: "
                    + quotationRequest.getStatus());
        }

        quotationRequest.setStatus(QuotationRequestStatus.CANCELLED);
        return mapToResponse(quotationRequestRepository.save(quotationRequest));
    }

    private Clinic findActiveClinic(UUID clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Clinic not found with id: " + clinicId));
        if (!clinic.isActive()) {
            throw new BadRequestException("Clinic is inactive: " + clinicId);
        }
        return clinic;
    }

    private Supplier findActiveSupplier(UUID supplierId) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + supplierId));
        if (!supplier.isActive()) {
            throw new BadRequestException("Supplier is inactive: " + supplierId);
        }
        return supplier;
    }

    private void ensureClinicExists(UUID clinicId) {
        if (!clinicRepository.existsById(clinicId)) {
            throw new ResourceNotFoundException("Clinic not found with id: " + clinicId);
        }
    }

    private void ensureSupplierExists(UUID supplierId) {
        if (!supplierRepository.existsById(supplierId)) {
            throw new ResourceNotFoundException("Supplier not found with id: " + supplierId);
        }
    }

    private Product findValidProductForSupplier(UUID productId, UUID supplierId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        validateProductForSupplier(product, supplierId);
        return product;
    }

    private QuotationRequest findQuotationRequest(UUID requestId) {
        return quotationRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation request not found with id: " + requestId));
    }

    private void validateLinesArePresent(List<QuotationRequestLineCreateRequest> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new BadRequestException("Quotation request must contain at least one line.");
        }
    }

    private void validateQuantity(Integer quantity) {
        if (quantity == null || quantity < 1) {
            throw new BadRequestException("Line quantity must be greater than or equal to 1.");
        }
    }

    private void validateProductForSupplier(Product product, UUID supplierId) {
        if (!product.isActive()) {
            throw new BadRequestException("Product is inactive: " + product.getId());
        }
        if (!product.isAvailable()) {
            throw new BadRequestException("Product is not available: " + product.getId());
        }
        if (!product.getSupplier().getId().equals(supplierId)) {
            throw new BadRequestException("Product does not belong to supplier: " + product.getId());
        }
    }

    private List<QuotationRequest> findSupplierRequestsToProcess(UUID supplierId, QuotationRequestStatus status) {
        if (status != null && status != QuotationRequestStatus.SENT) {
            throw new BadRequestException("Le filtre TO_PROCESS est compatible uniquement avec le statut SENT.");
        }
        return quotationRequestRepository.findSupplierSentWithoutOfferOrderByCreatedAtDesc(supplierId);
    }

    private List<QuotationRequest> findSupplierCancelledRequests(UUID supplierId, QuotationRequestStatus status) {
        if (status != null && status != QuotationRequestStatus.CANCELLED) {
            throw new BadRequestException("Le filtre CANCELLED est compatible uniquement avec le statut CANCELLED.");
        }
        return quotationRequestRepository.findBySupplierIdAndStatusAndSentAtIsNotNullOrderByUpdatedAtDesc(
                supplierId,
                QuotationRequestStatus.CANCELLED
        );
    }

    private List<QuotationRequestSummaryResponse> mapToSummaryResponses(List<QuotationRequest> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }
        Map<UUID, SupplierOffer> offersByRequestId = supplierOfferRepository.findByQuotationRequestIdIn(
                        requests.stream().map(QuotationRequest::getId).toList()
                ).stream()
                .collect(Collectors.toMap(offer -> offer.getQuotationRequest().getId(), Function.identity()));
        Map<UUID, Order> ordersByOfferId = findOrdersByOfferId(offersByRequestId.values().stream().toList());

        return requests.stream()
                .map(request -> {
                    SupplierOffer offer = offersByRequestId.get(request.getId());
                    Order order = offer == null ? null : ordersByOfferId.get(offer.getId());
                    return mapToSummaryResponse(request, offer, order);
                })
                .toList();
    }

    private Map<UUID, Order> findOrdersByOfferId(List<SupplierOffer> offers) {
        if (offers.isEmpty()) {
            return Map.of();
        }
        return orderRepository.findBySupplierOfferIdIn(offers.stream().map(SupplierOffer::getId).toList()).stream()
                .collect(Collectors.toMap(order -> order.getSupplierOffer().getId(), Function.identity()));
    }

    private QuotationRequestResponse mapToResponse(QuotationRequest quotationRequest) {
        return QuotationRequestResponse.builder()
                .id(quotationRequest.getId())
                .clinicId(quotationRequest.getClinic().getId())
                .clinicName(quotationRequest.getClinic().getName())
                .supplierId(quotationRequest.getSupplier().getId())
                .supplierName(quotationRequest.getSupplier().getCompanyName())
                .status(quotationRequest.getStatus())
                .clinicNotes(quotationRequest.getClinicNotes())
                .requestedDeliveryDate(quotationRequest.getRequestedDeliveryDate())
                .sentAt(quotationRequest.getSentAt())
                .expiresAt(quotationRequest.getExpiresAt())
                .createdAt(quotationRequest.getCreatedAt())
                .updatedAt(quotationRequest.getUpdatedAt())
                .lines(quotationRequest.getLines().stream()
                        .map(this::mapToLineResponse)
                        .toList())
                .build();
    }

    private QuotationRequestLineResponse mapToLineResponse(QuotationRequestLine line) {
        return QuotationRequestLineResponse.builder()
                .id(line.getId())
                .productId(line.getProduct().getId())
                .productName(line.getProduct().getName())
                .productReference(line.getProduct().getReference())
                .quantity(line.getQuantity())
                .lineNotes(line.getLineNotes())
                .build();
    }

    private QuotationRequestSummaryResponse mapToSummaryResponse(
            QuotationRequest quotationRequest,
            SupplierOffer supplierOffer,
            Order order
    ) {
        int totalRequestedQuantity = quotationRequest.getLines().stream()
                .map(QuotationRequestLine::getQuantity)
                .reduce(0, Integer::sum);

        return QuotationRequestSummaryResponse.builder()
                .id(quotationRequest.getId())
                .quotationRequestId(quotationRequest.getId())
                .clinicId(quotationRequest.getClinic().getId())
                .clinicName(quotationRequest.getClinic().getName())
                .clinic(QuotationActorSummaryResponse.builder()
                        .id(quotationRequest.getClinic().getId())
                        .name(quotationRequest.getClinic().getName())
                        .build())
                .supplierId(quotationRequest.getSupplier().getId())
                .supplierName(quotationRequest.getSupplier().getCompanyName())
                .supplier(QuotationActorSummaryResponse.builder()
                        .id(quotationRequest.getSupplier().getId())
                        .name(quotationRequest.getSupplier().getCompanyName())
                        .build())
                .status(quotationRequest.getStatus())
                .lineCount(quotationRequest.getLines().size())
                .totalRequestedQuantity(totalRequestedQuantity)
                .hasOffer(supplierOffer != null)
                .offerId(supplierOffer == null ? null : supplierOffer.getId())
                .offerStatus(supplierOffer == null ? null : supplierOffer.getStatus())
                .offerSubmittedAt(supplierOffer == null ? null : supplierOffer.getSubmittedAt())
                .offerDecisionAt(supplierOffer == null ? null : supplierOffer.getDecisionAt())
                .hasOrder(order != null)
                .orderId(order == null ? null : order.getId())
                .orderStatus(order == null ? null : order.getStatus())
                .orderNumber(order == null ? null : order.getOrderNumber())
                .requestedDeliveryDate(quotationRequest.getRequestedDeliveryDate())
                .sentAt(quotationRequest.getSentAt())
                .createdAt(quotationRequest.getCreatedAt())
                .build();
    }

}
