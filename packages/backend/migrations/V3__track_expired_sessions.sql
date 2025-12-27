CREATE TABLE IF NOT EXISTS expired_sessions
(
    session_id  INTEGER PRIMARY KEY,
    uid         INTEGER REFERENCES users (uid),
    created_at  TIMESTAMPTZ NOT NULL,
    last_active TIMESTAMPTZ NOT NULL,
    expires     TIMESTAMPTZ NOT NULL,
    ended       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_expired_or_deleted_session()
    RETURNS trigger
    LANGUAGE plpgsql
AS
$$
BEGIN
    INSERT INTO expired_sessions (session_id, uid, created_at, last_active, expires, ended)
    VALUES (OLD.session_id, OLD.uid, OLD.created_at, OLD.last_active, OLD.expires, now())
    ON CONFLICT (session_id) DO NOTHING;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_to_expired ON sessions;
CREATE TRIGGER trg_sessions_to_expired
    AFTER DELETE
    ON sessions
    FOR EACH ROW
EXECUTE FUNCTION log_expired_or_deleted_session();