begin;
set local search_path = public, extensions;
create extension if not exists vector;

alter table public.products_rf
  add column if not exists embedding_clip vector(768)
    check (vector_norm(embedding_clip) > 0);

create index if not exists products_rf_clip_category_idx
  on public.products_rf (category) where embedding_clip is not null;

-- Keep temporary crops private. Only the Edge Function's service role writes here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('interior-ai-inputs', 'interior-ai-inputs', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create or replace function public.clip_catalog_indexed(match_category text default null)
returns boolean
language sql stable security invoker
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.products_rf p
    where p.embedding_clip is not null
      and (match_category is null or p.category = match_category)
  );
$$;

create or replace function public.match_furniture_clip(
  query_embedding vector(768), match_category text, result_limit integer default 30
) returns table (
  id uuid, title text, category text, tier public.product_tier, price_amount numeric,
  store_name text, country_code text, currency_code text, in_stock boolean,
  dimensions_json jsonb, product_url text, image_url text, similarity double precision
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select p.id, p.title, p.category, p.tier, coalesce(p.price_amount, p.price_rub),
         p.store_name, p.country_code, p.currency_code, p.in_stock, p.dimensions_json,
         p.product_url, p.image_url, 1 - (p.embedding_clip <=> query_embedding)
  from public.products_rf p
  where p.embedding_clip is not null
    and p.category = match_category
    and vector_dims(query_embedding) = 768
    and vector_norm(query_embedding) > 0
  order by p.embedding_clip <=> query_embedding
  limit greatest(1, least(result_limit, 100));
$$;
commit;
