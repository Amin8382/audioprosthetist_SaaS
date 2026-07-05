CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('ADMIN','STAFF','DOCTOR')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    national_id VARCHAR(20),
    cnam_number VARCHAR(20),
    cnam_affiliation_type VARCHAR(20) CHECK (cnam_affiliation_type IN ('CNAM_ACTIVE','CNAM_RETIRED','PRIVATE','NONE')),
    cnam_expiry DATE,
    phone VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    audiogram_left JSONB,
    audiogram_right JSONB,
    ear_side VARCHAR(10) CHECK (ear_side IN ('LEFT','RIGHT','BILATERAL')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    website VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(100) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    category VARCHAR(30) CHECK (category IN ('APPAREIL_AUDITIF','ACCESSOIRE','PILE','EMBOUT','AUTRE')),
    fournisseur_id UUID REFERENCES fournisseurs(id),
    unit_price_ht DECIMAL(10,2),
    tva_rate DECIMAL(5,2) DEFAULT 19.0,
    quantity_in_stock INT DEFAULT 0,
    quantity_minimum INT DEFAULT 0,
    ear_side VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bons_livraison (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    date_bl DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(20) CHECK (type IN ('CONSULTATION','APPAREIL','ACCESSOIRE','AUTRE')),
    status VARCHAR(20) CHECK (status IN ('DRAFT','CONFIRMED','INVOICED')) DEFAULT 'DRAFT',
    total_ht DECIMAL(10,2) DEFAULT 0,
    tva_rate DECIMAL(5,2) DEFAULT 19.0,
    total_ttc DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bl_lignes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bl_id UUID REFERENCES bons_livraison(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id),
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price_ht DECIMAL(10,2) NOT NULL,
    tva_rate DECIMAL(5,2) DEFAULT 19.0,
    total_ht DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price_ht) STORED,
    ear_side VARCHAR(10)
);

CREATE TABLE factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    date_facture DATE NOT NULL DEFAULT CURRENT_DATE,
    date_echeance DATE,
    status VARCHAR(20) CHECK (status IN ('DRAFT','EMISE','PARTIELLEMENT_PAYEE','PAYEE','ANNULEE')) DEFAULT 'DRAFT',
    total_ht DECIMAL(10,2) DEFAULT 0,
    tva_rate DECIMAL(5,2) DEFAULT 19.0,
    montant_tva DECIMAL(10,2) DEFAULT 0,
    total_ttc DECIMAL(10,2) DEFAULT 0,
    montant_paye DECIMAL(10,2) DEFAULT 0,
    reste_a_payer DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    last_edited_at TIMESTAMP,
    last_edited_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE facture_bls (
    facture_id UUID REFERENCES factures(id) ON DELETE CASCADE,
    bl_id UUID REFERENCES bons_livraison(id),
    PRIMARY KEY (facture_id, bl_id)
);

CREATE TABLE paiements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facture_id UUID REFERENCES factures(id),
    montant DECIMAL(10,2) NOT NULL,
    mode_paiement VARCHAR(30) CHECK (mode_paiement IN ('ESPECES','VIREMENT','BON_ACHAT_CNAM')),
    reference VARCHAR(100),
    date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bons_commande (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) UNIQUE NOT NULL,
    fournisseur_id UUID REFERENCES fournisseurs(id),
    date_commande DATE DEFAULT CURRENT_DATE,
    date_livraison_prevue DATE,
    status VARCHAR(20) CHECK (status IN ('DRAFT','ENVOYE','RECU','ANNULE')) DEFAULT 'DRAFT',
    total_ht DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bc_lignes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bc_id UUID REFERENCES bons_commande(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id),
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price_ht DECIMAL(10,2),
    total_ht DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price_ht) STORED
);

CREATE TABLE tickets_reparation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) UNIQUE,
    client_id UUID REFERENCES clients(id),
    fournisseur_id UUID REFERENCES fournisseurs(id),
    stock_item_id UUID REFERENCES stock_items(id),
    description_panne TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('OUVERT','ENVOYE_FOURNISSEUR','EN_REPARATION','RETOURNE','CLOS')) DEFAULT 'OUVERT',
    date_envoi DATE,
    date_retour_prevue DATE,
    date_retour_reel DATE,
    cout_reparation DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_mouvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id),
    type VARCHAR(20) CHECK (type IN ('ENTREE','SORTIE','RETOUR','REPARATION')),
    quantity INT NOT NULL,
    reference_type VARCHAR(20),
    reference_id UUID,
    date_mouvement DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tresorerie_mouvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_mouvement DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(10) CHECK (type IN ('RECETTE','DEPENSE')),
    categorie VARCHAR(50) CHECK (categorie IN (
        'PAIEMENT_FACTURE','REMBOURSEMENT_CNAM','AUTRE_RECETTE',
        'ACHAT_STOCK','LOYER','SALAIRE','CHARGES','REPARATION','AUTRE_DEPENSE'
    )),
    montant DECIMAL(10,2) NOT NULL,
    mode_paiement VARCHAR(30) CHECK (mode_paiement IN ('ESPECES','VIREMENT','BON_ACHAT_CNAM')),
    reference_type VARCHAR(20),
    reference_id UUID,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cnam_demandes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) UNIQUE,
    client_id UUID REFERENCES clients(id),
    facture_id UUID REFERENCES factures(id),
    bl_id UUID REFERENCES bons_livraison(id),
    status VARCHAR(20) CHECK (status IN ('DRAFT','SOUMISE','EN_COURS','APPROUVEE','REJETEE','PAYEE')) DEFAULT 'DRAFT',
    montant_demande DECIMAL(10,2),
    montant_approuve DECIMAL(10,2),
    motif_rejet TEXT,
    success_probability FLOAT,
    shap_explanation JSONB,
    date_soumission DATE,
    date_resolution DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cnam_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demande_id UUID REFERENCES cnam_demandes(id),
    document_type VARCHAR(30) CHECK (document_type IN ('ORDONNANCE','AUDIOGRAMME','FACTURE','CARTE_NATIONALE','CARTE_CNAM','AUTRE')),
    file_path VARCHAR(500),
    extracted_data JSONB,
    is_required BOOLEAN DEFAULT true,
    is_uploaded BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP
);

CREATE TABLE clinic_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_path VARCHAR(500),
    tva_number VARCHAR(50),
    facture_prefix VARCHAR(10) DEFAULT 'FAC',
    bl_prefix VARCHAR(10) DEFAULT 'BL',
    bc_prefix VARCHAR(10) DEFAULT 'BC',
    cnam_prefix VARCHAR(10) DEFAULT 'CNAM',
    facture_sequence INT DEFAULT 1,
    bl_sequence INT DEFAULT 1,
    bc_sequence INT DEFAULT 1,
    cnam_sequence INT DEFAULT 1,
    current_year INT DEFAULT 2025,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    owner_type VARCHAR(50),
    file_path VARCHAR(500),
    document_type VARCHAR(50),
    extracted_data JSONB,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    channel VARCHAR(50),
    type VARCHAR(50),
    content TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

CREATE INDEX idx_clients_code ON clients(code);
CREATE INDEX idx_clients_cnam ON clients(cnam_number);
CREATE INDEX idx_fournisseurs_code ON fournisseurs(code);
CREATE INDEX idx_stock_items_reference ON stock_items(reference);
CREATE INDEX idx_stock_items_category ON stock_items(category);
CREATE INDEX idx_bls_numero ON bons_livraison(numero);
CREATE INDEX idx_bls_client ON bons_livraison(client_id);
CREATE INDEX idx_bls_status ON bons_livraison(status);
CREATE INDEX idx_factures_numero ON factures(numero);
CREATE INDEX idx_factures_client ON factures(client_id);
CREATE INDEX idx_factures_status ON factures(status);
CREATE INDEX idx_paiements_facture ON paiements(facture_id);
CREATE INDEX idx_bc_numero ON bons_commande(numero);
CREATE INDEX idx_bc_fournisseur ON bons_commande(fournisseur_id);
CREATE INDEX idx_bc_status ON bons_commande(status);
CREATE INDEX idx_tickets_client ON tickets_reparation(client_id);
CREATE INDEX idx_tickets_status ON tickets_reparation(status);
CREATE INDEX idx_stock_mouvements_item ON stock_mouvements(stock_item_id);
CREATE INDEX idx_stock_mouvements_reference ON stock_mouvements(reference_type, reference_id);
CREATE INDEX idx_tresorerie_date ON tresorerie_mouvements(date_mouvement);
CREATE INDEX idx_tresorerie_type ON tresorerie_mouvements(type);
CREATE INDEX idx_cnam_numero ON cnam_demandes(numero);
CREATE INDEX idx_cnam_client ON cnam_demandes(client_id);
CREATE INDEX idx_cnam_status ON cnam_demandes(status);
CREATE INDEX idx_cnam_documents_demande ON cnam_documents(demande_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);
