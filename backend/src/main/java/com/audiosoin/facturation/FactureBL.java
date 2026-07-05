package com.audiosoin.facturation;

import com.audiosoin.vente.BonLivraison;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "facture_bls")
@IdClass(FactureBL.FactureBLId.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class FactureBL {
    @Id @ManyToOne @JoinColumn(name = "facture_id")
    private Facture facture;
    @Id @ManyToOne @JoinColumn(name = "bl_id")
    private BonLivraison bl;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class FactureBLId implements java.io.Serializable {
        private java.util.UUID facture;
        private java.util.UUID bl;
    }
}
