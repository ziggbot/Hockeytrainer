// Ordered, append-only list of schema migrations. Never edit an applied
// migration; add a new entry instead. Applied ids are kept in schema_migrations.
export const migrations: { id: string; sql: string }[] = [
  {
    id: "001_teams_and_sync",
    sql: /* sql */ `
-- Coach accounts: e-mail and name only (no player data anywhere, spec §4).
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- Bearer tokens. id is the SHA-256 of the token, never the token itself.
CREATE TABLE auth_tokens (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id);

-- A team keeps the id the app gave it, so local data links up without renaming.
CREATE TABLE teams (
  id         text PRIMARY KEY,
  sport      text NOT NULL CHECK (sport IN ('hockey', 'innebandy')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- head = huvudtränare (manages the coaches), coach = tränare.
CREATE TABLE team_members (
  team_id    text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('head', 'coach')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX team_members_user_idx ON team_members (user_id);

-- Invite links. A link can be shared in a group chat, so it allows a few
-- uses until it expires or the head coach closes it.
CREATE TABLE invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  team_id    text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('head', 'coach')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  max_uses   int NOT NULL,
  uses       int NOT NULL DEFAULT 0,
  revoked_at timestamptz
);
CREATE INDEX invites_team_idx ON invites (team_id);

-- One-time password reset links, made by a head coach (no e-mail service).
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

-- Synced app data as documents, shaped like the app's own types
-- (web/src/domain/types.ts). team/session/note belong to a team; a drill
-- belongs to the coach who wrote it and is visible to their co-coaches.
-- seq orders changes for incremental pulls.
CREATE SEQUENCE records_seq;
CREATE TABLE records (
  kind       text NOT NULL CHECK (kind IN ('team', 'session', 'note', 'drill')),
  id         text NOT NULL,
  sport      text NOT NULL CHECK (sport IN ('hockey', 'innebandy')),
  team_id    text REFERENCES teams(id) ON DELETE CASCADE,
  owner_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb,
  deleted    boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  seq        bigint NOT NULL DEFAULT nextval('records_seq'),
  PRIMARY KEY (kind, id),
  CHECK ((kind = 'drill') = (owner_id IS NOT NULL)),
  CHECK ((kind = 'drill') = (team_id IS NULL))
);
CREATE UNIQUE INDEX records_seq_key ON records (seq);
CREATE INDEX records_team_idx ON records (team_id, seq);
CREATE INDEX records_owner_idx ON records (owner_id, seq);
`
  }
];
