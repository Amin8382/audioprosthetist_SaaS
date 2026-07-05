CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    owner_type VARCHAR(50),
    file_path VARCHAR(500),
    document_type VARCHAR(50),
    extracted_data JSONB,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_type, owner_id);
