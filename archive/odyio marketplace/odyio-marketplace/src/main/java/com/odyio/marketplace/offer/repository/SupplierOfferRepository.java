package com.odyio.marketplace.offer.repository;

import java.util.List;
import java.util.Optional;
import java.util.Collection;
import java.util.UUID;

import com.odyio.marketplace.common.enums.SupplierOfferStatus;
import com.odyio.marketplace.offer.entity.SupplierOffer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierOfferRepository extends JpaRepository<SupplierOffer, UUID> {

    Optional<SupplierOffer> findByQuotationRequestId(UUID quotationRequestId);

    boolean existsByQuotationRequestId(UUID quotationRequestId);

    List<SupplierOffer> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);

    List<SupplierOffer> findBySupplierIdAndStatusOrderByCreatedAtDesc(
            UUID supplierId,
            SupplierOfferStatus status
    );

    List<SupplierOffer> findByQuotationRequestIdIn(Collection<UUID> quotationRequestIds);

    List<SupplierOffer> findByQuotationRequestClinicIdOrderByUpdatedAtDesc(UUID clinicId);

    List<SupplierOffer> findBySupplierIdAndStatusInOrderByUpdatedAtDesc(
            UUID supplierId,
            Collection<SupplierOfferStatus> statuses
    );

}
