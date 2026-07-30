package com.odyio.marketplace.quotation.repository;

import java.util.List;
import java.util.UUID;

import com.odyio.marketplace.quotation.entity.QuotationRequestLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuotationRequestLineRepository extends JpaRepository<QuotationRequestLine, UUID> {

    List<QuotationRequestLine> findByQuotationRequestId(UUID quotationRequestId);

}
