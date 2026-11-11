// Ordered, append-only list of schema migrations. Never edit an applied migration;
// add a new entry instead. Applied ids are recorded in schema_migrations.
export const migrations: { id: string; sql: string }[] = [
  {
    id: '001_init',
    sql: /* sql */ `
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- Login sessions. id is the SHA-256 of the cookie token, never the token itself.
CREATE TABLE auth_sessions (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id);

CREATE TABLE clubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  region     text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- admin = klubbadmin (ungdomsansvarig). member = belongs to the club via one or more teams.
CREATE TABLE club_members (
  club_id    uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);
CREATE INDEX club_members_user_idx ON club_members (user_id);

-- Curriculum per age group (target skills + philosophy) lives on the age group.
CREATE TABLE age_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  birth_year_from int,
  birth_year_to   int,
  target_skills   text[] NOT NULL DEFAULT '{}',
  philosophy      text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX age_groups_club_idx ON age_groups (club_id);

CREATE TABLE season_blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id uuid NOT NULL REFERENCES age_groups(id) ON DELETE CASCADE,
  name         text NOT NULL,
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  focus_tags   text[] NOT NULL DEFAULT '{}',
  CHECK (end_date >= start_date)
);
CREATE INDEX season_blocks_age_group_idx ON season_blocks (age_group_id, start_date);

CREATE TABLE teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id uuid REFERENCES age_groups(id) ON DELETE SET NULL,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX teams_club_idx ON teams (club_id);

-- leader = lagledare (manages the team's staff), coach = tränare.
CREATE TABLE team_members (
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('leader', 'coach')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX team_members_user_idx ON team_members (user_id);

-- Single-use invite links. Only the SHA-256 of the token is stored.
CREATE TABLE invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  club_id    uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin', 'leader', 'coach')),
  note       text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  used_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  CHECK ((role = 'admin') = (team_id IS NULL))
);
CREATE INDEX invites_club_idx ON invites (club_id);

-- Password reset links created by a club admin (no e-mail provider needed).
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

-- public drills belong to no club (seed library); private/club drills belong to a club.
CREATE TABLE drills (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_key       text UNIQUE,
  club_id        uuid REFERENCES clubs(id) ON DELETE CASCADE,
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  visibility     text NOT NULL CHECK (visibility IN ('private', 'club', 'public')),
  title          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  coaching_points text[] NOT NULL DEFAULT '{}',
  skill_tags     text[] NOT NULL DEFAULT '{}',
  age_min        int,
  age_max        int,
  duration_min   int NOT NULL DEFAULT 10 CHECK (duration_min BETWEEN 1 AND 120),
  ice_area       text NOT NULL CHECK (ice_area IN ('full', 'half', 'third', 'station')),
  min_players    int,
  equipment      jsonb NOT NULL DEFAULT '[]',
  diagram_url    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((visibility = 'public') = (club_id IS NULL))
);
CREATE INDEX drills_club_idx ON drills (club_id);
CREATE INDEX drills_skill_tags_idx ON drills USING gin (skill_tags);

-- A planned practice (träningspass) for a team.
CREATE TABLE practices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  title        text NOT NULL DEFAULT '',
  starts_at    timestamptz NOT NULL,
  duration_min int NOT NULL CHECK (duration_min BETWEEN 10 AND 240),
  status       text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done')),
  player_count int CHECK (player_count IS NULL OR player_count BETWEEN 0 AND 200),
  focus_tags   text[] NOT NULL DEFAULT '{}',
  share_token  text UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practices_team_idx ON practices (team_id, starts_at);

CREATE TABLE practice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  position    int NOT NULL,
  drill_id    uuid REFERENCES drills(id) ON DELETE SET NULL,
  title       text NOT NULL,
  minutes     int NOT NULL CHECK (minutes BETWEEN 1 AND 120),
  station     int CHECK (station IS NULL OR station BETWEEN 1 AND 8),
  note        text NOT NULL DEFAULT ''
);
CREATE INDEX practice_items_practice_idx ON practice_items (practice_id, position);

-- client_id makes note creation idempotent for the offline sync queue.
CREATE TABLE practice_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  body        text NOT NULL DEFAULT '',
  tags        text[] NOT NULL DEFAULT '{}',
  client_id   text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practice_notes_practice_idx ON practice_notes (practice_id, created_at);
`,
  },
];
