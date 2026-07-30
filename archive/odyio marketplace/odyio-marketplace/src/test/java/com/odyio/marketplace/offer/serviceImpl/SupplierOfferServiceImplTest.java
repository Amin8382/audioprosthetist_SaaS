package com.odyio.marketplace.offer.serviceImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.common.exception.DuplicateResourceException;
import com.odyio.marketplace.common.exception.ForbiddenOperationException;
import com.odyio.marketplace.offer.dto.RejectSupplierOfferRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferCreateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferLineCreateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferLineResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferLineUpdateRequest;
import com.odyio.marketplace.offer.dto.SupplierOfferResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferSummaryResponse;
import com.odyio.marketplace.offer.dto.SupplierOfferUpdateRequest;
import com.odyio.marketplace.offer.service.SupplierOfferService;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
import com.odyio.marketplace.quotation.repository.QuotationRequestRepository;
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
class SupplierOfferServiceImplTest {

    @Autowired
    private SupplierOfferService supplierOfferService;

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

    private Clinic clinic;
    private Clinic otherClinic;
    private Supplier supplier;
    private Supplier otherSupplier;
    private QuotationRequest sentRequest;
    private QuotationRequest draftRequest;
    private QuotationRequestLine firstLine;
    private QuotationRequestLine secondLine;

    @BeforeEach
    void setUp() {
        clinic = clinicRepository.save(Clinic.builder()
                .name("Test Offer Clinic A")
                .email("offer-clinic-a@test.local")
                .active(true)
                .build());
        otherClinic = clinicRepository.save(Clinic.builder()
                .name("Test Offer Clinic B")
                .email("offer-clinic-b@test.local")
                .active(true)
                .build());

        supplier = supplierRepository.save(Supplier.builder()
                .companyName("Test Offer Supplier A")
                .email("offer-supplier-a@test.local")
                .active(true)
                .build());
        otherSupplier = supplierRepository.save(Supplier.builder()
                .companyName("Test Offer Supplier B")
                .email("offer-supplier-b@test.local")
                .active(true)
                .build());

        ProductCategory category = productCategoryRepository.save(ProductCategory.builder()
                .name("Test Offer Category A")
                .type(ProductCategoryType.APPAREIL_AUDITIF)
                .active(true)
                .build());

        Product firstProduct = productRepository.save(Product.builder()
                .supplier(supplier)
                .category(category)
                .name("Offer Product One")
                .reference("OFFER-1")
                .earSide(EarSide.LEFT)
                .available(true)
                .active(true)
                .build());
        Product secondProduct = productRepository.save(Product.builder()
                .supplier(supplier)
                .category(category)
                .name("Offer Product Two")
                .reference("OFFER-2")
                .earSide(EarSide.RIGHT)
                .available(true)
                .active(true)
                .build());

        sentRequest = QuotationRequest.builder()
                .clinic(clinic)
                .supplier(supplier)
                .status(QuotationRequestStatus.SENT)
                .build();
        sentRequest.addLine(QuotationRequestLine.builder()
                .product(firstProduct)
                .quantity(2)
                .build());
        sentRequest.addLine(QuotationRequestLine.builder()
                .product(secondProduct)
                .quantity(3)
                .build());
        sentRequest = quotationRequestRepository.saveAndFlush(sentRequest);
        firstLine = sentRequest.getLines().get(0);
        secondLine = sentRequest.getLines().get(1);

        draftRequest = QuotationRequest.builder()
                .clinic(clinic)
                .supplier(supplier)
                .status(QuotationRequestStatus.DRAFT)
                .build();
        draftRequest.addLine(QuotationRequestLine.builder()
                .product(firstProduct)
                .quantity(1)
                .build());
        draftRequest.addLine(QuotationRequestLine.builder()
                .product(secondProduct)
                .quantity(1)
                .build());
        draftRequest = quotationRequestRepository.saveAndFlush(draftRequest);
    }

    @Test
    void createDraftCreatesValidOffer() {
        SupplierOfferResponse response = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        assertThat(response.getStatus()).isEqualTo(SupplierOfferStatus.DRAFT);
        assertThat(response.getQuotationRequestId()).isEqualTo(sentRequest.getId());
        assertThat(response.getLines()).hasSize(2);
    }

    @Test
    void createDraftRejectsNonSentQuotationRequest() {
        assertThrows(BadRequestException.class, () ->
                supplierOfferService.createDraft(validCreateRequest(draftRequest))
        );
    }

    @Test
    void createDraftRejectsSupplierMismatch() {
        SupplierOfferCreateRequest request = validCreateRequest(sentRequest);
        request.setSupplierId(otherSupplier.getId());

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(request));
    }

    @Test
    void createDraftRejectsDuplicateOffer() {
        supplierOfferService.createDraft(validCreateRequest(sentRequest));

        assertThrows(DuplicateResourceException.class, () ->
                supplierOfferService.createDraft(validCreateRequest(sentRequest))
        );
    }

    @Test
    void createDraftRejectsMissingRequestLine() {
        SupplierOfferCreateRequest request = SupplierOfferCreateRequest.builder()
                .quotationRequestId(sentRequest.getId())
                .supplierId(supplier.getId())
                .deliveryDelayDays(7)
                .validUntil(LocalDate.now().plusDays(10))
                .lines(List.of(createLine(firstLine.getId(), "100.000")))
                .build();

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(request));
    }

    @Test
    void createDraftRejectsExtraRequestLine() {
        SupplierOfferCreateRequest request = validCreateRequest(sentRequest);
        request.getLines().add(createLine(UUID.randomUUID(), "100.000"));

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(request));
    }

    @Test
    void createDraftRejectsDuplicateLine() {
        SupplierOfferCreateRequest request = SupplierOfferCreateRequest.builder()
                .quotationRequestId(sentRequest.getId())
                .supplierId(supplier.getId())
                .deliveryDelayDays(7)
                .validUntil(LocalDate.now().plusDays(10))
                .lines(List.of(
                        createLine(firstLine.getId(), "100.000"),
                        createLine(firstLine.getId(), "120.000")
                ))
                .build();

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(request));
    }

    @Test
    void createDraftRejectsZeroOrNegativePrice() {
        SupplierOfferCreateRequest zeroPriceRequest = validCreateRequest(sentRequest);
        zeroPriceRequest.getLines().get(0).setUnitPrice(BigDecimal.ZERO);

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(zeroPriceRequest));

        SupplierOfferCreateRequest negativePriceRequest = validCreateRequest(sentRequest);
        negativePriceRequest.getLines().get(0).setUnitPrice(new BigDecimal("-1.000"));

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(negativePriceRequest));
    }

    @Test
    void createDraftRejectsExpiredValidUntil() {
        SupplierOfferCreateRequest request = validCreateRequest(sentRequest);
        request.setValidUntil(LocalDate.now().minusDays(1));

        assertThrows(BadRequestException.class, () -> supplierOfferService.createDraft(request));
    }

    @Test
    void updateDraftWorks() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        SupplierOfferResponse updated = supplierOfferService.updateDraft(
                created.getId(),
                SupplierOfferUpdateRequest.builder()
                        .supplierNotes("Updated notes")
                        .deliveryDelayDays(3)
                        .validUntil(LocalDate.now().plusDays(20))
                        .lines(List.of(
                                updateLine(firstLine.getId(), "200.000"),
                                updateLine(secondLine.getId(), "300.000")
                        ))
                        .build()
        );

        assertThat(updated.getSupplierNotes()).isEqualTo("Updated notes");
        assertThat(updated.getDeliveryDelayDays()).isEqualTo(3);
        assertThat(updated.getTotalAmount()).isEqualByComparingTo("1300.000");
    }

    @Test
    void updateSubmittedOfferIsRejected() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));
        supplierOfferService.submit(created.getId());

        assertThrows(BadRequestException.class, () ->
                supplierOfferService.updateDraft(created.getId(), validUpdateRequest())
        );
    }

    @Test
    void submitChangesDraftToSubmittedAndSetsSubmittedAt() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        SupplierOfferResponse submitted = supplierOfferService.submit(created.getId());

        assertThat(submitted.getStatus()).isEqualTo(SupplierOfferStatus.SUBMITTED);
        assertNotNull(submitted.getSubmittedAt());
    }

    @Test
    void withdrawSubmittedOfferWorks() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));
        SupplierOfferResponse submitted = supplierOfferService.submit(created.getId());

        SupplierOfferResponse withdrawn = supplierOfferService.withdraw(submitted.getId());

        assertThat(withdrawn.getStatus()).isEqualTo(SupplierOfferStatus.WITHDRAWN);
    }

    @Test
    void withdrawDraftOfferIsRejected() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        assertThrows(BadRequestException.class, () -> supplierOfferService.withdraw(created.getId()));
    }

    @Test
    void acceptSubmittedOfferWorks() {
        SupplierOfferResponse submitted = submitValidOffer();

        SupplierOfferResponse accepted = supplierOfferService.acceptOffer(submitted.getId(), clinic.getId());

        assertThat(accepted.getStatus()).isEqualTo(SupplierOfferStatus.ACCEPTED);
        assertThat(accepted.getDecisionAt()).isNotNull();
        assertThat(accepted.getRejectionReason()).isNull();
    }

    @Test
    void rejectSubmittedOfferWorks() {
        SupplierOfferResponse submitted = submitValidOffer();

        SupplierOfferResponse rejected = supplierOfferService.rejectOffer(
                submitted.getId(),
                clinic.getId(),
                RejectSupplierOfferRequest.builder()
                        .reason("Delai de livraison incompatible.")
                        .build()
        );

        assertThat(rejected.getStatus()).isEqualTo(SupplierOfferStatus.REJECTED);
        assertThat(rejected.getDecisionAt()).isNotNull();
    }

    @Test
    void rejectionReasonIsStoredAndNormalized() {
        SupplierOfferResponse submitted = submitValidOffer();

        SupplierOfferResponse rejected = supplierOfferService.rejectOffer(
                submitted.getId(),
                clinic.getId(),
                RejectSupplierOfferRequest.builder()
                        .reason("  Delai de livraison incompatible avec nos besoins.  ")
                        .build()
        );

        assertThat(rejected.getRejectionReason()).isEqualTo("Delai de livraison incompatible avec nos besoins.");
    }

    @Test
    void blankRejectionReasonIsRejectedWhenProvided() {
        SupplierOfferResponse submitted = submitValidOffer();

        assertThrows(BadRequestException.class, () -> supplierOfferService.rejectOffer(
                submitted.getId(),
                clinic.getId(),
                RejectSupplierOfferRequest.builder()
                        .reason("   ")
                        .build()
        ));
    }

    @Test
    void acceptanceClearsRejectionReason() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOffer supplierOffer = supplierOfferRepository.findById(submitted.getId()).orElseThrow();
        supplierOffer.setRejectionReason("Legacy rejection reason");
        supplierOfferRepository.saveAndFlush(supplierOffer);

        SupplierOfferResponse accepted = supplierOfferService.acceptOffer(submitted.getId(), clinic.getId());

        assertThat(accepted.getRejectionReason()).isNull();
    }

    @Test
    void wrongClinicCannotAccept() {
        SupplierOfferResponse submitted = submitValidOffer();

        assertThrows(ForbiddenOperationException.class, () ->
                supplierOfferService.acceptOffer(submitted.getId(), otherClinic.getId())
        );
    }

    @Test
    void wrongClinicCannotReject() {
        SupplierOfferResponse submitted = submitValidOffer();

        assertThrows(ForbiddenOperationException.class, () ->
                supplierOfferService.rejectOffer(submitted.getId(), otherClinic.getId(), null)
        );
    }

    @Test
    void draftCannotBeAccepted() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        assertThrows(BadRequestException.class, () ->
                supplierOfferService.acceptOffer(created.getId(), clinic.getId())
        );
    }

    @Test
    void draftCannotBeRejected() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        assertThrows(BadRequestException.class, () ->
                supplierOfferService.rejectOffer(created.getId(), clinic.getId(), null)
        );
    }

    @Test
    void withdrawnCannotBeAccepted() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOfferResponse withdrawn = supplierOfferService.withdraw(submitted.getId());

        assertThrows(DuplicateResourceException.class, () ->
                supplierOfferService.acceptOffer(withdrawn.getId(), clinic.getId())
        );
    }

    @Test
    void acceptedCannotBeRejected() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOfferResponse accepted = supplierOfferService.acceptOffer(submitted.getId(), clinic.getId());

        assertThrows(DuplicateResourceException.class, () ->
                supplierOfferService.rejectOffer(accepted.getId(), clinic.getId(), null)
        );
    }

    @Test
    void rejectedCannotBeAccepted() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOfferResponse rejected = supplierOfferService.rejectOffer(submitted.getId(), clinic.getId(), null);

        assertThrows(DuplicateResourceException.class, () ->
                supplierOfferService.acceptOffer(rejected.getId(), clinic.getId())
        );
    }

    @Test
    void acceptedOfferCannotBeWithdrawn() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOfferResponse accepted = supplierOfferService.acceptOffer(submitted.getId(), clinic.getId());

        assertThrows(DuplicateResourceException.class, () -> supplierOfferService.withdraw(accepted.getId()));
    }

    @Test
    void rejectedOfferCannotBeWithdrawn() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOfferResponse rejected = supplierOfferService.rejectOffer(submitted.getId(), clinic.getId(), null);

        assertThrows(DuplicateResourceException.class, () -> supplierOfferService.withdraw(rejected.getId()));
    }

    @Test
    void expiredOfferCannotBeAccepted() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOffer supplierOffer = supplierOfferRepository.findById(submitted.getId()).orElseThrow();
        supplierOffer.setValidUntil(LocalDate.now().minusDays(1));
        supplierOfferRepository.saveAndFlush(supplierOffer);

        assertThrows(BadRequestException.class, () ->
                supplierOfferService.acceptOffer(submitted.getId(), clinic.getId())
        );
    }

    @Test
    void expiredOfferCannotBeRejected() {
        SupplierOfferResponse submitted = submitValidOffer();
        SupplierOffer supplierOffer = supplierOfferRepository.findById(submitted.getId()).orElseThrow();
        supplierOffer.setValidUntil(LocalDate.now().minusDays(1));
        supplierOfferRepository.saveAndFlush(supplierOffer);

        assertThrows(BadRequestException.class, () ->
                supplierOfferService.rejectOffer(submitted.getId(), clinic.getId(), null)
        );
    }

    @Test
    void responseDtoExposesDecisionFields() {
        SupplierOfferResponse submitted = submitValidOffer();
        supplierOfferService.rejectOffer(
                submitted.getId(),
                clinic.getId(),
                RejectSupplierOfferRequest.builder()
                        .reason("Budget clinique prioritaire.")
                        .build()
        );

        SupplierOfferResponse response = supplierOfferService.getById(submitted.getId());

        assertThat(response.getDecisionAt()).isNotNull();
        assertThat(response.getRejectionReason()).isEqualTo("Budget clinique prioritaire.");
    }

    @Test
    void getByQuotationRequestWorks() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        SupplierOfferResponse response = supplierOfferService.getByQuotationRequest(sentRequest.getId());

        assertThat(response.getId()).isEqualTo(created.getId());
    }

    @Test
    void supplierStatusFilterWorks() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));
        supplierOfferService.submit(created.getId());

        List<SupplierOfferSummaryResponse> submittedOffers = supplierOfferService.getBySupplier(
                supplier.getId(),
                SupplierOfferStatus.SUBMITTED
        );

        assertThat(submittedOffers).extracting(SupplierOfferSummaryResponse::getId)
                .contains(created.getId());
    }

    @Test
    void totalAmountAndLineSubtotalsAreCalculated() {
        SupplierOfferResponse response = supplierOfferService.createDraft(validCreateRequest(sentRequest));

        assertThat(response.getTotalAmount()).isEqualByComparingTo("850.000");
        assertThat(response.getLines())
                .extracting(SupplierOfferLineResponse::getLineSubtotal)
                .containsExactlyInAnyOrder(new BigDecimal("250.000"), new BigDecimal("600.000"));
    }

    private SupplierOfferCreateRequest validCreateRequest(QuotationRequest quotationRequest) {
        return SupplierOfferCreateRequest.builder()
                .quotationRequestId(quotationRequest.getId())
                .supplierId(supplier.getId())
                .supplierNotes("Offre valable sous reserve de disponibilite.")
                .deliveryDelayDays(7)
                .validUntil(LocalDate.now().plusDays(10))
                .lines(new ArrayList<>(List.of(
                        createLine(quotationRequest.getLines().get(0).getId(), "125.000"),
                        createLine(quotationRequest.getLines().get(1).getId(), "200.000")
                )))
                .build();
    }

    private SupplierOfferResponse submitValidOffer() {
        SupplierOfferResponse created = supplierOfferService.createDraft(validCreateRequest(sentRequest));
        return supplierOfferService.submit(created.getId());
    }

    private SupplierOfferLineCreateRequest createLine(UUID requestLineId, String unitPrice) {
        return SupplierOfferLineCreateRequest.builder()
                .quotationRequestLineId(requestLineId)
                .unitPrice(new BigDecimal(unitPrice))
                .lineNotes("Line notes")
                .build();
    }

    private SupplierOfferUpdateRequest validUpdateRequest() {
        return SupplierOfferUpdateRequest.builder()
                .deliveryDelayDays(5)
                .validUntil(LocalDate.now().plusDays(15))
                .lines(List.of(
                        updateLine(firstLine.getId(), "150.000"),
                        updateLine(secondLine.getId(), "250.000")
                ))
                .build();
    }

    private SupplierOfferLineUpdateRequest updateLine(UUID requestLineId, String unitPrice) {
        return SupplierOfferLineUpdateRequest.builder()
                .quotationRequestLineId(requestLineId)
                .unitPrice(new BigDecimal(unitPrice))
                .lineNotes("Updated line notes")
                .build();
    }

}
