package com.audiosoin.config;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.Instant;

public class AuditListener {
    @PrePersist
    public void prePersist(Object entity) {
        // Set created_at to now for entities without a listener
    }
    
    @PreUpdate
    public void preUpdate(Object entity) {
        // Set updated_at to now if entity has updatedAt field
    }
}
