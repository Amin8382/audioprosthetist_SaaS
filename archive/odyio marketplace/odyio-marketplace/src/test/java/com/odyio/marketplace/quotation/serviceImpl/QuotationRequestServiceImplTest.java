package com.odyio.marketplace.quotation.serviceImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.catalog.repository.ProductRepository;
import com.odyio.marketplace.clinic.entity.Clinic;
import com.odyio.marketplace.clinic.repository.ClinicRepository;
import com.odyio.marketplace.common.enums.EarSide;
import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.common.exception.BadRequestException;
import com.odyio.marketplace.quotation.dto.QuotationRequestCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestLineCreateRequest;
import com.odyio.marketplace.quotation.dto.QuotationRequestResponse;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
import com.odyio.marketplace.quotation.repository.QuotationRequestRepository;
import com.odyio.marketplace.offer.repository.SupplierOfferRepository;
import com.odyio.marketplace.order.repository.OrderRepository;
import com.odyio.marketplace.supplier.entity.Supplier;
import com.odyio.marketplace.supplier.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuotationRequestServiceImplTest {

    @Mock
    private QuotationRequestRepository quotationRequestRepository;

    @Mock
    private ClinicRepository clinicRepository;

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private SupplierOfferRepository supplierOfferRepository;

    @Mock
    private OrderRepository orderRepository;

    private QuotationRequestServiceImpl quotationRequestService;

    private UUID clinicId;
    private UUID supplierId;
    private UUID otherSupplierId;
    private UUID productId;
    private Clinic clinic;
    private Supplier supplier;
    private Supplier otherSupplier;
    private Product product;

    @BeforeEach
    void setUp() {
        quotationRequestService = new QuotationRequestServiceImpl(
                quotationRequestRepository,
                clinicRepository,
                supplierRepository,
                productRepository,
                supplierOfferRepository,
                orderRepository
        );

        clinicId = UUID.randomUUID();
        supplierId = UUID.randomUUID();
        otherSupplierId = UUID.randomUUID();
        productId = UUID.randomUUID();

        clinic = Clinic.builder()
                .name("Clinique Centrale")
                .active(true)
                .build();
        clinic.setId(clinicId);

        supplier = Supplier.builder()
                .companyName("Supplier One")
                .active(true)
                .build();
        supplier.setId(supplierId);

        otherSupplier = Supplier.builder()
                .companyName("Supplier Two")
                .active(true)
                .build();
        otherSupplier.setId(otherSupplierId);

        product = Product.builder()
                .supplier(supplier)
                .name("Audion X1")
                .reference("AX1")
                .earSide(EarSide.BILATERAL)
                .active(true)
                .available(true)
                .build();
        product.setId(productId);
    }

    @Test
    void createDraftCreatesValidDraft() {
        when(clinicRepository.findById(clinicId)).thenReturn(Optional.of(clinic));
        when(supplierRepository.findById(supplierId)).thenReturn(Optional.of(supplier));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(quotationRequestRepository.save(any(QuotationRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuotationRequestResponse response = quotationRequestService.createDraft(validRequest(productId));

        assertEquals(QuotationRequestStatus.DRAFT, response.getStatus());
        assertEquals(clinicId, response.getClinicId());
        assertEquals(supplierId, response.getSupplierId());
        assertEquals(1, response.getLines().size());
        assertEquals(productId, response.getLines().get(0).getProductId());
    }

    @Test
    void createDraftRejectsProductFromDifferentSupplier() {
        Product otherSupplierProduct = Product.builder()
                .supplier(otherSupplier)
                .name("Other Product")
                .earSide(EarSide.LEFT)
                .active(true)
                .available(true)
                .build();
        otherSupplierProduct.setId(productId);

        when(clinicRepository.findById(clinicId)).thenReturn(Optional.of(clinic));
        when(supplierRepository.findById(supplierId)).thenReturn(Optional.of(supplier));
        when(productRepository.findById(productId)).thenReturn(Optional.of(otherSupplierProduct));

        assertThrows(BadRequestException.class, () -> quotationRequestService.createDraft(validRequest(productId)));
    }

    @Test
    void createDraftRejectsUnavailableProduct() {
        product.setAvailable(false);

        when(clinicRepository.findById(clinicId)).thenReturn(Optional.of(clinic));
        when(supplierRepository.findById(supplierId)).thenReturn(Optional.of(supplier));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));

        assertThrows(BadRequestException.class, () -> quotationRequestService.createDraft(validRequest(productId)));
    }

    @Test
    void createDraftRejectsDuplicateProductLines() {
        QuotationRequestCreateRequest request = QuotationRequestCreateRequest.builder()
                .clinicId(clinicId)
                .supplierId(supplierId)
                .lines(List.of(lineRequest(productId), lineRequest(productId)))
                .build();

        when(clinicRepository.findById(clinicId)).thenReturn(Optional.of(clinic));
        when(supplierRepository.findById(supplierId)).thenReturn(Optional.of(supplier));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));

        assertThrows(BadRequestException.class, () -> quotationRequestService.createDraft(request));
    }

    @Test
    void sendChangesDraftToSent() {
        UUID requestId = UUID.randomUUID();
        QuotationRequest quotationRequest = draftQuotationRequest(requestId);

        when(quotationRequestRepository.findById(requestId)).thenReturn(Optional.of(quotationRequest));
        when(quotationRequestRepository.save(any(QuotationRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuotationRequestResponse response = quotationRequestService.send(requestId);

        assertEquals(QuotationRequestStatus.SENT, response.getStatus());
        assertNotNull(response.getSentAt());
        assertNotNull(response.getExpiresAt());
    }

    @Test
    void cancelChangesDraftToCancelled() {
        UUID requestId = UUID.randomUUID();
        QuotationRequest quotationRequest = draftQuotationRequest(requestId);

        when(quotationRequestRepository.findById(requestId)).thenReturn(Optional.of(quotationRequest));
        when(quotationRequestRepository.save(any(QuotationRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QuotationRequestResponse response = quotationRequestService.cancel(requestId);

        assertEquals(QuotationRequestStatus.CANCELLED, response.getStatus());
    }

    @Test
    void sendRejectsNonDraftRequest() {
        UUID requestId = UUID.randomUUID();
        QuotationRequest quotationRequest = draftQuotationRequest(requestId);
        quotationRequest.setStatus(QuotationRequestStatus.SENT);

        when(quotationRequestRepository.findById(requestId)).thenReturn(Optional.of(quotationRequest));

        assertThrows(BadRequestException.class, () -> quotationRequestService.send(requestId));
    }

    private QuotationRequestCreateRequest validRequest(UUID productId) {
        return QuotationRequestCreateRequest.builder()
                .clinicId(clinicId)
                .supplierId(supplierId)
                .clinicNotes("Besoin pour un patient.")
                .lines(List.of(lineRequest(productId)))
                .build();
    }

    private QuotationRequestLineCreateRequest lineRequest(UUID productId) {
        return QuotationRequestLineCreateRequest.builder()
                .productId(productId)
                .quantity(2)
                .lineNotes("Version rechargeable souhaitee.")
                .build();
    }

    private QuotationRequest draftQuotationRequest(UUID requestId) {
        QuotationRequest quotationRequest = QuotationRequest.builder()
                .clinic(clinic)
                .supplier(supplier)
                .status(QuotationRequestStatus.DRAFT)
                .build();
        quotationRequest.setId(requestId);
        quotationRequest.addLine(QuotationRequestLine.builder()
                .product(product)
                .quantity(2)
                .build());
        return quotationRequest;
    }

}
