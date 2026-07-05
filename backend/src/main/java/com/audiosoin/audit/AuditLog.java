package com.audiosoin.audit;

import com.audiosoin.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "user_id")
    private User user;
    private String action;
    @Column(name = "entity_type")
    private String entityType;
    @Column(name = "entity_id")
    private UUID entityId;
    @Column(name = "old_value")
    @JdbcTypeCode(SqlTypes.JSON)
    private String oldValue;
    @Column(name = "new_value")
    @JdbcTypeCode(SqlTypes.JSON)
    private String newValue;
    @Column(name = "ip_address")
    private String ipAddress;
    private Instant timestamp;
}
