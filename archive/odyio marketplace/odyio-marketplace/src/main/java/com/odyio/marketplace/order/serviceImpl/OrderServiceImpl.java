package com.odyio.marketplace.order.serviceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.ConflictException;
import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ForbiddenOperationException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.entity.SupplierOfferLine;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.order.dto.CancelOrderRequest;
import com.odyio.marketplace.order.dto.OrderResponse;
import com.odyio.marketplace.order.dto.OrderSummaryResponse;
import com.odyio.marketplace.order.entity.Order;
import com.odyio.marketplace.order.entity.OrderLine;
import com.odyio.marketplace.order.repository.OrderRepository;
import com.odyio.marketplace.order.service.OrderService;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderServiceImpl implements OrderService {

    private static final String DEFAULT_CURRENCY = "TND";

    private final OrderRepository orderRepository;
    private final SupplierOfferRepository supplierOfferRepository;
    private final ClinicRepository clinicRepository;
    private final SupplierRepository supplierRepository;
    private final OrderMapper orderMapper;

    @Override
    public OrderResponse createFromOffer(UUID offerId, UUID clinicId) {
        SupplierOffer offer = findOffer(offerId);
        validateCreateOwnership(offer, clinicId);
        validateAcceptedOffer(offer);

        if (orderRepository.existsBySupplierOfferId(offerId)) {
            throw new DuplicateResourceException("An order already exists for supplier offer: " + offerId);
        }

        Order order = buildOrderSnapshot(offer);
        try {
            return orderMapper.toResponse(orderRepository.saveAndFlush(order));
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateResourceException("An order already exists for supplier offer: " + offerId);
        }
    }

    @Override
    public OrderResponse confirm(UUID orderId, UUID supplierId) {
        Order order = findOrder(orderId);
        if (!order.getSupplier().getId().equals(supplierId)) {
            throw new ForbiddenOperationException("Ce fournisseur ne peut pas confirmer cette commande.");
        }
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new ConflictException("Only CREATED orders can be confirmed.");
        }

        order.setStatus(OrderStatus.CONFIRMED);
        order.setConfirmedAt(LocalDateTime.now());
        return orderMapper.toResponse(orderRepository.save(order));
    }

    @Override
    public OrderResponse cancel(UUID orderId, UUID clinicId, CancelOrderRequest request) {
        Order order = findOrder(orderId);
        if (!order.getClinic().getId().equals(clinicId)) {
            throw new ForbiddenOperationException("Cette clinique ne peut pas annuler cette commande.");
        }
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new ConflictException("Only CREATED orders can be cancelled.");
        }

        String cancellationReason = normalizeCancellationReason(request);
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancellationReason(cancellationReason);
        return orderMapper.toResponse(orderRepository.save(order));
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> getByClinic(UUID clinicId, OrderStatus status) {
        ensureClinicExists(clinicId);
        List<Order> orders = status == null
                ? orderRepository.findByClinicIdOrderByCreatedAtDesc(clinicId)
                : orderRepository.findByClinicIdAndStatusOrderByCreatedAtDesc(clinicId, status);
        return orders.stream().map(orderMapper::toSummaryResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> getBySupplier(UUID supplierId, OrderStatus status) {
        ensureSupplierExists(supplierId);
        List<Order> orders = status == null
                ? orderRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId)
                : orderRepository.findBySupplierIdAndStatusOrderByCreatedAtDesc(supplierId, status);
        return orders.stream().map(orderMapper::toSummaryResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getByClinicAndId(UUID clinicId, UUID orderId) {
        ensureClinicExists(clinicId);
        return orderRepository.findByIdAndClinicId(orderId, clinicId)
                .map(orderMapper::toResponse)
                .orElseThrow(() -> new ForbiddenOperationException("Cette clinique ne peut pas consulter cette commande."));
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getBySupplierAndId(UUID supplierId, UUID orderId) {
        ensureSupplierExists(supplierId);
        return orderRepository.findByIdAndSupplierId(orderId, supplierId)
                .map(orderMapper::toResponse)
                .orElseThrow(() -> new ForbiddenOperationException("Ce fournisseur ne peut pas consulter cette commande."));
    }

    private SupplierOffer findOffer(UUID offerId) {
        return supplierOfferRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier offer not found with id: " + offerId));
    }

    private Order findOrder(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
    }

    private void validateCreateOwnership(SupplierOffer offer, UUID clinicId) {
        if (clinicId == null) {
            throw new BadRequestException("Clinic id is required.");
        }
        if (!offer.getQuotationRequest().getClinic().getId().equals(clinicId)) {
            throw new ForbiddenOperationException("Cette clinique ne peut pas creer une commande pour cette offre.");
        }
    }

    private void validateAcceptedOffer(SupplierOffer offer) {
        if (offer.getStatus() != SupplierOfferStatus.ACCEPTED) {
            throw new ConflictException("Order can only be created from an ACCEPTED supplier offer.");
        }
        if (offer.getValidUntil().isBefore(LocalDate.now())) {
            throw new ConflictException("Accepted offer is no longer valid.");
        }
        if (offer.getLines() == null || offer.getLines().isEmpty()) {
            throw new BadRequestException("Accepted offer must contain at least one line.");
        }
        if (!offer.getQuotationRequest().getSupplier().getId().equals(offer.getSupplier().getId())) {
            throw new BadRequestException("Offer supplier does not match quotation request supplier.");
        }
    }

    private Order buildOrderSnapshot(SupplierOffer offer) {
        QuotationRequest quotationRequest = offer.getQuotationRequest();
        List<SupplierOfferLine> sortedLines = offer.getLines().stream()
                .sorted(Comparator.comparing(line -> line.getQuotationRequestLine().getCreatedAt()))
                .toList();

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .clinic(quotationRequest.getClinic())
                .supplier(offer.getSupplier())
                .quotationRequest(quotationRequest)
                .supplierOffer(offer)
                .status(OrderStatus.CREATED)
                .currency(DEFAULT_CURRENCY)
                .subtotal(BigDecimal.ZERO)
                .total(BigDecimal.ZERO)
                .deliveryDelayDaysSnapshot(offer.getDeliveryDelayDays())
                .validUntilSnapshot(offer.getValidUntil())
                .supplierNotesSnapshot(offer.getSupplierNotes())
                .build();

        for (int index = 0; index < sortedLines.size(); index++) {
            SupplierOfferLine offerLine = sortedLines.get(index);
            OrderLine orderLine = buildOrderLineSnapshot(offerLine, index);
            order.addLine(orderLine);
        }

        BigDecimal subtotal = order.getLines().stream()
                .map(OrderLine::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        validateNonNegativeTotal(subtotal);
        order.setSubtotal(subtotal);
        order.setTotal(subtotal);
        return order;
    }

    private OrderLine buildOrderLineSnapshot(SupplierOfferLine offerLine, int displayOrder) {
        QuotationRequestLine requestLine = offerLine.getQuotationRequestLine();
        if (requestLine.getQuantity() == null || requestLine.getQuantity() < 1) {
            throw new BadRequestException("Order line quantity must be greater than 0.");
        }
        if (offerLine.getUnitPrice() == null || offerLine.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Order line unit price must be non-negative.");
        }

        BigDecimal lineTotal = offerLine.getUnitPrice().multiply(BigDecimal.valueOf(requestLine.getQuantity()));
        validateNonNegativeTotal(lineTotal);

        return OrderLine.builder()
                .productIdSnapshot(requestLine.getProduct().getId())
                .productNameSnapshot(requestLine.getProduct().getName())
                .productReferenceSnapshot(requestLine.getProduct().getReference())
                .productDescriptionSnapshot(requestLine.getProduct().getDescription())
                .quantity(requestLine.getQuantity())
                .unitPrice(offerLine.getUnitPrice())
                .lineTotal(lineTotal)
                .displayOrder(displayOrder)
                .build();
    }

    private void validateNonNegativeTotal(BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Order totals must be non-negative.");
        }
    }

    private String generateOrderNumber() {
        long sequenceValue = orderRepository.nextOrderNumberValue();
        return "CMD-" + LocalDate.now().getYear() + "-" + String.format("%06d", sequenceValue);
    }

    private String normalizeCancellationReason(CancelOrderRequest request) {
        if (request == null || request.getReason() == null) {
            return null;
        }
        String reason = request.getReason().trim();
        if (reason.isEmpty()) {
            throw new BadRequestException("Cancellation reason must not be blank when supplied.");
        }
        return reason;
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

}
