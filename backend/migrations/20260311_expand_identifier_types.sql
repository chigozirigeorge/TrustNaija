-- Expand identifier types to include banking, companies, and social media

-- Add new identifier types
-- Note: PostgreSQL ENUMs can't be modified directly, so we keep VARCHAR type
-- The application code handles the new types through Rust enums

-- Update identifiers table to ensure it handles all new types
-- (no schema changes needed since we're using VARCHAR)

-- Add index for faster lookups by type and risk_score
CREATE INDEX IF NOT EXISTS idx_identifiers_type_risk ON identifiers(identifier_type, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_identifiers_type_created ON identifiers(identifier_type, created_at DESC);

-- Add index for social media lookups
CREATE INDEX IF NOT EXISTS idx_identifiers_social_media ON identifiers(identifier_type) 
WHERE identifier_type IN ('twitter', 'instagram', 'tiktok', 'facebook', 'whatsapp', 'telegram', 'linkedin');

-- Add index for banking/company lookups
CREATE INDEX IF NOT EXISTS idx_identifiers_financial ON identifiers(identifier_type)
WHERE identifier_type IN ('bank_account', 'bank_name', 'company_name', 'company_website');

-- Create a view for reporting by category
CREATE OR REPLACE VIEW identifier_categories AS
SELECT 
    CASE 
        WHEN identifier_type IN ('phone') THEN 'contact'
        WHEN identifier_type IN ('url', 'company_website') THEN 'web'
        WHEN identifier_type IN ('wallet') THEN 'crypto'
        WHEN identifier_type IN ('app') THEN 'app'
        WHEN identifier_type IN ('bank_account', 'bank_name') THEN 'banking'
        WHEN identifier_type IN ('company_name') THEN 'company'
        WHEN identifier_type IN ('twitter', 'instagram', 'tiktok', 'facebook', 'whatsapp', 'telegram', 'linkedin') THEN 'social_media'
        ELSE 'other'
    END as category,
    identifier_type,
    COUNT(*) as count,
    AVG(risk_score) as avg_risk,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as flagged_count
FROM identifiers
LEFT JOIN reports ON identifiers.id = reports.identifier_id
GROUP BY identifier_type;
