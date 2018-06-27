BEGIN;

CREATE TABLE users (
    id text PRIMARY KEY,
    name text NOT NULL,
    biked_to_work_distance integer
);

COMMENT ON COLUMN users.biked_to_work_distance IS 'Distance in meters';

CREATE TABLE runs (
    id serial PRIMARY KEY,
    user_id text REFERENCES users (id),
    floors integer NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

COMMENT ON COLUMN runs.floors IS 'Number of floors';

CREATE TABLE bike_runs (
    id serial PRIMARY KEY,
    user_id text REFERENCES users (id),
    distance integer NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

COMMENT ON COLUMN bike_runs.distance IS 'Distance in meters';

CREATE TABLE achievements (
    id serial PRIMARY KEY,
    name text NOT NULL,
    location text NOT NULL,
    height integer NOT NULL
);

COMMENT ON COLUMN achievements.height IS 'Height in meters';

COMMIT;
