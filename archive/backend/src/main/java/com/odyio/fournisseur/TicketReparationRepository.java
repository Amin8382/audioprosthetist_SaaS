package com.odyio.fournisseur;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TicketReparationRepository extends JpaRepository<TicketReparation, UUID> {
}
