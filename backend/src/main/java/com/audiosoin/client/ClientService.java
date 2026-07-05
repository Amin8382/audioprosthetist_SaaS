package com.audiosoin.client;

import com.audiosoin.config.ClinicConfig;
import com.audiosoin.config.ClinicConfigRepository;
import com.audiosoin.vente.BonLivraison;
import com.audiosoin.vente.BonLivraisonRepository;
import com.audiosoin.facturation.Facture;
import com.audiosoin.facturation.FactureRepository;
import com.audiosoin.cnam.CnamDemande;
import com.audiosoin.cnam.CnamDemandeRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final BonLivraisonRepository blRepository;
    private final FactureRepository factureRepository;
    private final CnamDemandeRepository cnamRepository;
    private final ClinicConfigRepository configRepository;

    @Transactional
    public Client create(Client client) {
        ClinicConfig config = configRepository.findFirstByOrderById()
                .orElseThrow(() -> new RuntimeException("Clinic not configured"));
        long count = clientRepository.count();
        client.setCode(String.format("CLT-%04d", count + 1));
        client.setCreatedAt(Instant.now());
        client.setUpdatedAt(Instant.now());
        return clientRepository.save(client);
    }

    public Page<Client> findAll(String search, Pageable pageable) {
        if (search != null && !search.isEmpty()) {
            return clientRepository.findByFullNameContainingIgnoreCase(search, pageable);
        }
        return clientRepository.findAll(pageable);
    }

    public Client findById(UUID id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
    }

    @Transactional
    public Client update(UUID id, Client update) {
        Client client = findById(id);
        if (update.getFullName() != null) client.setFullName(update.getFullName());
        if (update.getDateOfBirth() != null) client.setDateOfBirth(update.getDateOfBirth());
        if (update.getNationalId() != null) client.setNationalId(update.getNationalId());
        if (update.getCnamNumber() != null) client.setCnamNumber(update.getCnamNumber());
        if (update.getCnamAffiliationType() != null) client.setCnamAffiliationType(update.getCnamAffiliationType());
        if (update.getCnamExpiry() != null) client.setCnamExpiry(update.getCnamExpiry());
        if (update.getPhone() != null) client.setPhone(update.getPhone());
        if (update.getAddress() != null) client.setAddress(update.getAddress());
        if (update.getEmail() != null) client.setEmail(update.getEmail());
        if (update.getAudiogramLeft() != null) client.setAudiogramLeft(update.getAudiogramLeft());
        if (update.getAudiogramRight() != null) client.setAudiogramRight(update.getAudiogramRight());
        if (update.getEarSide() != null) client.setEarSide(update.getEarSide());
        if (update.getNotes() != null) client.setNotes(update.getNotes());
        client.setUpdatedAt(Instant.now());
        return clientRepository.save(client);
    }

    public Map<String, Object> getHistorique(UUID clientId) {
        Client client = findById(clientId);
        List<BonLivraison> bls = blRepository.findByClientIdAndStatus(clientId, "CONFIRMED");
        Page<Facture> factures = factureRepository.findByClientIdOrderByCreatedAtDesc(clientId, Pageable.unpaged());
        List<CnamDemande> cnam = cnamRepository.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("client", client);
        result.put("bls", bls);
        result.put("factures", factures.getContent());
        result.put("cnam", cnam.stream().filter(c -> c.getClient().getId().equals(clientId)).toList());
        return result;
    }
}
