package com.odyio.marketplace.quotation.repository;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.common.enums.QuotationRequestStatus;
import com.odyio.marketplace.quotation.entity.QuotationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuotationRequestRepository extends JpaRepository<QuotationRequest, UUID> {

    List<QuotationRequest> findByClinicIdOrderByCreatedAtDesc(UUID clinicId);

    List<QuotationRequest> findByClinicIdAndStatusOrderByCreatedAtDesc(UUID clinicId, QuotationRequestStatus status);

    List<QuotationRequest> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);

    List<QuotationRequest> findBySupplierIdAndStatusOrderByCreatedAtDesc(UUID supplierId, QuotationRequestStatus status);

    List<QuotationRequest> findByStatusOrderByCreatedAtDesc(QuotationRequestStatus status);

    @Query("""
            select q
            from QuotationRequest q
            where q.supplier.id = :supplierId
              and q.status <> com.odyio.marketplace.common.enums.QuotationRequestStatus.DRAFT
            order by q.createdAt desc
            """)
    List<QuotationRequest> findSupplierVisibleOrderByCreatedAtDesc(@Param("supplierId") UUID supplierId);

    @Query("""
            select q
            from QuotationRequest q
            where q.supplier.id = :supplierId
              and q.status = :status
              and q.status <> com.odyio.marketplace.common.enums.QuotationRequestStatus.DRAFT
            order by q.createdAt desc
            """)
    List<QuotationRequest> findSupplierVisibleByStatusOrderByCreatedAtDesc(
            @Param("supplierId") UUID supplierId,
            @Param("status") QuotationRequestStatus status
    );

    @Query("""
            select q
            from QuotationRequest q
            where q.supplier.id = :supplierId
              and q.status = com.odyio.marketplace.common.enums.QuotationRequestStatus.SENT
              and not exists (
                  select o.id
                  from SupplierOffer o
                  where o.quotationRequest = q
              )
            order by q.createdAt desc
            """)
    List<QuotationRequest> findSupplierSentWithoutOfferOrderByCreatedAtDesc(@Param("supplierId") UUID supplierId);

    @Query("""
            select q
            from QuotationRequest q
            where q.supplier.id = :supplierId
              and q.status <> com.odyio.marketplace.common.enums.QuotationRequestStatus.DRAFT
              and exists (
                  select o.id
                  from SupplierOffer o
                  where o.quotationRequest = q
              )
            order by q.createdAt desc
            """)
    List<QuotationRequest> findSupplierVisibleWithOfferOrderByCreatedAtDesc(@Param("supplierId") UUID supplierId);

    @Query("""
            select q
            from QuotationRequest q
            where q.supplier.id = :supplierId
              and q.status = :status
              and q.status <> com.odyio.marketplace.common.enums.QuotationRequestStatus.DRAFT
              and exists (
                  select o.id
                  from SupplierOffer o
                  where o.quotationRequest = q
              )
            order by q.createdAt desc
            """)
    List<QuotationRequest> findSupplierVisibleByStatusWithOfferOrderByCreatedAtDesc(
            @Param("supplierId") UUID supplierId,
            @Param("status") QuotationRequestStatus status
    );

    List<QuotationRequest> findBySupplierIdAndStatusAndSentAtIsNotNullOrderByUpdatedAtDesc(
            UUID supplierId,
            QuotationRequestStatus status
    );

}
