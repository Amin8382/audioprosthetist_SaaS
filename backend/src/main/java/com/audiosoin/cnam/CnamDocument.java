package com.audiosoin.cnam;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "cnam_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CnamDocument {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne @JoinColumn(name = "demande_id")
    private CnamDemande demande;
    @Column(name = "document_type")
    private String documentType;
    @Column(name = "file_path")
    private String filePath;
    @Column(name = "extracted_data")
    @JdbcTypeCode(SqlTypes.JSON)
    private String extractedData;
    @Column(name = "is_required")
    private boolean isRequired;
    @Column(name = "is_uploaded")
    private boolean isUploaded;
    @Column(name = "uploaded_at")
    private Instant uploadedAt;
}
