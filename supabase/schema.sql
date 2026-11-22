create extension if not exists vector;
create extension if not exists "pgcrypto";

do $$ begin
  create type product_tier as enum ('premium', 'mid', 'budget');
exception when duplicate_object then null; end $$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Новый проект',
  image_url text,
  markup_percent numeric(5,2) not null default 0 check (markup_percent between 0 and 100),
  created_at timestamptz not null default now()
);
create table if not exists detected_objects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null,
  label text not null,
  bbox_json jsonb not null,
  crop_url text,
  created_at timestamptz not null default now()
);
create table if not exists products_rf (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  tier product_tier not null,
  price_rub numeric(12,2) check (price_rub >= 0),
  price_amount numeric(12,2) not null check (price_amount >= 0),
  store_name text not null,
  country_code text check (country_code in ('RU','BY')),
  currency_code text not null default 'RUB' check (currency_code in ('RUB','BYN')),
  in_stock boolean not null default false,
  dimensions_json jsonb not null default '{}'::jsonb,
  product_url text not null,
  image_url text,
  embedding vector(512),
  updated_at timestamptz not null default now()
);
alter table products_rf add column if not exists country_code text check (country_code in ('RU','BY'));
alter table products_rf add column if not exists currency_code text not null default 'RUB' check (currency_code in ('RUB','BYN'));
alter table products_rf add column if not exists price_amount numeric(12,2);
update products_rf set price_amount=price_rub where price_amount is null and price_rub is not null;
create index if not exists products_rf_embedding_idx on products_rf using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists products_rf_category_tier_idx on products_rf (category, tier, in_stock);
create table if not exists estimate_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  detected_object_id uuid references detected_objects(id) on delete set null,
  product_id uuid not null references products_rf(id),
  quantity integer not null default 1 check (quantity > 0),
  custom_note text,
  created_at timestamptz not null default now(),
  unique (project_id, detected_object_id, product_id)
);

create or replace function match_furniture(
  query_embedding vector(512),
  match_category text default null,
  match_tier product_tier default null,
  only_in_stock boolean default true,
  max_length integer default null,
  max_width integer default null,
  max_height integer default null,
  result_limit integer default 24
) returns table (
  id uuid, title text, category text, tier product_tier, price_amount numeric,
  store_name text, country_code text, currency_code text, in_stock boolean, dimensions_json jsonb, product_url text,
  image_url text, similarity real
) language sql stable as $$
  select p.id, p.title, p.category, p.tier, p.price_amount, p.store_name, p.country_code, p.currency_code,
         p.in_stock, p.dimensions_json, p.product_url, p.image_url,
         1 - (p.embedding <=> query_embedding) as similarity
  from products_rf p
  where p.embedding is not null
    and (match_category is null or p.category = match_category)
    and (match_tier is null or p.tier = match_tier)
    and (not only_in_stock or p.in_stock)
    and (max_length is null or (p.dimensions_json->>'length')::integer <= max_length)
    and (max_width is null or (p.dimensions_json->>'width')::integer <= max_width)
    and (max_height is null or (p.dimensions_json->>'height')::integer <= max_height)
  order by p.embedding <=> query_embedding
  limit greatest(1, least(result_limit, 100));
$$;

alter table projects enable row level security;
alter table detected_objects enable row level security;
alter table estimate_items enable row level security;
alter table products_rf enable row level security;
create policy "owners manage projects" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners manage detected objects" on detected_objects for all using (exists(select 1 from projects p where p.id=project_id and p.user_id=auth.uid())) with check (exists(select 1 from projects p where p.id=project_id and p.user_id=auth.uid()));
create policy "catalog is readable" on products_rf for select using (true);
create policy "owners manage estimate" on estimate_items for all using (exists(select 1 from projects p where p.id=project_id and p.user_id=auth.uid())) with check (exists(select 1 from projects p where p.id=project_id and p.user_id=auth.uid()));
