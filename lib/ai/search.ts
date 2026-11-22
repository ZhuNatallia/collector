import { products } from './mock-data';
import { Category, Product, Tier } from '@/types';
import { supabase } from '@/lib/supabase/client';

export type MatchGroups = Record<Tier, Product[]>;
/** Catalog adapter: live pgvector via Supabase RPC when configured; local mock catalog otherwise. */
export async function findSimilarProducts(cropUrl: string | undefined, category: Category): Promise<MatchGroups> {
  const embeddingEndpoint=process.env.NEXT_PUBLIC_EMBEDDING_ENDPOINT;
  if(supabase&&embeddingEndpoint&&cropUrl){
    const embeddingResponse=await fetch(embeddingEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageUrl:cropUrl})});
    if(!embeddingResponse.ok)throw new Error('Не удалось получить эмбеддинг изображения');
    const {embedding}=await embeddingResponse.json();
    const {data,error}=await supabase.rpc('match_furniture',{query_embedding:embedding,match_category:category,match_tier:null,only_in_stock:false,result_limit:30});
    if(error)throw error;
    const normalized=(data??[]).map((r:any)=>({id:r.id,title:r.title,category:r.category,tier:r.tier,price:Number(r.price_amount??r.price_rub),currency:r.currency_code==='BYN'?'BYN':'RUB',country:r.country_code==='BY'?'BY':r.country_code==='RU'?'RU':undefined,store:r.store_name,inStock:r.in_stock,dimensions:{length:Number(r.dimensions_json?.length??0),width:Number(r.dimensions_json?.width??0),height:Number(r.dimensions_json?.height??0)},url:r.product_url,image:r.image_url??''})) as Product[];
    return {premium:normalized.filter(p=>p.tier==='premium'),mid:normalized.filter(p=>p.tier==='mid'),budget:normalized.filter(p=>p.tier==='budget')};
  }
  // Mock catalog keeps the demo available without credentials or paid inference calls.
  const matches=products.filter(p=>p.category===category);
  return {premium:matches.filter(p=>p.tier==='premium'),mid:matches.filter(p=>p.tier==='mid'),budget:matches.filter(p=>p.tier==='budget')};
}
