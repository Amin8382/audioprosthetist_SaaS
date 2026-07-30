package com.odyio.marketplace.offer.serviceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ForbiddenOperationException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.offer.dto.RejectSupplierOfferRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferCreateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferLineCreateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferLineResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferLineUpdateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferSummaryResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferUpdateRequest;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.entity.SupplierOfferLine;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.offer.service.SupplierOfferService;
import com.odyio.marketplace.order.entity.Order;
import com.odyio.marketplace.order.repository.OrderRepository;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
import com.odyio.marketplace.quotation.repository.QuotationRequestRepository;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class SupplierOfferServiceImpl implements SupplierOfferService {

    private final SupplierOfferRepository supplierOfferRepository;
    private final QuotationRequestRepository quotationRequestRepository;
    private final SupplierRepository supplierRepository;
    private final OrderRepository orderRepository;

    @Override
    public SupplierOfferResponse createDraft(SupplierOfferCreateRequest request) {
        QuotationRequest quotationRequest = findQuotationRequest(request.getQuotationRequestId());
        Supplier supplier = findActiveSupplier(request.getSupplierId());
        validateRequestCanReceiveOffer(quotationRequest, supplier.getId());

        if (supplierOfferRepository.existsByQuotationRequestId(quotationRequest.getId())) {
            throw new DuplicateResourceException("Supplier offer already exists for quotation request: "
                    + quotationRequest.getId());
        }

        validateOfferHeader(request.getDeliveryDelayDays(), request.getValidUntil());

        SupplierOffer supplierOffer = SupplierOffer.builder()
                .quotationRequest(quotationRequest)
                .supplier(supplier)
                .status(SupplierOfferStatus.DRAFT)
                .supplierNotes(request.getSupplierNotes())
                .deliveryDelayDays(request.getDeliveryDelayDays())
                .validUntil(request.getValidUntil())
                .build();

        createLinesFromRequest(quotationRequest, request.getLines()).forEach(supplierOffer::addLine);

        return mapToResponse(supplierOfferRepository.save(supplierOffer));
    }

    @Override
    public SupplierOfferResponse updateDraft(UUID offerId, SupplierOfferUpdateRequest request) {
        SupplierOffer supplierOffer = findSupplierOffer(offerId);
        if (supplierOffer.getStatus() != SupplierOfferStatus.DRAFT) {
            throw new BadRequestException("Only draft supplier offers can be updated.");
        }

        validateRequestCanReceiveOffer(supplierOffer.getQuotationRequest(), supplierOffer.getSupplier().getId());
        validateOfferHeader(request.getDeliveryDelayDays(), request.getValidUntil());

        supplierOffer.setSupplierNotes(request.getSupplierNotes());
        supplierOffer.setDeliveryDelayDays(request.getDeliveryDelayDays());
        supplierOffer.setValidUntil(request.getValidUntil());
        updateExistingLines(supplierOffer, request.getLines());

        return mapToResponse(supplierOfferRepository.save(supplierOffer));
    }

    @Override
    public SupplierOfferResponse submit(UUID offerId) {
        SupplierOffer supplierOffer = findSupplierOffer(offerId);
        if (supplierOffer.getStatus() != SupplierOfferStatus.DRAFT) {
            throw new BadRequestException("Only draft supplier offers can be submitted.");
        }

        validateRequestCanReceiveOffer(supplierOffer.getQuotationRequest(), supplierOffer.getSupplier().getId());
        validateOfferHeader(supplierOffer.getDeliveryDelayDays(), supplierOffer.getValidUntil());
        validateExistingOfferLines(supplierOffer);

        supplierOffer.setStatus(SupplierOfferStatus.SUBMITTED);
        supplierOffer.setSubmittedAt(LocalDateTime.now());
        supplierOffer.setDecisionAt(null);
        supplierOffer.setRejectionReason(null);

        return mapToResponse(supplierOfferRepository.save(supplierOffer));
    }

    @Override
    public SupplierOfferResponse withdraw(UUID offerId) {
        SupplierOffer supplierOffer = findSupplierOffer(offerId);
        validateSubmittedForDecisionOrWithdrawal(supplierOffer, "retiree");

        supplierOffer.setStatus(SupplierOfferStatus.WITHDRAWN);
        return mapToResponse(supplierOfferRepository.save(supplierOffer));
    }

    @Override
    public SupplierOfferResponse acceptOffer(UUID offerId, UUID clinicId) {
        SupplierOffer supplierOffer = findSupplierOffer(offerId);
        validateClinicOwnership(supplierOffer, clinicId);
        validateSubmittedForDecisionOrWithdrawal(supplierOffer, "acceptee");
        validateOfferStillValid(supplierOffer);

        supplierOffer.setStatus(SupplierOfferStatus.ACCEPTED);
        supplierOffer.setDecisionAt(LocalDateTime.now());
        supplierOffer.setRejectionReason(null);

        return mapToResponse(supplierOfferRepository.save(supplierOffer));
    }

    @Override
    public SupplierOfferResponse rejectOffer(UUID offerId, UUID clinicId, RejectSupplierOfferRequest request) {
        SupplierOffer supplierOffer = findSupplierOffer(offerId);
        validateClinicOwnership(supplierOffer, clinicId);
        validateSubmittedForDecisionOrWithdrawal(supplierOffer, "rejetee");
        validateOfferStillValid(supplierOffer);

        supplierOffer.setStatus(SupplierOfferStatus.REJECTED);
        supplierOffer.setDecisionAt(LocalDateTime.now());
        supplierOffer.setRejectionReason(normalizeRejectionReason(request));

        return mapToResponse(supplierOfferRepository.save(supplierOffer));
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierOfferResponse getById(UUID offerId) {
        return mapToResponse(findSupplierOffer(offerId));
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierOfferResponse getByQuotationRequest(UUID quotationRequestId) {
        return supplierOfferRepository.findByQuotationRequestId(quotationRequestId)
                .map(this::mapToResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Supplier offer not found for quotation request: " + quotationRequestId
                ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupplierOfferSummaryResponse> getBySupplier(UUID supplierId, SupplierOfferStatus status) {
        ensureSupplierExists(supplierId);

        List<SupplierOffer> offers = status == null
                ? supplierOfferRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId)
                : supplierOfferRepository.findBySupplierIdAndStatusOrderByCreatedAtDesc(supplierId, status);

        Map<UUID, Order> ordersByOfferId = findOrdersByOfferId(offers);
        return offers.stream()
                .map(offer -> mapToSummaryResponse(offer, ordersByOfferId.get(offer.getId())))
                .toList();
    }

    private QuotationRequest findQuotationRequest(UUID quotationRequestId) {
        return quotationRequestRepository.findById(quotationRequestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Quotation request not found with id: " + quotationRequestId
                ));
    }

    private SupplierOffer findSupplierOffer(UUID offerId) {
        return supplierOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier offer not found with id: " + offerId));
    }

    private Supplier findActiveSupplier(UUID supplierId) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + supplierId));
        if (!supplier.isActive()) {
            throw new BadRequestException("Supplier is inactive: " + supplierId);
        }
        return supplier;
    }

    private void ensureSupplierExists(UUID supplierId) {
        if (!supplierRepository.existsById(supplierId)) {
            throw new ResourceNotFoundException("Supplier not found with id: " + supplierId);
        }
    }

    private void validateRequestCanReceiveOffer(QuotationRequest quotationRequest, UUID supplierId) {
        if (quotationRequest.getStatus() != QuotationRequestStatus.SENT) {
            throw new BadRequestException("Supplier offer can only be created for sent quotation requests.");
        }
        if (!quotationRequest.getSupplier().getId().equals(supplierId)) {
            throw new BadRequestException("Supplier does not match quotation request supplier.");
        }
        if (quotationRequest.getLines().isEmpty()) {
            throw new BadRequestException("Quotation request must contain lines before creating an offer.");
        }
    }

    private void validateClinicOwnership(SupplierOffer supplierOffer, UUID clinicId) {
        if (clinicId == null) {
            throw new BadRequestException("L'identifiant de la clinique est obligatoire.");
        }
        UUID ownerClinicId = supplierOffer.getQuotationRequest().getClinic().getId();
        if (!ownerClinicId.equals(clinicId)) {
            throw new ForbiddenOperationException("Cette clinique ne peut pas traiter cette offre.");
        }
    }

    private void validateSubmittedForDecisionOrWithdrawal(SupplierOffer supplierOffer, String actionLabel) {
        if (supplierOffer.getStatus() == SupplierOfferStatus.DRAFT) {
            throw new BadRequestException("L'offre doit etre soumise avant de pouvoir etre " + actionLabel + ".");
        }
        if (supplierOffer.getStatus() != SupplierOfferStatus.SUBMITTED) {
            throw new DuplicateResourceException("Une decision a deja ete enregistree pour cette offre.");
        }
    }

    private void validateOfferStillValid(SupplierOffer supplierOffer) {
        if (supplierOffer.getValidUntil().isBefore(LocalDate.now())) {
            throw new BadRequestException("L'offre n'est plus valide.");
        }
    }

    private String normalizeRejectionReason(RejectSupplierOfferRequest request) {
        if (request == null || request.getReason() == null) {
            return null;
        }
        String reason = request.getReason().trim();
        if (reason.isEmpty()) {
            throw new BadRequestException("Le motif de rejet ne doit pas etre vide lorsqu'il est fourni.");
        }
        return reason;
    }

    private void validateOfferHeader(Integer deliveryDelayDays, LocalDate validUntil) {
        if (deliveryDelayDays == null || deliveryDelayDays < 0) {
            throw new BadRequestException("Delivery delay days must be greater than or equal to 0.");
        }
        if (validUntil == null || validUntil.isBefore(LocalDate.now())) {
            throw new BadRequestException("Offer validity date must not be before today.");
        }
    }

    private List<SupplierOfferLine> createLinesFromRequest(
            QuotationRequest quotationRequest,
            List<SupplierOfferLineCreateRequest> lineRequests
    ) {
        validateLineRequestsPresent(lineRequests);
        Map<UUID, QuotationRequestLine> requestLines = mapQuotationRequestLines(quotationRequest);
        Set<UUID> seenLineIds = new HashSet<>();

        List<SupplierOfferLine> lines = lineRequests.stream()
                .map(lineRequest -> {
                    validateUnitPrice(lineRequest.getUnitPrice());
                    QuotationRequestLine requestLine = resolveRequestLine(
                            requestLines,
                            seenLineIds,
                            lineRequest.getQuotationRequestLineId()
                    );
                    return SupplierOfferLine.builder()
                            .quotationRequestLine(requestLine)
                            .unitPrice(lineRequest.getUnitPrice())
                            .lineNotes(lineRequest.getLineNotes())
                            .build();
                })
                .toList();

        validateAllRequestLinesCovered(requestLines, seenLineIds);
        return lines;
    }

    private void updateExistingLines(
            SupplierOffer supplierOffer,
            List<SupplierOfferLineUpdateRequest> lineRequests
    ) {
        validateLineRequestsPresent(lineRequests);
        Map<UUID, QuotationRequestLine> requestLines = mapQuotationRequestLines(supplierOffer.getQuotationRequest());
        Set<UUID> seenLineIds = new HashSet<>();
        Map<UUID, SupplierOfferLine> existingLines = supplierOffer.getLines().stream()
                .collect(Collectors.toMap(line -> line.getQuotationRequestLine().getId(), Function.identity()));

        for (SupplierOfferLineUpdateRequest lineRequest : lineRequests) {
            validateUnitPrice(lineRequest.getUnitPrice());
            QuotationRequestLine requestLine = resolveRequestLine(
                    requestLines,
                    seenLineIds,
                    lineRequest.getQuotationRequestLineId()
            );
            SupplierOfferLine offerLine = existingLines.get(requestLine.getId());
            if (offerLine == null) {
                supplierOffer.addLine(SupplierOfferLine.builder()
                        .quotationRequestLine(requestLine)
                        .unitPrice(lineRequest.getUnitPrice())
                        .lineNotes(lineRequest.getLineNotes())
                        .build());
            } else {
                offerLine.setUnitPrice(lineRequest.getUnitPrice());
                offerLine.setLineNotes(lineRequest.getLineNotes());
            }
        }

        validateAllRequestLinesCovered(requestLines, seenLineIds);
    }

    private void validateExistingOfferLines(SupplierOffer supplierOffer) {
        Map<UUID, QuotationRequestLine> requestLines = mapQuotationRequestLines(supplierOffer.getQuotationRequest());
        Set<UUID> seenLineIds = new HashSet<>();

        supplierOffer.getLines().forEach(line -> {
            validateUnitPrice(line.getUnitPrice());
            UUID requestLineId = line.getQuotationRequestLine().getId();
            resolveRequestLine(requestLines, seenLineIds, requestLineId);
        });

        validateAllRequestLinesCovered(requestLines, seenLineIds);
    }

    private void validateLineRequestsPresent(List<?> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new BadRequestException("Supplier offer must contain one line for each quotation request line.");
        }
    }

    private Map<UUID, QuotationRequestLine> mapQuotationRequestLines(QuotationRequest quotationRequest) {
        return quotationRequest.getLines().stream()
                .collect(Collectors.toMap(QuotationRequestLine::getId, Function.identity()));
    }

    private QuotationRequestLine resolveRequestLine(
            Map<UUID, QuotationRequestLine> requestLines,
            Set<UUID> seenLineIds,
            UUID requestLineId
    ) {
        if (!requestLines.containsKey(requestLineId)) {
            throw new BadRequestException("Offer contains a line outside the quotation request: " + requestLineId);
        }
        if (!seenLineIds.add(requestLineId)) {
            throw new BadRequestException("Offer contains a duplicate quotation request line: " + requestLineId);
        }
        return requestLines.get(requestLineId);
    }

    private void validateAllRequestLinesCovered(
            Map<UUID, QuotationRequestLine> requestLines,
            Set<UUID> seenLineIds
    ) {
        if (seenLineIds.size() != requestLines.size()) {
            throw new BadRequestException("Offer must include exactly one line for every quotation request line.");
        }
    }

    private void validateUnitPrice(BigDecimal unitPrice) {
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Unit price must be greater than 0.");
        }
    }

    private SupplierOfferResponse mapToResponse(SupplierOffer supplierOffer) {
        List<SupplierOfferLineResponse> lines = supplierOffer.getLines().stream()
                .map(this::mapToLineResponse)
                .toList();
        Order order = orderRepository.findBySupplierOfferId(supplierOffer.getId()).orElse(null);

        return SupplierOfferResponse.builder()
                .id(supplierOffer.getId())
                .quotationRequestId(supplierOffer.getQuotationRequest().getId())
                .clinicId(supplierOffer.getQuotationRequest().getClinic().getId())
                .clinicName(supplierOffer.getQuotationRequest().getClinic().getName())
                .supplierId(supplierOffer.getSupplier().getId())
                .supplierName(supplierOffer.getSupplier().getCompanyName())
                .status(supplierOffer.getStatus())
                .supplierNotes(supplierOffer.getSupplierNotes())
                .deliveryDelayDays(supplierOffer.getDeliveryDelayDays())
                .validUntil(supplierOffer.getValidUntil())
                .submittedAt(supplierOffer.getSubmittedAt())
                .decisionAt(supplierOffer.getDecisionAt())
                .rejectionReason(supplierOffer.getRejectionReason())
                .createdAt(supplierOffer.getCreatedAt())
                .updatedAt(supplierOffer.getUpdatedAt())
                .totalAmount(calculateTotal(lines))
                .hasOrder(order != null)
                .orderId(order == null ? null : order.getId())
                .orderStatus(order == null ? null : order.getStatus())
                .orderNumber(order == null ? null : order.getOrderNumber())
                .lines(lines)
                .build();
    }

    private SupplierOfferLineResponse mapToLineResponse(SupplierOfferLine line) {
        QuotationRequestLine requestLine = line.getQuotationRequestLine();
        BigDecimal lineSubtotal = calculateLineSubtotal(line);

        return SupplierOfferLineResponse.builder()
                .id(line.getId())
                .quotationRequestLineId(requestLine.getId())
                .productId(requestLine.getProduct().getId())
                .productName(requestLine.getProduct().getName())
                .productReference(requestLine.getProduct().getReference())
                .quantity(requestLine.getQuantity())
                .unitPrice(line.getUnitPrice())
                .lineSubtotal(lineSubtotal)
                .lineNotes(line.getLineNotes())
                .build();
    }

    private SupplierOfferSummaryResponse mapToSummaryResponse(SupplierOffer supplierOffer, Order order) {
        return SupplierOfferSummaryResponse.builder()
                .id(supplierOffer.getId())
                .quotationRequestId(supplierOffer.getQuotationRequest().getId())
                .clinicId(supplierOffer.getQuotationRequest().getClinic().getId())
                .clinicName(supplierOffer.getQuotationRequest().getClinic().getName())
                .supplierId(supplierOffer.getSupplier().getId())
                .supplierName(supplierOffer.getSupplier().getCompanyName())
                .status(supplierOffer.getStatus())
                .totalAmount(calculateTotal(supplierOffer))
                .deliveryDelayDays(supplierOffer.getDeliveryDelayDays())
                .validUntil(supplierOffer.getValidUntil())
                .submittedAt(supplierOffer.getSubmittedAt())
                .decisionAt(supplierOffer.getDecisionAt())
                .rejectionReason(supplierOffer.getRejectionReason())
                .createdAt(supplierOffer.getCreatedAt())
                .hasOrder(order != null)
                .orderId(order == null ? null : order.getId())
                .orderStatus(order == null ? null : order.getStatus())
                .orderNumber(order == null ? null : order.getOrderNumber())
                .build();
    }

    private Map<UUID, Order> findOrdersByOfferId(List<SupplierOffer> offers) {
        if (offers.isEmpty()) {
            return Map.of();
        }
        return orderRepository.findBySupplierOfferIdIn(offers.stream().map(SupplierOffer::getId).toList()).stream()
                .collect(Collectors.toMap(order -> order.getSupplierOffer().getId(), Function.identity()));
    }

    private BigDecimal calculateLineSubtotal(SupplierOfferLine line) {
        return line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuotationRequestLine().getQuantity()));
    }

    private BigDecimal calculateTotal(SupplierOffer supplierOffer) {
        return supplierOffer.getLines().stream()
                .map(this::calculateLineSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotal(List<SupplierOfferLineResponse> lines) {
        return lines.stream()
                .map(SupplierOfferLineResponse::getLineSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

}
