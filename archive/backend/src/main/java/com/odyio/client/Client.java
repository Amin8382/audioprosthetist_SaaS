package com.odyio.client;

import com.odyio.config.AuditListener;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "clients")
@EntityListeners(AuditListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Client {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String code;
    @Column(name = "full_name")
    private String fullName;
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
    @Column(name = "national_id")
    private String nationalId;
    private String phone;
    @Column(columnDefinition = "TEXT")
    private String address;
    private String email;
    @Column(name = "audiogram_left")
    @JdbcTypeCode(SqlTypes.JSON)
    private String audiogramLeft;
    @Column(name = "audiogram_right")
    @JdbcTypeCode(SqlTypes.JSON)
    private String audiogramRight;
    @Column(name = "ear_side")
    private String earSide;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "noah_patient_id")
    private String noahPatientId;
    @Column(name = "noah_sync_status")
    private String noahSyncStatus;
    @Column(name = "noah_last_sync")
    private Instant noahLastSync;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
}
