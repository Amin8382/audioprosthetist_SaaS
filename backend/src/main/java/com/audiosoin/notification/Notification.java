package com.audiosoin.notification;

import com.audiosoin.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "user_id")
    private User user;
    @Enumerated(EnumType.STRING)
    private NotificationChannel channel;
    @Column(length = 50)
    private String type;
    @Column(columnDefinition = "TEXT")
    private String content;
    @Column(name = "sent_at")
    private Instant sentAt;
    @Column(name = "read_at")
    private Instant readAt;
}
