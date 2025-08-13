CREATE TABLE
  observation_refresh_log (
    id SERIAL PRIMARY KEY,
    last_success TIMESTAMP NOT NULL DEFAULT NOW ()
  );

COMMENT ON TABLE observation_refresh_log IS 'Stores the last successful refresh of the observationstable.';