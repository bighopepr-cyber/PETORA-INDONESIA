create schema if not exists extensions;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault;
