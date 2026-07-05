package com.audiosoin.catalogue;

import com.audiosoin.fournisseur.Fournisseur;
import com.audiosoin.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "catalogue_produits")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CatalogueProduit {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "fournisseur_id")
    private Fournisseur fournisseur;
    @Column(name = "nom_produit")
    private String nomProduit;
    @Column(name = "reference_fournisseur")
    private String referenceFournisseur;
    private String categorie;
    @Column(name = "prix_unitaire_ht")
    private BigDecimal prixUnitaireHt;
    @Column(name = "tva_rate")
    private BigDecimal tvaRate;
    @Column(name = "ear_side")
    private String earSide;
    @Column(name = "image_path")
    private String imagePath;
    @Column(name = "is_available")
    private Boolean isAvailable;
    @Column(columnDefinition = "TEXT")
    private String description;
    @ManyToOne @JoinColumn(name = "created_by")
    private User createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
}
