import { products } from './mock-data';
import { BBox, Category, Product, Tier } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { infer, jpeg, loadImage, Usage } from './replicate';

type CatalogRow = {
  id: string;
  title: string;
  category: Category;
  tier: Tier;
  price_amount: string | number;
  currency_code: string;
  country_code: string | null;
  store_name: string;
  in_stock: boolean;
  product_url: string;
  image_url: string | null;
  dimensions_json: Partial<Record<'length' | 'width' | 'height', number | string>> | null;
};

export type MatchGroups = Record<Tier, Product[]>;
export type CatalogStatus = 'indexed' | 'unindexed' | 'category-unindexed';

function group(matches: Product[]): MatchGroups {
  return {
    premium: matches.filter(p => p.tier === 'premium'),
    mid: matches.filter(p => p.tier === 'mid'),
    budget: matches.filter(p => p.tier === 'budget'),
  };
}

export function demoMatches(category?: Category) {
  return group(products.filter(p => p.category === category));
}

export async function catalogStatus(category: Category): Promise<CatalogStatus> {
  if (!supabase) throw new Error('disabled');
  const { data, error } = await supabase.rpc('clip_catalog_indexed', { match_category: category });
  if (error) throw error;
  if (data) return 'indexed';
  const global = await supabase.rpc('clip_catalog_indexed');
  if (global.error) throw global.error;
  return global.data ? 'category-unindexed' : 'unindexed';
}

export async function findSimilarProducts(roomUrl: string, bbox: BBox, category: Category) {
  if (!supabase) throw new Error('disabled');
  const source = await loadImage(roomUrl);
  const crop = jpeg(source, bbox.x * source.naturalWidth / 100, bbox.y * source.naturalHeight / 100,
    bbox.width * source.naturalWidth / 100, bbox.height * source.naturalHeight / 100, 768);
  const { embedding, usage } = await infer<{ embedding: number[]; usage: Usage }>('embed', crop.url);
  const { data, error } = await supabase.rpc('match_furniture_clip', {
    query_embedding: JSON.stringify(embedding), match_category: category, result_limit: 30,
  });
  if (error) return { matches: demoMatches(category), usage, embeddingSize: embedding.length, catalogError: true };
  const matches: Product[] = (data as CatalogRow[] ?? []).map(r => ({
    id: r.id, title: r.title, category: r.category, tier: r.tier, price: Number(r.price_amount),
    currency: r.currency_code === 'BYN' ? 'BYN' : 'RUB',
    country: r.country_code === 'BY' || r.country_code === 'RU' ? r.country_code : undefined,
    store: r.store_name, inStock: r.in_stock, url: r.product_url, image: r.image_url ?? '',
    dimensions: {
      length: Number(r.dimensions_json?.length ?? 0), width: Number(r.dimensions_json?.width ?? 0),
      height: Number(r.dimensions_json?.height ?? 0),
    },
  }));
  return { matches: group(matches), usage, embeddingSize: embedding.length, catalogError: false };
}
