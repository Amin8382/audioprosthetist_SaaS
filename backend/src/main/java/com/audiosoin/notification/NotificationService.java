package com.audiosoin.notification;

import com.audiosoin.user.UserRepository;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public Notification sendNotification(UUID userId, NotificationChannel channel, String type, String content) {
        Notification notification = new Notification();
        notification.setUser(userRepository.getReferenceById(userId));
        notification.setChannel(channel);
        notification.setType(type);
        notification.setContent(content);
        notification.setSentAt(Instant.now());
        return notificationRepository.save(notification);
    }

    public Page<Notification> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderBySentAtDesc(userId, pageable);
    }
}
