DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'enmodswr') THEN
    EXECUTE 'GRANT pg_execute_server_program TO \"enmodswr\"';
  END IF;
END
$$;