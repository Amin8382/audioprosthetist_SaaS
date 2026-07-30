package com.odyio.marketplace.quotation.serviceImpl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;

import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.entity.ProductCategory;
import com.odyio.marketplace.catalog.repository.ProductCategoryRepository;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.clinic.entity.Clinic;
import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.enums.ProductCategoryType;
import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.common.enums.SupplierQuotationWorkflowStatus;
import com.odyio.marketplace.common.exception.ForbiddenOperationException;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.quotation.dto.QuotationRequestCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestLineCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestResponse;
import com.odyio.marketplace.quotation.dto.QuotationRequestSummaryResponse;
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

import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class QuotationRequestScopingIntegrationTest {

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
    private SupplierOfferRepository supplierOfferRepository;

    @Autowired
    private QuotationRequestRepository quotationRequestRepository;

    private Clinic clinicOne;
    private Clinic clinicTwo;
    private Supplier supplierOne;
    private Supplier supplierTwo;
    private Product supplierOneProduct;
    private Product supplierTwoProduct;
    private QuotationRequestResponse clinicOneDraft;
    private QuotationRequestResponse clinicOneSent;
    private QuotationRequestResponse clinicTwoDraft;
    private QuotationRequestResponse answeredRequest;
    private QuotationRequestResponse cancelledRequest;
    private SupplierOffer answeredOffer;

    @BeforeEach
    void setUp() {
        clinicOne = clinicRepository.save(Clinic.builder()
                .name("Clinic One Scope Test")
                .email("clinic-one-scope@test.local")
                .active(true)
                .build());
        clinicTwo = clinicRepository.save(Clinic.builder()
                .name("Clinic Two Scope Test")
                .email("clinic-two-scope@test.local")
                .active(true)
                .build());

        supplierOne = supplierRepository.save(Supplier.builder()
                .companyName("Supplier One Scope Test")
                .email("supplier-one-scope@test.local")
                .active(true)
                .build());
        supplierTwo = supplierRepository.save(Supplier.builder()
                .companyName("Supplier Two Scope Test")
                .email("supplier-two-scope@test.local")
                .active(true)
                .build());

        ProductCategory category = productCategoryRepository.save(ProductCategory.builder()
                .name("Quotation Scope Category Test")
                .type(ProductCategoryType.APPAREIL_AUDITIF)
                .active(true)
                .build());

        supplierOneProduct = productRepository.save(Product.builder()
                .supplier(supplierOne)
                .category(category)
                .name("Supplier One Product")
                .earSide(EarSide.BILATERAL)
                .available(true)
                .active(true)
                .build());
        supplierTwoProduct = productRepository.save(Product.builder()
                .supplier(supplierTwo)
                .category(category)
                .name("Supplier Two Product")
                .earSide(EarSide.RIGHT)
                .available(true)
                .active(true)
                .build());

        clinicOneDraft = quotationRequestService.createDraft(createRequest(clinicOne, supplierOne, supplierOneProduct));
        clinicTwoDraft = quotationRequestService.createDraft(createRequest(clinicTwo, supplierOne, supplierOneProduct));
        QuotationRequestResponse sentDraft = quotationRequestService.createDraft(createRequest(clinicOne, supplierTwo, supplierTwoProduct));
        clinicOneSent = quotationRequestService.send(sentDraft.getId());

        QuotationRequestResponse answerDraft = quotationRequestService.createDraft(createRequest(clinicTwo, supplierTwo, supplierTwoProduct));
        answeredRequest = quotationRequestService.send(answerDraft.getId());
        answeredOffer = supplierOfferRepository.saveAndFlush(SupplierOffer.builder()
                .quotationRequest(quotationRequestRepository.findById(answeredRequest.getId()).orElseThrow())
                .supplier(supplierTwo)
                .status(SupplierOfferStatus.SUBMITTED)
                .deliveryDelayDays(4)
                .validUntil(LocalDate.now().plusDays(10))
                .build());

        QuotationRequestResponse cancellableDraft = quotationRequestService.createDraft(createRequest(clinicOne, supplierOne, supplierOneProduct));
        QuotationRequestResponse sentCancellable = quotationRequestService.send(cancellableDraft.getId());
        cancelledRequest = quotationRequestService.cancel(sentCancellable.getId());
    }

    @Test
    void clinicScopedListReturnsOnlyThatClinicRequests() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getByClinic(clinicOne.getId(), null);

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .contains(clinicOneDraft.getId(), clinicOneSent.getId())
                .doesNotContain(clinicTwoDraft.getId());
    }

    @Test
    void supplierScopedListReturnsOnlyThatSupplierRequests() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getBySupplier(supplierOne.getId(), null);

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .contains(cancelledRequest.getId())
                .doesNotContain(clinicOneDraft.getId(), clinicTwoDraft.getId())
                .doesNotContain(clinicOneSent.getId());
    }

    @Test
    void statusFilterWorksForClinic() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getByClinic(
                clinicOne.getId(),
                QuotationRequestStatus.SENT
        );

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .containsExactly(clinicOneSent.getId());
    }

    @Test
    void statusFilterWorksForSupplier() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getBySupplier(
                supplierOne.getId(),
                QuotationRequestStatus.DRAFT
        );

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .doesNotContain(clinicOneDraft.getId(), clinicTwoDraft.getId(), clinicOneSent.getId());
    }

    @Test
    void scopedResultsAreNewestFirst() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getByClinic(clinicOne.getId(), null);

        assertThat(results).isSortedAccordingTo((left, right) ->
                right.getCreatedAt().compareTo(left.getCreatedAt())
        );
    }

    @Test
    void supplierListNeverReturnsDraftRequests() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getBySupplier(supplierOne.getId(), null);

        assertThat(results).extracting(QuotationRequestSummaryResponse::getStatus)
                .doesNotContain(QuotationRequestStatus.DRAFT);
        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .doesNotContain(clinicOneDraft.getId(), clinicTwoDraft.getId());
    }

    @Test
    void toProcessReturnsSentRequestsWithoutOffer() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getBySupplier(
                supplierTwo.getId(),
                null,
                SupplierQuotationWorkflowStatus.TO_PROCESS
        );

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .contains(clinicOneSent.getId())
                .doesNotContain(answeredRequest.getId());
        assertThat(results).allMatch(response -> !response.isHasOffer());
    }

    @Test
    void answeredReturnsRequestsWithLinkedOffers() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getBySupplier(
                supplierTwo.getId(),
                null,
                SupplierQuotationWorkflowStatus.ANSWERED
        );

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .contains(answeredRequest.getId())
                .doesNotContain(clinicOneSent.getId());
        assertThat(results).allMatch(QuotationRequestSummaryResponse::isHasOffer);
    }

    @Test
    void cancelledReturnsSupplierVisibleCancelledRequests() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getBySupplier(
                supplierOne.getId(),
                null,
                SupplierQuotationWorkflowStatus.CANCELLED
        );

        assertThat(results).extracting(QuotationRequestSummaryResponse::getId)
                .containsExactly(cancelledRequest.getId());
    }

    @Test
    void supplierCannotAccessAnotherSupplierScopedDetail() {
        assertThrows(ForbiddenOperationException.class, () ->
                quotationRequestService.getBySupplierAndId(supplierOne.getId(), clinicOneSent.getId())
        );
    }

    @Test
    void clinicListExposesOfferPresenceFalse() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getByClinic(clinicOne.getId(), null);

        QuotationRequestSummaryResponse response = results.stream()
                .filter(summary -> summary.getId().equals(clinicOneSent.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(response.isHasOffer()).isFalse();
        assertThat(response.getOfferStatus()).isNull();
    }

    @Test
    void clinicListExposesLinkedOfferStatus() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getByClinic(clinicTwo.getId(), null);

        QuotationRequestSummaryResponse response = results.stream()
                .filter(summary -> summary.getId().equals(answeredRequest.getId()))
                .findFirst()
                .orElseThrow();

        assertThat(response.isHasOffer()).isTrue();
        assertThat(response.getOfferId()).isEqualTo(answeredOffer.getId());
        assertThat(response.getOfferStatus()).isEqualTo(SupplierOfferStatus.SUBMITTED);
    }

    @Test
    void clinicReceivesOnlyItsOwnRequests() {
        List<QuotationRequestSummaryResponse> results = quotationRequestService.getByClinic(clinicOne.getId(), null);

        assertThat(results).extracting(QuotationRequestSummaryResponse::getClinicId)
                .containsOnly(clinicOne.getId());
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

}
