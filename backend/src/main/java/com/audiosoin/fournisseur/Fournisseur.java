package com.audiosoin.fournisseur;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "fournisseurs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Fournisseur {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String code;
    private String name;
    @Column(name = "contact_name")
    private String contactName;
    private String phone;
    private String email;
    @Column(columnDefinition = "TEXT")
    private String address;
    private String website;
    @Column(columnDefinition = "TEXT")
    private String notes;
    @Column(name = "created_at")
    private Instant createdAt;
}
