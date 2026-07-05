CREATE TABLE catalogue_produits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fournisseur_id UUID REFERENCES fournisseurs(id),
    nom_produit VARCHAR(255) NOT NULL,
    reference_fournisseur VARCHAR(100),
    categorie VARCHAR(30) CHECK (categorie IN ('APPAREIL_AUDITIF','ACCESSOIRE','PILE','EMBOUT','AUTRE')),
    prix_unitaire_ht DECIMAL(10,2),
    tva_rate DECIMAL(5,2) DEFAULT 19.0,
    ear_side VARCHAR(10),
    image_path VARCHAR(500),
    is_available BOOLEAN DEFAULT true,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE bons_commande DROP CONSTRAINT IF EXISTS bons_commande_status_check;
ALTER TABLE bons_commande ADD CONSTRAINT bons_commande_status_check
    CHECK (status IN ('DRAFT','ENVOYE','RECU','LIVRE','ANNULE'));

ALTER TABLE bc_lignes ADD COLUMN IF NOT EXISTS catalogue_produit_id UUID REFERENCES catalogue_produits(id);

CREATE INDEX idx_catalogue_fournisseur ON catalogue_produits(fournisseur_id);
CREATE INDEX idx_catalogue_categorie ON catalogue_produits(categorie);
CREATE INDEX idx_catalogue_dispo ON catalogue_produits(is_available);
CREATE INDEX idx_bons_commande_fournisseur ON bons_commande(fournisseur_id);
