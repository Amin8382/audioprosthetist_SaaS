package com.audiosoin.config;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "clinic_config")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ClinicConfig {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "clinic_name")
    private String clinicName;
    @Column(columnDefinition = "TEXT")
    private String address;
    private String phone;
    private String email;
    @Column(name = "logo_path")
    private String logoPath;
    @Column(name = "tva_number")
    private String tvaNumber;
    @Column(name = "facture_prefix")
    private String facturePrefix;
    @Column(name = "bl_prefix")
    private String blPrefix;
    @Column(name = "bc_prefix")
    private String bcPrefix;
    @Column(name = "cnam_prefix")
    private String cnamPrefix;
    @Column(name = "facture_sequence")
    private int factureSequence;
    @Column(name = "bl_sequence")
    private int blSequence;
    @Column(name = "bc_sequence")
    private int bcSequence;
    @Column(name = "cnam_sequence")
    private int cnamSequence;
    @Column(name = "current_year")
    private int currentYear;
    @Column(name = "updated_at")
    private Instant updatedAt;
}
