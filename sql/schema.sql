BEGIN;

CREATE TABLE users (
    id text PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE runs (
    id serial PRIMARY KEY,
    user_id text REFERENCES users (id),
    floors integer NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE achievements (
    id serial PRIMARY KEY,
    name text NOT NULL,
    location text NOT NULL,
    height integer NOT NULL
);

COMMIT;
