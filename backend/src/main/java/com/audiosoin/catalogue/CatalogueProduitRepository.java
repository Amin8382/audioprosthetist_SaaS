package com.audiosoin.catalogue;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CatalogueProduitRepository extends JpaRepository<CatalogueProduit, UUID> {
    List<CatalogueProduit> findByFournisseurIdOrderByNomProduit(UUID fournisseurId);
    List<CatalogueProduit> findByIsAvailableTrueOrderByNomProduit();
    List<CatalogueProduit> findByIsAvailableTrueAndCategorieOrderByNomProduit(String categorie);
    List<CatalogueProduit> findByIsAvailableTrueAndFournisseurIdOrderByNomProduit(UUID fournisseurId);
}
