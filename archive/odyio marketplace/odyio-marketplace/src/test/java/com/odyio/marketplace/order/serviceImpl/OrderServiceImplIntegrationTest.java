package com.odyio.marketplace.order.serviceImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.clinic.entity.Clinic;
import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.common.enums.ProductCategoryType;
import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.ConflictException;
import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ForbiddenOperationException;
import com.odyio.marketplace.common.exception.ResourceNotFoundException;
import com.odyio.marketplace.notification.dto.NotificationResponse;
import com.odyio.marketplace.notification.service.NotificationService;
import com.odyio.marketplace.offer.dto.SupplierOfferResponse;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.entity.SupplierOfferLine;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.offer.service.SupplierOfferService;
import com.odyio.marketplace.order.dto.CancelOrderRequest;
import com.odyio.marketplace.order.dto.OrderResponse;
import com.odyio.marketplace.order.dto.OrderSummaryResponse;
import com.odyio.marketplace.order.repository.OrderRepository;
import com.odyio.marketplace.order.service.OrderService;
import com.odyio.marketplace.quotation.dto.QuotationRequestSummaryResponse;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
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
class OrderServiceImplIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private SupplierOfferService supplierOfferService;

    @Autowired
    private QuotationRequestService quotationRequestService;

    @Autowired
    private NotificationService notificationService;

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

    @Autowired
    private OrderRepository orderRepository;

    private Clinic clinic;
    private Clinic otherClinic;
    private Supplier supplier;
    private Supplier otherSupplier;
    private Product firstProduct;
    private Product secondProduct;

    @BeforeEach
    void setUp() {
        clinic = clinicRepository.save(Clinic.builder()
                .name("Order Test Clinic A")
                .email("order-clinic-a@test.local")
                .active(true)
                .build());
        otherClinic = clinicRepository.save(Clinic.builder()
                .name("Order Test Clinic B")
                .email("order-clinic-b@test.local")
                .active(true)
                .build());
        supplier = supplierRepository.save(Supplier.builder()
                .companyName("Order Test Supplier A")
                .email("order-supplier-a@test.local")
                .active(true)
                .build());
        otherSupplier = supplierRepository.save(Supplier.builder()
                .companyName("Order Test Supplier B")
                .email("order-supplier-b@test.local")
                .active(true)
                .build());

        ProductCategory category = productCategoryRepository.save(ProductCategory.builder()
                .name("Order Test Category A")
                .type(ProductCategoryType.APPAREIL_AUDITIF)
                .active(true)
                .build());

        firstProduct = productRepository.save(Product.builder()
                .supplier(supplier)
                .category(category)
                .name("Order Product One")
                .reference("ORD-1")
                .description("Snapshot description one")
                .earSide(EarSide.LEFT)
                .available(true)
                .active(true)
                .build());
        secondProduct = productRepository.save(Product.builder()
                .supplier(supplier)
                .category(category)
                .name("Order Product Two")
                .reference("ORD-2")
                .description("Snapshot description two")
                .earSide(EarSide.RIGHT)
                .available(true)
                .active(true)
                .build());
    }

    @Test
    void createFromAcceptedOfferCopiesCommercialSnapshot() {
        SupplierOffer offer = acceptedOffer();

        OrderResponse response = orderService.createFromOffer(offer.getId(), clinic.getId());

        assertThat(response.getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(response.getOrderNumber()).matches("CMD-\\d{4}-\\d{6}");
        assertThat(response.getClinic().getId()).isEqualTo(clinic.getId());
        assertThat(response.getSupplier().getId()).isEqualTo(supplier.getId());
        assertThat(response.getQuotationRequestId()).isEqualTo(offer.getQuotationRequest().getId());
        assertThat(response.getSupplierOfferId()).isEqualTo(offer.getId());
        assertThat(response.getCurrency()).isEqualTo("TND");
        assertThat(response.getSubtotal()).isEqualByComparingTo("850.000");
        assertThat(response.getTotal()).isEqualByComparingTo("850.000");
        assertThat(response.getLines()).hasSize(2);
        assertThat(response.getLines().get(0).getQuantity()).isEqualTo(2);
        assertThat(response.getLines().get(0).getProductName()).isEqualTo("Order Product One");
        assertThat(response.getLines().get(0).getProductReference()).isEqualTo("ORD-1");
        assertThat(response.getLines().get(0).getUnitPrice()).isEqualByComparingTo("125.000");
        assertThat(response.getLines().get(0).getLineTotal()).isEqualByComparingTo("250.000");
    }

    @Test
    void productChangesDoNotChangeOrderSnapshot() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse created = orderService.createFromOffer(offer.getId(), clinic.getId());

        firstProduct.setName("Changed Product Name");
        firstProduct.setReference("CHANGED");
        productRepository.saveAndFlush(firstProduct);

        OrderResponse response = orderService.getByClinicAndId(clinic.getId(), created.getId());

        assertThat(response.getLines().get(0).getProductName()).isEqualTo("Order Product One");
        assertThat(response.getLines().get(0).getProductReference()).isEqualTo("ORD-1");
    }

    @Test
    void offerChangesDoNotChangeOrderSnapshot() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse created = orderService.createFromOffer(offer.getId(), clinic.getId());

        offer.getLines().get(0).setUnitPrice(new BigDecimal("999.000"));
        supplierOfferRepository.saveAndFlush(offer);

        OrderResponse response = orderService.getByClinicAndId(clinic.getId(), created.getId());

        assertThat(response.getLines().get(0).getUnitPrice()).isEqualByComparingTo("125.000");
        assertThat(response.getTotal()).isEqualByComparingTo("850.000");
    }

    @Test
    void nonAcceptedOfferReturnsConflict() {
        SupplierOffer offer = offerWithStatus(SupplierOfferStatus.SUBMITTED);

        assertThrows(ConflictException.class, () -> orderService.createFromOffer(offer.getId(), clinic.getId()));
    }

    @Test
    void wrongClinicCannotCreateOrder() {
        SupplierOffer offer = acceptedOffer();

        assertThrows(ForbiddenOperationException.class, () ->
                orderService.createFromOffer(offer.getId(), otherClinic.getId())
        );
    }

    @Test
    void missingOfferReturnsNotFound() {
        assertThrows(ResourceNotFoundException.class, () ->
                orderService.createFromOffer(UUID.randomUUID(), clinic.getId())
        );
    }

    @Test
    void emptyOfferLinesAreRejected() {
        QuotationRequest request = sentQuotationRequest();
        SupplierOffer offer = supplierOfferRepository.saveAndFlush(SupplierOffer.builder()
                .quotationRequest(request)
                .supplier(supplier)
                .status(SupplierOfferStatus.ACCEPTED)
                .deliveryDelayDays(5)
                .validUntil(LocalDate.now().plusDays(10))
                .build());

        assertThrows(BadRequestException.class, () -> orderService.createFromOffer(offer.getId(), clinic.getId()));
    }

    @Test
    void duplicateOrderCreationReturnsConflict() {
        SupplierOffer offer = acceptedOffer();
        orderService.createFromOffer(offer.getId(), clinic.getId());

        assertThrows(DuplicateResourceException.class, () ->
                orderService.createFromOffer(offer.getId(), clinic.getId())
        );
    }

    @Test
    void confirmCreatedOrderWorksAndInvalidTransitionsAreRejected() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse created = orderService.createFromOffer(offer.getId(), clinic.getId());

        OrderResponse confirmed = orderService.confirm(created.getId(), supplier.getId());

        assertThat(confirmed.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(confirmed.getConfirmedAt()).isNotNull();
        assertThrows(ConflictException.class, () -> orderService.confirm(created.getId(), supplier.getId()));
        assertThrows(ConflictException.class, () ->
                orderService.cancel(created.getId(), clinic.getId(), CancelOrderRequest.builder().build())
        );
    }

    @Test
    void wrongSupplierCannotConfirm() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse created = orderService.createFromOffer(offer.getId(), clinic.getId());

        assertThrows(ForbiddenOperationException.class, () ->
                orderService.confirm(created.getId(), otherSupplier.getId())
        );
    }

    @Test
    void cancelCreatedOrderWorksAndBlankReasonIsRejected() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse created = orderService.createFromOffer(offer.getId(), clinic.getId());

        assertThrows(BadRequestException.class, () ->
                orderService.cancel(created.getId(), clinic.getId(), CancelOrderRequest.builder().reason("   ").build())
        );

        OrderResponse cancelled = orderService.cancel(
                created.getId(),
                clinic.getId(),
                CancelOrderRequest.builder().reason("  Commande creee par erreur.  ").build()
        );

        assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(cancelled.getCancelledAt()).isNotNull();
        assertThat(cancelled.getCancellationReason()).isEqualTo("Commande creee par erreur.");
        assertThrows(ConflictException.class, () -> orderService.confirm(created.getId(), supplier.getId()));
    }

    @Test
    void wrongClinicCannotCancel() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse created = orderService.createFromOffer(offer.getId(), clinic.getId());

        assertThrows(ForbiddenOperationException.class, () ->
                orderService.cancel(created.getId(), otherClinic.getId(), CancelOrderRequest.builder().build())
        );
    }

    @Test
    void clinicAndSupplierReadsAreScopedAndFilterable() {
        OrderResponse first = orderService.createFromOffer(acceptedOffer().getId(), clinic.getId());
        OrderResponse second = orderService.createFromOffer(acceptedOffer().getId(), clinic.getId());
        orderService.confirm(second.getId(), supplier.getId());

        List<OrderSummaryResponse> clinicOrders = orderService.getByClinic(clinic.getId(), null);
        List<OrderSummaryResponse> supplierConfirmed = orderService.getBySupplier(supplier.getId(), OrderStatus.CONFIRMED);

        assertThat(clinicOrders).extracting(OrderSummaryResponse::getId).contains(first.getId(), second.getId());
        assertThat(supplierConfirmed).extracting(OrderSummaryResponse::getId).contains(second.getId());
        assertThat(supplierConfirmed).allMatch(order -> order.getStatus() == OrderStatus.CONFIRMED);
        assertThat(orderService.getByClinicAndId(clinic.getId(), first.getId()).getLines()).hasSize(2);
        assertThrows(ForbiddenOperationException.class, () -> orderService.getByClinicAndId(otherClinic.getId(), first.getId()));
        assertThrows(ForbiddenOperationException.class, () -> orderService.getBySupplierAndId(otherSupplier.getId(), first.getId()));
    }

    @Test
    void offerAndQuotationSummariesExposeOrderState() {
        SupplierOffer offer = acceptedOffer();
        OrderResponse order = orderService.createFromOffer(offer.getId(), clinic.getId());

        SupplierOfferResponse offerResponse = supplierOfferService.getById(offer.getId());
        List<QuotationRequestSummaryResponse> quotationSummaries = quotationRequestService.getByClinic(clinic.getId(), null);

        assertThat(offerResponse.isHasOrder()).isTrue();
        assertThat(offerResponse.getOrderId()).isEqualTo(order.getId());
        assertThat(offerResponse.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(offerResponse.getOrderNumber()).isEqualTo(order.getOrderNumber());
        assertThat(quotationSummaries)
                .filteredOn(summary -> summary.getQuotationRequestId().equals(offer.getQuotationRequest().getId()))
                .singleElement()
                .satisfies(summary -> {
                    assertThat(summary.isHasOrder()).isTrue();
                    assertThat(summary.getOrderId()).isEqualTo(order.getId());
                    assertThat(summary.getOrderStatus()).isEqualTo(OrderStatus.CREATED);
                    assertThat(summary.getOrderNumber()).isEqualTo(order.getOrderNumber());
                });
    }

    @Test
    void derivedOrderNotificationsAreScopedDeterministicAndSorted() {
        OrderResponse first = orderService.createFromOffer(acceptedOffer().getId(), clinic.getId());
        OrderResponse second = orderService.createFromOffer(acceptedOffer().getId(), clinic.getId());
        orderService.confirm(second.getId(), supplier.getId());
        OrderResponse third = orderService.createFromOffer(acceptedOffer().getId(), clinic.getId());
        orderService.cancel(third.getId(), clinic.getId(), CancelOrderRequest.builder().reason("Annulation test").build());

        List<NotificationResponse> supplierNotifications = notificationService.getSupplierNotifications(
                supplier.getId(),
                20,
                null,
                null
        );
        List<NotificationResponse> clinicNotifications = notificationService.getClinicNotifications(
                clinic.getId(),
                20,
                null,
                null
        );
        List<NotificationResponse> otherClinicNotifications = notificationService.getClinicNotifications(
                otherClinic.getId(),
                20,
                null,
                null
        );

        assertThat(supplierNotifications).extracting(NotificationResponse::getId)
                .contains("order:" + first.getId() + ":created", "order:" + third.getId() + ":cancelled");
        assertThat(clinicNotifications).extracting(NotificationResponse::getId)
                .contains("order:" + second.getId() + ":confirmed");
        assertThat(otherClinicNotifications).extracting(NotificationResponse::getId)
                .doesNotContain("order:" + first.getId() + ":created");
        assertThat(supplierNotifications)
                .isSortedAccordingTo((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()));
    }

    private SupplierOffer acceptedOffer() {
        return offerWithStatus(SupplierOfferStatus.ACCEPTED);
    }

    private SupplierOffer offerWithStatus(SupplierOfferStatus status) {
        QuotationRequest request = sentQuotationRequest();
        SupplierOffer offer = SupplierOffer.builder()
                .quotationRequest(request)
                .supplier(supplier)
                .status(status)
                .supplierNotes("Order commercial notes")
                .deliveryDelayDays(4)
                .validUntil(LocalDate.now().plusDays(20))
                .build();
        offer.addLine(SupplierOfferLine.builder()
                .quotationRequestLine(request.getLines().get(0))
                .unitPrice(new BigDecimal("125.000"))
                .lineNotes("First offer line")
                .build());
        offer.addLine(SupplierOfferLine.builder()
                .quotationRequestLine(request.getLines().get(1))
                .unitPrice(new BigDecimal("200.000"))
                .lineNotes("Second offer line")
                .build());
        return supplierOfferRepository.saveAndFlush(offer);
    }

    private QuotationRequest sentQuotationRequest() {
        QuotationRequest request = QuotationRequest.builder()
                .clinic(clinic)
                .supplier(supplier)
                .status(QuotationRequestStatus.SENT)
                .sentAt(java.time.LocalDateTime.now().minusHours(1))
                .expiresAt(java.time.LocalDateTime.now().plusDays(13))
                .build();
        request.addLine(QuotationRequestLine.builder()
                .product(firstProduct)
                .quantity(2)
                .lineNotes("First request line")
                .build());
        request.addLine(QuotationRequestLine.builder()
                .product(secondProduct)
                .quantity(3)
                .lineNotes("Second request line")
                .build());
        return quotationRequestRepository.saveAndFlush(request);
    }

}
