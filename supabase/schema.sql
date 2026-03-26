
create table if not exists player_registry ( id text primary key, name text not null, latest_skill int, last_seen timestamptz, total_visits int default 0 );
create table if not exists pending_queue ( id text primary key, name text not null, skill int not null, ts timestamptz not null default now(), type text not null, play_count int default 0 );
create table if not exists player_queue ( id text primary key, name text not null, skill int not null, ts timestamptz not null default now(), type text not null, play_count int default 0 );
create table if not exists active_courts ( court text primary key, p1_id text, p1_name text, p1_skill int, p2_id text, p2_name text, p2_skill int, p3_id text, p3_name text, p3_skill int, p4_id text, p4_name text, p4_skill int, start_time timestamptz not null default now() );
create table if not exists match_logs ( ts timestamptz not null default now(), action text not null, court text, player_id text, player_name text, skill int, match_group text, duration int, details text );
create table if not exists system_config ( key text primary key, value text );
insert into system_config(key,value) values ('Courts','Court 1, Court 2'), ('Announcement','System Ready'), ('AutoMatch','false') on conflict (key) do nothing;
create or replace function guest_counter() returns int as $$ select coalesce((select value::int from system_config where key='GUEST_COUNTER_LAST'), 0); $$ language sql stable;
