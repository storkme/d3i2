CREATE TYPE item_slot AS ENUM (
    'head', 'torso', 'feet', 'hands', 'shoulders', 'legs', 'bracers',
    'mainHand', 'offHand', 'waist', 'rightFinger', 'leftFinger', 'neck'
);

CREATE TYPE skill_type AS ENUM (
    'passive','skill', 'rune'
);

create table hero (
    id SERIAL PRIMARY KEY,
    hero_id integer not null UNIQUE,
    name text not null,
    class text not null,
    battle_tag text not null,
    ranking_tier integer not null,
    ranking_time real not null,
    last_updated integer not null,
    paragon_level integer not null,
    region text not null,
    seasonCreated integer default null,
    hardcore boolean not null,
    last_modified timestamp not null default current_timestamp
);

create table hero_stats (
    hero_id integer not null REFERENCES hero (id) ON DELETE CASCADE,
    name text not null,
    value real not null
);

create table hero_items (
    id SERIAL PRIMARY KEY,
    hero_id integer not null REFERENCES hero (id) ON DELETE CASCADE,
    item_id text not null,
    name text not null,
    icon text not null,
    color text not null,
    tooltip_params text not null,
    slot item_slot not null,
    data jsonb
);

create table item_attrs (
    item_id integer not null REFERENCES hero_items (id) ON DELETE CASCADE,
    name text not null,
    val_min real not null,
    val_max real not null
);

create table item_gems (
    item_id integer not null REFERENCES hero_items (id) ON DELETE CASCADE,
    gem_id text not null,
    rank integer
);

create table hero_skills (
    hero_id integer not null REFERENCES hero (id) ON DELETE CASCADE,
    name text not null,
    rune text,
    type skill_type not null
);

create table skills (
    slug text not null primary key,
    id text not null,
    parent_id text,
    name text not null,
    level integer not null,
    tooltip text not null,
    description text not null,
    class text not null,
    icon text,
    type  skill_type not null,
    unique(id, parent_id, class, type)
);

create table items (
    id text not null primary key,
    name text not null,
    icon text not null,
    color text not null,
    type text
);