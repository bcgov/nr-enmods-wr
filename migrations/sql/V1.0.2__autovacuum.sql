-- This migration sets the autovacuum parameters for the observation table
-- to optimize performance for frequent updates and inserts.
ALTER TABLE observations
SET
  (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.01
  );