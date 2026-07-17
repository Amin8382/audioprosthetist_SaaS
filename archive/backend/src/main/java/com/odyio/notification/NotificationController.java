package com.odyio.notification;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/notify")
    public ResponseEntity<Notification> sendNotification(@RequestBody Notification request) {
        return ResponseEntity.ok(
            notificationService.sendNotification(
                request.getUser().getId(),
                request.getChannel(),
                request.getType(),
                request.getContent()
            )
        );
    }
}
