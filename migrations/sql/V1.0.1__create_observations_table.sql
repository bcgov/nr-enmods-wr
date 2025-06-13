-- Create observations table for storing observation data
CREATE TABLE IF NOT EXISTS observations (
    id VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL
);
