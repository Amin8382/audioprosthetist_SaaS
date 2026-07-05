package com.audiosoin.fournisseur;

import com.audiosoin.stock.StockItem;
import com.audiosoin.stock.StockItemRepository;
import com.audiosoin.stock.StockMouvement;
import com.audiosoin.stock.StockMouvementRepository;
import com.audiosoin.tresorerie.TresorerieMouvement;
import com.audiosoin.tresorerie.TresorerieMouvementRepository;
import com.audiosoin.config.ClinicConfig;
import com.audiosoin.config.ClinicConfigRepository;
import com.audiosoin.user.User;
import com.audiosoin.user.UserRepository;
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
public class FournisseurService {

    private final FournisseurRepository fournisseurRepository;
    private final BonCommandeRepository bcRepository;
    private final BCLigneRepository bcLigneRepository;
    private final TicketReparationRepository ticketRepository;
    private final StockItemRepository stockItemRepository;
    private final StockMouvementRepository stockMouvementRepository;
    private final TresorerieMouvementRepository tresorerieRepository;
    private final ClinicConfigRepository configRepository;
    private final UserRepository userRepository;

    // Fournisseur CRUD
    public List<Fournisseur> findAll() { return fournisseurRepository.findAll(); }

    @Transactional
    public Fournisseur create(Fournisseur f) {
        f.setCreatedAt(Instant.now());
        return fournisseurRepository.save(f);
    }

    public Fournisseur findById(UUID id) {
        return fournisseurRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Fournisseur not found"));
    }

    @Transactional
    public Fournisseur update(UUID id, Fournisseur update) {
        Fournisseur f = findById(id);
        if (update.getName() != null) f.setName(update.getName());
        if (update.getContactName() != null) f.setContactName(update.getContactName());
        if (update.getPhone() != null) f.setPhone(update.getPhone());
        if (update.getEmail() != null) f.setEmail(update.getEmail());
        if (update.getAddress() != null) f.setAddress(update.getAddress());
        if (update.getNotes() != null) f.setNotes(update.getNotes());
        return fournisseurRepository.save(f);
    }

    // Bons de Commande
    public List<BonCommande> findAllBC() { return bcRepository.findAll(); }

    @Transactional
    public BonCommande createBC(BonCommande bc, List<BCLigne> lignes, UUID userId) {
        ClinicConfig config = configRepository.findFirstByOrderById()
                .orElseThrow(() -> new RuntimeException("Clinic not configured"));
        int year = LocalDate.now().getYear();
        if (config.getCurrentYear() != year) { config.setCurrentYear(year); config.setBcSequence(1); }
        int seq = config.getBcSequence();
        config.setBcSequence(seq + 1);
        configRepository.save(config);

        bc.setNumero(String.format("BC-%d-%04d", year, seq));
        bc.setStatus("DRAFT");
        bc.setCreatedBy(userRepository.getReferenceById(userId));
        bc.setCreatedAt(Instant.now());
        bc = bcRepository.save(bc);

        BigDecimal total = BigDecimal.ZERO;
        for (BCLigne ligne : lignes) {
            ligne.setBc(bc);
            total = total.add(ligne.getUnitPriceHt().multiply(BigDecimal.valueOf(ligne.getQuantity())));
            bcLigneRepository.save(ligne);
        }
        bc.setTotalHt(total);
        return bcRepository.save(bc);
    }

    @Transactional
    public BonCommande recevoirBC(UUID bcId) {
        BonCommande bc = bcRepository.findById(bcId).orElseThrow();
        bc.setStatus("RECU");
        bc = bcRepository.save(bc);

        List<BCLigne> lignes = bcLigneRepository.findByBcId(bcId);
        for (BCLigne ligne : lignes) {
            if (ligne.getStockItem() != null) {
                StockItem item = ligne.getStockItem();
                item.setQuantityInStock(item.getQuantityInStock() + ligne.getQuantity());
                stockItemRepository.save(item);

                StockMouvement mv = new StockMouvement();
                mv.setStockItem(item);
                mv.setType("ENTREE");
                mv.setQuantity(ligne.getQuantity());
                mv.setReferenceType("BC");
                mv.setReferenceId(bcId);
                mv.setDateMouvement(LocalDate.now());
                mv.setCreatedAt(Instant.now());
                stockMouvementRepository.save(mv);
            }
        }

        TresorerieMouvement tm = new TresorerieMouvement();
        tm.setDateMouvement(LocalDate.now());
        tm.setType("DEPENSE");
        tm.setCategorie("ACHAT_STOCK");
        tm.setMontant(bc.getTotalHt());
        tm.setModePaiement("VIREMENT");
        tm.setReferenceType("BC");
        tm.setReferenceId(bcId);
        tm.setDescription("Réception BC " + bc.getNumero());
        tm.setCreatedAt(Instant.now());
        tresorerieRepository.save(tm);

        return bc;
    }

    // Tickets Reparation
    public List<TicketReparation> findAllTickets() { return ticketRepository.findAll(); }

    @Transactional
    public TicketReparation createTicket(TicketReparation ticket) {
        ticket.setStatus("OUVERT");
        ticket.setCreatedAt(Instant.now());
        return ticketRepository.save(ticket);
    }

    @Transactional
    public TicketReparation updateTicketStatus(UUID id, String newStatus) {
        TicketReparation ticket = ticketRepository.findById(id).orElseThrow();
        ticket.setStatus(newStatus);

        if ("ENVOYE_FOURNISSEUR".equals(newStatus)) {
            ticket.setDateEnvoi(LocalDate.now());
            if (ticket.getStockItem() != null) {
                StockItem item = ticket.getStockItem();
                item.setQuantityInStock(item.getQuantityInStock() - 1);
                stockItemRepository.save(item);
                StockMouvement mv = new StockMouvement();
                mv.setStockItem(item); mv.setType("REPARATION"); mv.setQuantity(1);
                mv.setReferenceType("TICKET_REP"); mv.setReferenceId(id);
                mv.setDateMouvement(LocalDate.now()); mv.setCreatedAt(Instant.now());
                stockMouvementRepository.save(mv);
            }
        }
        if ("RETOURNE".equals(newStatus) || "CLOS".equals(newStatus)) {
            ticket.setDateRetourReel(LocalDate.now());
            if (ticket.getStockItem() != null) {
                StockItem item = ticket.getStockItem();
                item.setQuantityInStock(item.getQuantityInStock() + 1);
                stockItemRepository.save(item);
                StockMouvement mv = new StockMouvement();
                mv.setStockItem(item); mv.setType("RETOUR"); mv.setQuantity(1);
                mv.setReferenceType("TICKET_REP"); mv.setReferenceId(id);
                mv.setDateMouvement(LocalDate.now()); mv.setCreatedAt(Instant.now());
                stockMouvementRepository.save(mv);
            }
        }
        return ticketRepository.save(ticket);
    }
}
