-- Add risk_contribution column to reports table
-- Hybrid approach: Store individual report's contribution to identifier's risk score
-- This enables granular audit trail while keeping main risk_score in identifiers

ALTER TABLE reports
ADD COLUMN risk_contribution SMALLINT DEFAULT 0 NOT NULL;

-- risk_contribution is set when report is approved/rejected
-- Allows tracking exactly which reports contributed how much to final score
-- Helps with: audit trail, individual report impact analysis, risk recalculation

CREATE INDEX idx_reports_risk_contribution ON reports(risk_contribution);
