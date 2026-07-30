package com.odyio.marketplace.order.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.odyio.marketplace.common.enums.OrderStatus;
import com.odyio.marketplace.order.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    boolean existsBySupplierOfferId(UUID supplierOfferId);

    Optional<Order> findBySupplierOfferId(UUID supplierOfferId);

    List<Order> findBySupplierOfferIdIn(Collection<UUID> supplierOfferIds);

    List<Order> findByClinicIdOrderByCreatedAtDesc(UUID clinicId);

    List<Order> findByClinicIdAndStatusOrderByCreatedAtDesc(UUID clinicId, OrderStatus status);

    List<Order> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);

    List<Order> findBySupplierIdAndStatusOrderByCreatedAtDesc(UUID supplierId, OrderStatus status);

    Optional<Order> findByIdAndClinicId(UUID id, UUID clinicId);

    Optional<Order> findByIdAndSupplierId(UUID id, UUID supplierId);

    @Query(value = "select nextval('marketplace_order_number_seq')", nativeQuery = true)
    long nextOrderNumberValue();

}
