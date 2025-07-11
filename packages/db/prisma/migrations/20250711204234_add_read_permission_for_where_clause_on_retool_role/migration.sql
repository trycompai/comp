DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'retool_write') THEN
        -- Grant SELECT permission (needed for WHERE clause)
        GRANT SELECT ON "Organization" TO retool_write;
    END IF;
END
$$;