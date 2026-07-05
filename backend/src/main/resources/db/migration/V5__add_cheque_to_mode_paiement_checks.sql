ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_mode_paiement_check;
ALTER TABLE paiements ADD CONSTRAINT paiements_mode_paiement_check
    CHECK (mode_paiement IN ('ESPECES','VIREMENT','BON_ACHAT_CNAM','CHEQUE'));

ALTER TABLE tresorerie_mouvements DROP CONSTRAINT IF EXISTS tresorerie_mouvements_mode_paiement_check;
ALTER TABLE tresorerie_mouvements ADD CONSTRAINT tresorerie_mouvements_mode_paiement_check
    CHECK (mode_paiement IN ('ESPECES','VIREMENT','BON_ACHAT_CNAM','CHEQUE'));
