DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'retool_write') THEN
        GRANT UPDATE ("hasAccess") ON "Organization" TO retool_write;
    END IF;
END
$$;