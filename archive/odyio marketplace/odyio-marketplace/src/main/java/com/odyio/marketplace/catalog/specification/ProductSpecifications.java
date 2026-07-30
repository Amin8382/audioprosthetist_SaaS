package com.odyio.marketplace.catalog.specification;

import java.util.Locale;
import java.util.UUID;

import com.odyio.marketplace.catalog.entity.Product;
import com.odyio.marketplace.common.enums.EarSide;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> withFilters(
            String search,
            UUID supplierId,
            UUID categoryId,
            EarSide earSide,
            Boolean available,
            Boolean active
    ) {
        return Specification
                .where(matchesSearch(search))
                .and(hasSupplierId(supplierId))
                .and(hasCategoryId(categoryId))
                .and(hasEarSide(earSide))
                .and(hasAvailable(available))
                .and(hasActive(active));
    }

    private static Specification<Product> matchesSearch(String search) {
        return (root, query, criteriaBuilder) -> {
            if (!StringUtils.hasText(search)) {
                return criteriaBuilder.conjunction();
            }

            String pattern = "%" + search.toLowerCase(Locale.ROOT).trim() + "%";
            return criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("brand")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("model")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("reference")), pattern)
            );
        };
    }

    private static Specification<Product> hasSupplierId(UUID supplierId) {
        return (root, query, criteriaBuilder) -> supplierId == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.get("supplier").get("id"), supplierId);
    }

    private static Specification<Product> hasCategoryId(UUID categoryId) {
        return (root, query, criteriaBuilder) -> categoryId == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.get("category").get("id"), categoryId);
    }

    private static Specification<Product> hasEarSide(EarSide earSide) {
        return (root, query, criteriaBuilder) -> earSide == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.get("earSide"), earSide);
    }

    private static Specification<Product> hasAvailable(Boolean available) {
        return (root, query, criteriaBuilder) -> available == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.get("available"), available);
    }

    private static Specification<Product> hasActive(Boolean active) {
        return (root, query, criteriaBuilder) -> active == null
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.equal(root.get("active"), active);
    }

}
