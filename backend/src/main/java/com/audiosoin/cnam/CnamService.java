package com.audiosoin.cnam;

import com.audiosoin.client.Client;
import com.audiosoin.client.ClientRepository;
import com.audiosoin.config.ClinicConfig;
import com.audiosoin.config.ClinicConfigRepository;
import com.audiosoin.facturation.Facture;
import com.audiosoin.facturation.FactureRepository;
import com.audiosoin.tresorerie.TresorerieMouvement;
import com.audiosoin.tresorerie.TresorerieMouvementRepository;
import com.audiosoin.vente.BonLivraison;
import com.audiosoin.vente.BonLivraisonRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CnamService {

    private final CnamDemandeRepository demandeRepository;
    private final CnamDocumentRepository documentRepository;
    private final ClientRepository clientRepository;
    private final FactureRepository factureRepository;
    private final BonLivraisonRepository blRepository;
    private final ClinicConfigRepository configRepository;
    private final TresorerieMouvementRepository tresorerieRepository;

    public List<CnamDemande> findAll() { return demandeRepository.findAll(); }

    public CnamDemande findById(UUID id) {
        return demandeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("CNAM demande not found"));
    }

    public List<CnamDocument> getDocuments(UUID demandeId) {
        return documentRepository.findByDemandeId(demandeId);
    }

    @Transactional
    public CnamDemande create(UUID clientId, UUID factureId) {
        ClinicConfig config = configRepository.findFirstByOrderById()
                .orElseThrow(() -> new RuntimeException("Clinic not configured"));
        Client client = clientRepository.findById(clientId).orElseThrow();
        Facture facture = factureRepository.findById(factureId).orElseThrow();

        int year = LocalDate.now().getYear();
        if (config.getCurrentYear() != year) { config.setCurrentYear(year); config.setCnamSequence(1); }
        int seq = config.getCnamSequence();
        config.setCnamSequence(seq + 1);
        configRepository.save(config);

        CnamDemande demande = new CnamDemande();
        demande.setNumero(String.format("CNAM-%d-%04d", year, seq));
        demande.setClient(client);
        demande.setFacture(facture);
        demande.setStatus("DRAFT");
        demande.setMontantDemande(facture.getTotalTtc());
        demande.setCreatedAt(Instant.now());
        demande = demandeRepository.save(demande);

        // Create required documents checklist
        for (String type : List.of("ORDONNANCE", "AUDIOGRAMME", "FACTURE", "CARTE_NATIONALE", "CARTE_CNAM")) {
            CnamDocument doc = new CnamDocument();
            doc.setDemande(demande);
            doc.setDocumentType(type);
            doc.setRequired(true);
            doc.setUploaded(false);
            documentRepository.save(doc);
        }

        return demande;
    }

    @Transactional
    public CnamDocument uploadDocument(UUID demandeId, String documentType, String filePath) {
        CnamDemande demande = findById(demandeId);
        CnamDocument doc = new CnamDocument();
        doc.setDemande(demande);
        doc.setDocumentType(documentType);
        doc.setFilePath(filePath);
        doc.setRequired(true);
        doc.setUploaded(true);
        doc.setUploadedAt(Instant.now());
        return documentRepository.save(doc);
    }

    @Transactional
    public CnamDemande soumettre(UUID demandeId) {
        CnamDemande demande = findById(demandeId);
        List<CnamDocument> docs = documentRepository.findByDemandeId(demandeId);
        
        List<String> required = List.of("ORDONNANCE", "AUDIOGRAMME", "FACTURE", "CARTE_NATIONALE", "CARTE_CNAM");
        List<String> uploaded = docs.stream().filter(CnamDocument::isUploaded).map(CnamDocument::getDocumentType).toList();
        for (String r : required) {
            if (!uploaded.contains(r)) {
                throw new IllegalStateException("Document manquant: " + r);
            }
        }

        demande.setStatus("SOUMISE");
        demande.setDateSoumission(LocalDate.now());
        return demandeRepository.save(demande);
    }

    @Transactional
    public CnamDemande updateStatus(UUID id, String status, BigDecimal montantApprouve, String motifRejet) {
        CnamDemande demande = findById(id);
        demande.setStatus(status);
        if (montantApprouve != null) demande.setMontantApprouve(montantApprouve);
        if (motifRejet != null) demande.setMotifRejet(motifRejet);
        demande.setDateResolution(LocalDate.now());

        if ("APPROUVEE".equals(status) || "PAYEE".equals(status)) {
            TresorerieMouvement tm = new TresorerieMouvement();
            tm.setDateMouvement(LocalDate.now());
            tm.setType("RECETTE");
            tm.setCategorie("REMBOURSEMENT_CNAM");
            tm.setMontant(montantApprouve != null ? montantApprouve : demande.getMontantDemande());
            tm.setModePaiement("BON_ACHAT_CNAM");
            tm.setReferenceType("CNAM");
            tm.setReferenceId(id);
            tm.setDescription("Remboursement CNAM " + demande.getNumero());
            tm.setCreatedAt(Instant.now());
            tresorerieRepository.save(tm);
        }

        return demandeRepository.save(demande);
    }

    @Transactional
    public CnamDemande resoumettre(UUID id) {
        CnamDemande demande = findById(id);
        if (!"REJETEE".equals(demande.getStatus())) {
            throw new IllegalStateException("Seules les demandes rejetées peuvent être resoumises");
        }
        demande.setStatus("SOUMISE");
        demande.setDateSoumission(LocalDate.now());
        demande.setMotifRejet(null);
        return demandeRepository.save(demande);
    }

    public String getPdfContent(UUID id) {
        return "PDF placeholder for CNAM demande " + id;
    }
}
