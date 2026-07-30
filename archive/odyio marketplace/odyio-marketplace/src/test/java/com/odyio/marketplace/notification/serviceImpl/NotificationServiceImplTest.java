package com.odyio.marketplace.notification.serviceImpl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.clinic.entity.Clinic;
import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.enums.ProductCategoryType;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.notification.dto.NotificationResponse;
import com.odyio.marketplace.notification.service.NotificationService;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.quotation.dto.QuotationRequestCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestLineCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestResponse;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.repository.QuotationRequestRepository;
import com.odyio.marketplace.quotation.service.QuotationRequestService;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NotificationServiceImplTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private QuotationRequestService quotationRequestService;

    @Autowired
    private ClinicRepository clinicRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private QuotationRequestRepository quotationRequestRepository;

    @Autowired
    private SupplierOfferRepository supplierOfferRepository;

    private Clinic clinicA;
    private Clinic clinicB;
    private Supplier supplierA;
    private Supplier supplierB;
    private Product supplierAProduct;
    private SupplierOffer submittedOffer;
    private SupplierOffer acceptedOffer;
    private SupplierOffer rejectedOffer;
    private SupplierOffer otherClinicOffer;
    private QuotationRequestResponse sentWithoutOffer;
    private QuotationRequestResponse draftRequest;

    @BeforeEach
    void setUp() {
        clinicA = clinicRepository.save(Clinic.builder()
                .name("Notification Clinic A")
                .email("notification-clinic-a@test.local")
                .active(true)
                .build());
        clinicB = clinicRepository.save(Clinic.builder()
                .name("Notification Clinic B")
                .email("notification-clinic-b@test.local")
                .active(true)
                .build());
        supplierA = supplierRepository.save(Supplier.builder()
                .companyName("Notification Supplier A")
                .email("notification-supplier-a@test.local")
                .active(true)
                .build());
        supplierB = supplierRepository.save(Supplier.builder()
                .companyName("Notification Supplier B")
                .email("notification-supplier-b@test.local")
                .active(true)
                .build());

        ProductCategory category = productCategoryRepository.save(ProductCategory.builder()
                .name("Notification Category A")
                .type(ProductCategoryType.APPAREIL_AUDITIF)
                .active(true)
                .build());

        supplierAProduct = productRepository.save(Product.builder()
                .supplier(supplierA)
                .category(category)
                .name("Notification Product A")
                .earSide(EarSide.BILATERAL)
                .available(true)
                .active(true)
                .build());
        Product supplierBProduct = productRepository.save(Product.builder()
                .supplier(supplierB)
                .category(category)
                .name("Notification Product B")
                .earSide(EarSide.BILATERAL)
                .available(true)
                .active(true)
                .build());

        sentWithoutOffer = quotationRequestService.send(quotationRequestService
                .createDraft(createRequest(clinicA, supplierA, supplierAProduct))
                .getId());
        draftRequest = quotationRequestService.createDraft(createRequest(clinicA, supplierA, supplierAProduct));

        submittedOffer = saveOffer(
                quotationRequestService.send(quotationRequestService.createDraft(createRequest(clinicA, supplierA, supplierAProduct)).getId()),
                SupplierOfferStatus.SUBMITTED,
                LocalDateTime.now().minusHours(3),
                null
        );
        acceptedOffer = saveOffer(
                quotationRequestService.send(quotationRequestService.createDraft(createRequest(clinicA, supplierA, supplierAProduct)).getId()),
                SupplierOfferStatus.ACCEPTED,
                LocalDateTime.now().minusHours(5),
                LocalDateTime.now().minusHours(1)
        );
        rejectedOffer = saveOffer(
                quotationRequestService.send(quotationRequestService.createDraft(createRequest(clinicA, supplierA, supplierAProduct)).getId()),
                SupplierOfferStatus.REJECTED,
                LocalDateTime.now().minusHours(6),
                LocalDateTime.now().minusHours(2)
        );
        otherClinicOffer = saveOffer(
                quotationRequestService.send(quotationRequestService.createDraft(createRequest(clinicB, supplierA, supplierAProduct)).getId()),
                SupplierOfferStatus.SUBMITTED,
                LocalDateTime.now().minusMinutes(30),
                null
        );
        saveOffer(
                quotationRequestService.send(quotationRequestService.createDraft(createRequest(clinicA, supplierB, supplierBProduct)).getId()),
                SupplierOfferStatus.SUBMITTED,
                LocalDateTime.now().minusMinutes(20),
                null
        );
    }

    @Test
    void clinicReceivesSubmittedOfferNotification() {
        List<NotificationResponse> notifications = notificationService.getClinicNotifications(clinicA.getId(), null, null, null);

        assertThat(notifications).extracting(NotificationResponse::getId)
                .contains("offer:" + submittedOffer.getId() + ":submitted");
    }

    @Test
    void clinicDoesNotReceiveAnotherClinicNotification() {
        List<NotificationResponse> notifications = notificationService.getClinicNotifications(clinicA.getId(), null, null, null);

        assertThat(notifications).extracting(NotificationResponse::getId)
                .doesNotContain("offer:" + otherClinicOffer.getId() + ":submitted");
    }

    @Test
    void supplierReceivesNewRequestNotification() {
        List<NotificationResponse> notifications = notificationService.getSupplierNotifications(supplierA.getId(), null, null, null);

        assertThat(notifications).extracting(NotificationResponse::getId)
                .contains("quotation:" + sentWithoutOffer.getId() + ":sent");
    }

    @Test
    void supplierReceivesAcceptedAndRejectedDecisionNotifications() {
        List<NotificationResponse> notifications = notificationService.getSupplierNotifications(supplierA.getId(), null, null, null);

        assertThat(notifications).extracting(NotificationResponse::getId)
                .contains(
                        "offer:" + acceptedOffer.getId() + ":accepted",
                        "offer:" + rejectedOffer.getId() + ":rejected"
                );
    }

    @Test
    void supplierDoesNotReceiveDraftRequestNotifications() {
        List<NotificationResponse> notifications = notificationService.getSupplierNotifications(supplierA.getId(), null, null, null);

        assertThat(notifications).extracting(NotificationResponse::getEntityId)
                .doesNotContain(draftRequest.getId());
    }

    @Test
    void notificationIdsAreDeterministic() {
        List<String> firstCallIds = notificationService.getSupplierNotifications(supplierA.getId(), null, null, null)
                .stream()
                .map(NotificationResponse::getId)
                .toList();
        List<String> secondCallIds = notificationService.getSupplierNotifications(supplierA.getId(), null, null, null)
                .stream()
                .map(NotificationResponse::getId)
                .toList();

        assertThat(secondCallIds).containsExactlyElementsOf(firstCallIds);
    }

    @Test
    void notificationsAreNewestFirst() {
        List<NotificationResponse> notifications = notificationService.getClinicNotifications(clinicA.getId(), null, null, null);

        assertThat(notifications).isSortedAccordingTo((left, right) ->
                right.getCreatedAt().compareTo(left.getCreatedAt())
        );
    }

    @Test
    void limitIsRespected() {
        List<NotificationResponse> notifications = notificationService.getClinicNotifications(clinicA.getId(), 2, null, null);

        assertThat(notifications).hasSize(2);
    }

    private QuotationRequestCreateRequest createRequest(Clinic clinic, Supplier supplier, Product product) {
        return QuotationRequestCreateRequest.builder()
                .clinicId(clinic.getId())
                .supplierId(supplier.getId())
                .requestedDeliveryDate(LocalDate.now().plusDays(7))
                .lines(List.of(QuotationRequestLineCreateRequest.builder()
                        .productId(product.getId())
                        .quantity(1)
                        .build()))
                .build();
    }

    private SupplierOffer saveOffer(
            QuotationRequestResponse request,
            SupplierOfferStatus status,
            LocalDateTime submittedAt,
            LocalDateTime decisionAt
    ) {
        QuotationRequest quotationRequest = quotationRequestRepository.findById(request.getId()).orElseThrow();
        SupplierOffer offer = supplierOfferRepository.saveAndFlush(SupplierOffer.builder()
                .quotationRequest(quotationRequest)
                .supplier(quotationRequest.getSupplier())
                .status(status)
                .deliveryDelayDays(5)
                .validUntil(LocalDate.now().plusDays(10))
                .submittedAt(submittedAt)
                .decisionAt(decisionAt)
                .rejectionReason(status == SupplierOfferStatus.REJECTED ? "Budget non prioritaire." : null)
                .build());
        offer.setSubmittedAt(submittedAt);
        offer.setDecisionAt(decisionAt);
        return supplierOfferRepository.saveAndFlush(offer);
    }

}
