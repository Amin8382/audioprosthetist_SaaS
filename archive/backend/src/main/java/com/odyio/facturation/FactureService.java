package com.odyio.facturation;

import com.odyio.audit.AuditLog;
import com.odyio.audit.AuditLogRepository;
import com.odyio.client.Client;
import com.odyio.client.ClientRepository;
import com.odyio.config.ClinicConfig;
import com.odyio.config.ClinicConfigRepository;
import com.odyio.pdf.PdfService;
import com.odyio.tresorerie.TresorerieMouvement;
import com.odyio.tresorerie.TresorerieMouvementRepository;
import com.odyio.user.User;
import com.odyio.user.UserRepository;
import com.odyio.vente.BonLivraison;
import com.odyio.vente.BonLivraisonRepository;
import com.odyio.vente.BLLigne;
import com.odyio.vente.BLLigneRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FactureService {

    private final FactureRepository factureRepository;
    private final FactureBLRepository factureBLRepository;
    private final PaiementRepository paiementRepository;
    private final BLLigneRepository blLigneRepository;
    private final BonLivraisonRepository blRepository;
    private final ClientRepository clientRepository;
    private final ClinicConfigRepository configRepository;
    private final TresorerieMouvementRepository tresorerieRepository;
    private final PdfService pdfService;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public Page<Facture> findAll(Pageable pageable) {
        return factureRepository.findAll(pageable);
    }

    public Facture findById(UUID id) {
        return factureRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Facture not found"));
    }

    public List<Paiement> getPaiements(UUID factureId) {
        return paiementRepository.findByFactureId(factureId);
    }

    @Transactional
    public Facture createFromBLs(UUID clientId, List<UUID> blIds, UUID userId) {
        ClinicConfig config = configRepository.findFirstByOrderById()
                .orElseThrow(() -> new RuntimeException("Clinic not configured"));
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));

        int year = LocalDate.now().getYear();
        if (config.getCurrentYear() != year) {
            config.setCurrentYear(year);
            config.setFactureSequence(1);
        }
        int seq = config.getFactureSequence();
        config.setFactureSequence(seq + 1);
        configRepository.save(config);

        Facture facture = new Facture();
        facture.setNumero(String.format("FAC-%d-%04d", year, seq));
        facture.setClient(client);
        facture.setDateFacture(LocalDate.now());
        facture.setDateEcheance(LocalDate.now().plusDays(30));
        facture.setStatus("EMISE");
        facture.setMontantPaye(BigDecimal.ZERO);
        facture.setCreatedBy(userRepository.getReferenceById(userId));
        facture.setCreatedAt(Instant.now());

        facture = factureRepository.save(facture);

        BigDecimal totalHt = BigDecimal.ZERO;
        for (UUID blId : blIds) {
            BonLivraison bl = blRepository.findById(blId)
                    .orElseThrow(() -> new IllegalArgumentException("BL not found: " + blId));
            totalHt = totalHt.add(bl.getTotalHt() != null ? bl.getTotalHt() : BigDecimal.ZERO);
            bl.setStatus("INVOICED");
            blRepository.save(bl);

            FactureBL fbl = new FactureBL();
            fbl.setFacture(facture);
            fbl.setBl(bl);
            factureBLRepository.save(fbl);
        }

        facture.setTotalHt(totalHt);
        BigDecimal tvaRate = new BigDecimal("19.0");
        BigDecimal tva = totalHt.multiply(tvaRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        facture.setMontantTva(tva);
        facture.setTotalTtc(totalHt.add(tva));
        facture.setResteAPayer(totalHt.add(tva));
        return factureRepository.save(facture);
    }

    @Transactional
    public Facture update(UUID id, Facture update, UUID userId) {
        Facture facture = findById(id);
        if ("ANNULEE".equals(facture.getStatus())) {
            throw new IllegalStateException("Cannot edit a cancelled invoice");
        }

        String oldJson = String.format(
            "{\"total_ht\":%s,\"total_ttc\":%s,\"status\":\"%s\"}",
            facture.getTotalHt(), facture.getTotalTtc(), facture.getStatus()
        );

        if (update.getTotalHt() != null) facture.setTotalHt(update.getTotalHt());
        if (update.getTotalTtc() != null) facture.setTotalTtc(update.getTotalTtc());
        if (update.getTvaRate() != null) facture.setTvaRate(update.getTvaRate());
        if (update.getNotes() != null) facture.setNotes(update.getNotes());
        facture.setLastEditedAt(Instant.now());
        facture.setLastEditedBy(userRepository.getReferenceById(userId));

        String newJson = String.format(
            "{\"total_ht\":%s,\"total_ttc\":%s,\"status\":\"%s\"}",
            facture.getTotalHt(), facture.getTotalTtc(), facture.getStatus()
        );

        AuditLog log = AuditLog.builder()
                .entityType("FACTURE")
                .entityId(id)
                .action("EDIT")
                .oldValue(oldJson)
                .newValue(newJson)
                .timestamp(Instant.now())
                .build();
        auditLogRepository.save(log);

        return factureRepository.save(facture);
    }

    @Transactional
    public Paiement addPaiement(UUID factureId, Paiement paiement, UUID userId) {
        Facture facture = findById(factureId);
        if ("ANNULEE".equals(facture.getStatus())) {
            throw new IllegalStateException("Cannot pay a cancelled invoice");
        }

        paiement.setFacture(facture);
        paiement.setCreatedBy(userRepository.getReferenceById(userId));
        paiement.setCreatedAt(Instant.now());
        paiement = paiementRepository.save(paiement);

        BigDecimal totalPaye = facture.getMontantPaye().add(paiement.getMontant());
        facture.setMontantPaye(totalPaye);
        facture.setResteAPayer(facture.getTotalTtc().subtract(totalPaye));

        if (totalPaye.compareTo(BigDecimal.ZERO) > 0 && totalPaye.compareTo(facture.getTotalTtc()) < 0) {
            facture.setStatus("PARTIELLEMENT_PAYEE");
        } else if (totalPaye.compareTo(facture.getTotalTtc()) >= 0) {
            facture.setStatus("PAYEE");
            facture.setResteAPayer(BigDecimal.ZERO);
        }
        factureRepository.save(facture);

        TresorerieMouvement tm = new TresorerieMouvement();
        tm.setDateMouvement(paiement.getDatePaiement() != null ? paiement.getDatePaiement() : LocalDate.now());
        tm.setType("RECETTE");
        tm.setCategorie("PAIEMENT_FACTURE");
        tm.setMontant(paiement.getMontant());
        tm.setModePaiement(paiement.getModePaiement());
        tm.setReferenceType("FACTURE");
        tm.setReferenceId(factureId);
        tm.setDescription("Paiement facture " + facture.getNumero());
        tm.setCreatedBy(userId);
        tm.setCreatedAt(Instant.now());
        tresorerieRepository.save(tm);

        return paiement;
    }

    @Transactional
    public Facture annuler(UUID id) {
        Facture facture = findById(id);
        facture.setStatus("ANNULEE");
        return factureRepository.save(facture);
    }

    public byte[] getPdfContent(UUID id) {
        Facture facture = findById(id);
        List<Paiement> paiements = getPaiements(id);
        return pdfService.generateFacturePdf(facture, paiements);
    }
}
