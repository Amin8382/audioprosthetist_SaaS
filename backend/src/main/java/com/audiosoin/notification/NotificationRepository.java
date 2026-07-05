package com.audiosoin.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUserIdOrderBySentAtDesc(UUID userId, Pageable pageable);
    List<Notification> findByUserIdAndReadAtIsNull(UUID userId);
}
