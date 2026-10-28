begin;

select plan(6);

select ok(exists (select 1 from pg_extension where extname = 'pg_cron'), 'pg_cron tersedia');
select ok(exists (select 1 from pg_extension where extname = 'pg_net'), 'pg_net tersedia');
select ok(exists (select 1 from pg_extension where extname = 'pg_trgm'), 'pg_trgm tersedia');
select ok(exists (select 1 from pg_extension where extname = 'btree_gist'), 'btree_gist tersedia');
select ok(exists (select 1 from pg_extension where extname = 'pgcrypto'), 'pgcrypto tersedia');
select ok(exists (select 1 from pg_extension where extname = 'supabase_vault'), 'supabase_vault tersedia');

select * from finish();

rollback;
