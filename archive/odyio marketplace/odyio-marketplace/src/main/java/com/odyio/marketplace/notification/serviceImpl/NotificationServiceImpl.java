package com.odyio.marketplace.notification.serviceImpl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.notification.dto.NotificationResponse;
import com.odyio.marketplace.notification.service.NotificationService;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.order.entity.Order;
import com.odyio.marketplace.order.repository.OrderRepository;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.repository.QuotationRequestRepository;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final ClinicRepository clinicRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierOfferRepository supplierOfferRepository;
    private final QuotationRequestRepository quotationRequestRepository;
    private final OrderRepository orderRepository;

    @Override
    public List<NotificationResponse> getClinicNotifications(
            UUID clinicId,
            Integer limit,
            LocalDateTime since,
            String type
    ) {
        ensureClinicExists(clinicId);

        List<NotificationResponse> notifications = new ArrayList<>();
        supplierOfferRepository.findByQuotationRequestClinicIdOrderByUpdatedAtDesc(clinicId)
                .forEach(offer -> addClinicOfferNotifications(notifications, offer));
        orderRepository.findByClinicIdOrderByCreatedAtDesc(clinicId)
                .forEach(order -> addClinicOrderNotifications(notifications, order));

        return filterSortAndLimit(notifications, limit, since, type);
    }

    @Override
    public List<NotificationResponse> getSupplierNotifications(
            UUID supplierId,
            Integer limit,
            LocalDateTime since,
            String type
    ) {
        ensureSupplierExists(supplierId);

        List<NotificationResponse> notifications = new ArrayList<>();
        quotationRequestRepository.findSupplierSentWithoutOfferOrderByCreatedAtDesc(supplierId)
                .forEach(request -> notifications.add(newSupplierQuotationNotification(request)));
        quotationRequestRepository.findBySupplierIdAndStatusAndSentAtIsNotNullOrderByUpdatedAtDesc(
                supplierId,
                QuotationRequestStatus.CANCELLED
        ).forEach(request -> notifications.add(cancelledQuotationNotification(request)));
        supplierOfferRepository.findBySupplierIdAndStatusInOrderByUpdatedAtDesc(
                supplierId,
                List.of(SupplierOfferStatus.ACCEPTED, SupplierOfferStatus.REJECTED)
        ).forEach(offer -> addSupplierDecisionNotification(notifications, offer));
        orderRepository.findBySupplierIdOrderByCreatedAtDesc(supplierId)
                .forEach(order -> addSupplierOrderNotifications(notifications, order));

        return filterSortAndLimit(notifications, limit, since, type);
    }

    private void addClinicOfferNotifications(List<NotificationResponse> notifications, SupplierOffer offer) {
        if (offer.getSubmittedAt() != null && offer.getStatus() != SupplierOfferStatus.DRAFT) {
            notifications.add(NotificationResponse.builder()
                    .id("offer:" + offer.getId() + ":submitted")
                    .actorType("CLINIC")
                    .type("OFFER_SUBMITTED")
                    .title("Nouvelle offre recue")
                    .message(offer.getSupplier().getCompanyName() + " a soumis une offre pour la demande "
                            + offer.getQuotationRequest().getId() + ".")
                    .createdAt(offer.getSubmittedAt())
                    .targetUrl("/clinic/quotation-requests/" + offer.getQuotationRequest().getId())
                    .entityType("SUPPLIER_OFFER")
                    .entityId(offer.getId())
                    .build());
        }
        if (offer.getStatus() == SupplierOfferStatus.WITHDRAWN) {
            notifications.add(clinicOfferStatusNotification(offer, "withdrawn", "OFFER_WITHDRAWN", "Offre retiree"));
        }
        if (offer.getStatus() == SupplierOfferStatus.EXPIRED) {
            notifications.add(clinicOfferStatusNotification(offer, "expired", "OFFER_EXPIRED", "Offre expiree"));
        }
        if (offer.getStatus() == SupplierOfferStatus.ACCEPTED) {
            notifications.add(clinicOfferDecisionNotification(offer, "accepted", "OFFER_ACCEPTED", "Offre acceptee"));
        }
        if (offer.getStatus() == SupplierOfferStatus.REJECTED) {
            notifications.add(clinicOfferDecisionNotification(offer, "rejected", "OFFER_REJECTED", "Offre refusee"));
        }
    }

    private NotificationResponse clinicOfferStatusNotification(
            SupplierOffer offer,
            String idSuffix,
            String type,
            String title
    ) {
        return NotificationResponse.builder()
                .id("offer:" + offer.getId() + ":" + idSuffix)
                .actorType("CLINIC")
                .type(type)
                .title(title)
                .message(offer.getSupplier().getCompanyName() + " a mis a jour son offre pour la demande "
                        + offer.getQuotationRequest().getId() + ".")
                .createdAt(offer.getUpdatedAt())
                .targetUrl("/clinic/quotation-requests/" + offer.getQuotationRequest().getId())
                .entityType("SUPPLIER_OFFER")
                .entityId(offer.getId())
                .build();
    }

    private NotificationResponse clinicOfferDecisionNotification(
            SupplierOffer offer,
            String idSuffix,
            String type,
            String title
    ) {
        return NotificationResponse.builder()
                .id("offer:" + offer.getId() + ":" + idSuffix)
                .actorType("CLINIC")
                .type(type)
                .title(title)
                .message("Decision enregistree pour l'offre de " + offer.getSupplier().getCompanyName() + ".")
                .createdAt(offer.getDecisionAt())
                .targetUrl("/clinic/quotation-requests/" + offer.getQuotationRequest().getId())
                .entityType("SUPPLIER_OFFER")
                .entityId(offer.getId())
                .build();
    }

    private NotificationResponse newSupplierQuotationNotification(QuotationRequest request) {
        return NotificationResponse.builder()
                .id("quotation:" + request.getId() + ":sent")
                .actorType("SUPPLIER")
                .type("QUOTATION_SENT")
                .title("Nouvelle demande de devis")
                .message(request.getClinic().getName() + " vous a envoye une demande de devis.")
                .createdAt(request.getSentAt() == null ? request.getCreatedAt() : request.getSentAt())
                .targetUrl("/supplier/quotation-requests/" + request.getId())
                .entityType("QUOTATION_REQUEST")
                .entityId(request.getId())
                .build();
    }

    private NotificationResponse cancelledQuotationNotification(QuotationRequest request) {
        return NotificationResponse.builder()
                .id("quotation:" + request.getId() + ":cancelled")
                .actorType("SUPPLIER")
                .type("QUOTATION_CANCELLED")
                .title("Demande annulee")
                .message(request.getClinic().getName() + " a annule une demande de devis.")
                .createdAt(request.getUpdatedAt())
                .targetUrl("/supplier/quotation-requests/" + request.getId())
                .entityType("QUOTATION_REQUEST")
                .entityId(request.getId())
                .build();
    }

    private void addSupplierDecisionNotification(List<NotificationResponse> notifications, SupplierOffer offer) {
        if (offer.getStatus() == SupplierOfferStatus.ACCEPTED) {
            notifications.add(supplierOfferDecisionNotification(offer, "accepted", "OFFER_ACCEPTED", "Offre acceptee"));
        }
        if (offer.getStatus() == SupplierOfferStatus.REJECTED) {
            notifications.add(supplierOfferDecisionNotification(offer, "rejected", "OFFER_REJECTED", "Offre refusee"));
        }
    }

    private NotificationResponse supplierOfferDecisionNotification(
            SupplierOffer offer,
            String idSuffix,
            String type,
            String title
    ) {
        return NotificationResponse.builder()
                .id("offer:" + offer.getId() + ":" + idSuffix)
                .actorType("SUPPLIER")
                .type(type)
                .title(title)
                .message(offer.getQuotationRequest().getClinic().getName() + " a traite votre offre.")
                .createdAt(offer.getDecisionAt())
                .targetUrl("/supplier/offers/" + offer.getId())
                .entityType("SUPPLIER_OFFER")
                .entityId(offer.getId())
                .build();
    }

    private void addClinicOrderNotifications(List<NotificationResponse> notifications, Order order) {
        notifications.add(NotificationResponse.builder()
                .id("order:" + order.getId() + ":created")
                .actorType("CLINIC")
                .type("ORDER_CREATED")
                .title("Commande creee")
                .message("La commande " + order.getOrderNumber()
                        + " a ete creee a partir de l'offre acceptee.")
                .createdAt(order.getCreatedAt())
                .targetUrl("/clinic/orders/" + order.getId())
                .entityType("ORDER")
                .entityId(order.getId())
                .build());

        if (order.getConfirmedAt() != null) {
            notifications.add(NotificationResponse.builder()
                    .id("order:" + order.getId() + ":confirmed")
                    .actorType("CLINIC")
                    .type("ORDER_CONFIRMED")
                    .title("Commande confirmee")
                    .message(order.getSupplier().getCompanyName() + " a confirme la commande "
                            + order.getOrderNumber() + ".")
                    .createdAt(order.getConfirmedAt())
                    .targetUrl("/clinic/orders/" + order.getId())
                    .entityType("ORDER")
                    .entityId(order.getId())
                    .build());
        }

        if (order.getCancelledAt() != null) {
            notifications.add(NotificationResponse.builder()
                    .id("order:" + order.getId() + ":cancelled")
                    .actorType("CLINIC")
                    .type("ORDER_CANCELLED")
                    .title("Commande annulee")
                    .message("La commande " + order.getOrderNumber() + " a ete annulee.")
                    .createdAt(order.getCancelledAt())
                    .targetUrl("/clinic/orders/" + order.getId())
                    .entityType("ORDER")
                    .entityId(order.getId())
                    .build());
        }
    }

    private void addSupplierOrderNotifications(List<NotificationResponse> notifications, Order order) {
        notifications.add(NotificationResponse.builder()
                .id("order:" + order.getId() + ":created")
                .actorType("SUPPLIER")
                .type("ORDER_CREATED")
                .title("Nouvelle commande")
                .message(order.getClinic().getName() + " a cree la commande " + order.getOrderNumber() + ".")
                .createdAt(order.getCreatedAt())
                .targetUrl("/supplier/orders/" + order.getId())
                .entityType("ORDER")
                .entityId(order.getId())
                .build());

        if (order.getCancelledAt() != null) {
            notifications.add(NotificationResponse.builder()
                    .id("order:" + order.getId() + ":cancelled")
                    .actorType("SUPPLIER")
                    .type("ORDER_CANCELLED")
                    .title("Commande annulee")
                    .message(order.getClinic().getName() + " a annule la commande "
                            + order.getOrderNumber() + ".")
                    .createdAt(order.getCancelledAt())
                    .targetUrl("/supplier/orders/" + order.getId())
                    .entityType("ORDER")
                    .entityId(order.getId())
                    .build());
        }
    }

    private List<NotificationResponse> filterSortAndLimit(
            List<NotificationResponse> notifications,
            Integer limit,
            LocalDateTime since,
            String type
    ) {
        int resolvedLimit = resolveLimit(limit);
        return notifications.stream()
                .filter(notification -> notification.getCreatedAt() != null)
                .filter(notification -> since == null || notification.getCreatedAt().isAfter(since))
                .filter(notification -> type == null || type.equalsIgnoreCase(notification.getType()))
                .sorted(Comparator.comparing(NotificationResponse::getCreatedAt).reversed()
                        .thenComparing(NotificationResponse::getId))
                .limit(resolvedLimit)
                .toList();
    }

    private int resolveLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        if (limit < 1) {
            throw new BadRequestException("La limite doit etre superieure ou egale a 1.");
        }
        return Math.min(limit, MAX_LIMIT);
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
