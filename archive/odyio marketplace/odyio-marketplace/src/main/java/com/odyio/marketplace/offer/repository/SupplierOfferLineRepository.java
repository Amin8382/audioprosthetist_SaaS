package com.odyio.marketplace.offer.repository;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.offer.entity.SupplierOfferLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierOfferLineRepository extends JpaRepository<SupplierOfferLine, UUID> {

    List<SupplierOfferLine> findBySupplierOfferId(UUID supplierOfferId);

}
