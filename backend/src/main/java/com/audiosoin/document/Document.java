package com.audiosoin.document;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Document {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "owner_id")
    private UUID ownerId;
    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type")
    private OwnerType ownerType;
    @Column(name = "file_path")
    private String filePath;
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type")
    private DocumentType documentType;
    @Column(name = "extracted_data")
    @JdbcTypeCode(SqlTypes.JSON)
    private String extractedData;
    @Column(name = "uploaded_at")
    private Instant uploadedAt;
}
