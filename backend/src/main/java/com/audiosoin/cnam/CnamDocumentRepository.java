package com.audiosoin.cnam;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CnamDocumentRepository extends JpaRepository<CnamDocument, UUID> {
    List<CnamDocument> findByDemandeId(UUID demandeId);
}
