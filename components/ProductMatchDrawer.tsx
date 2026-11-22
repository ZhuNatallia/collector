'use client';
import { useState } from 'react';
import { Product, Tier, DetectedObject } from '@/types';
import { ProductThumb } from '@/components/ProductThumb';
const tiers:{id:Tier;label:string}[]=[{id:'premium',label:'Премиум'},{id:'mid',label:'Оптимальный'},{id:'budget',label:'Бюджет'}];
const money=(v:number,currency:Product['currency']='RUB')=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:currency==='BYN'?'BYN':'RUB',minimumFractionDigits:0,maximumFractionDigits:2}).format(v);
export function ProductMatchDrawer({active,products,tier,onTier,onAdd,onFilter}:{active?:DetectedObject;products:Product[];tier:Tier;onTier:(tier:Tier)=>void;onAdd:(product:Product)=>void;onFilter:()=>void}){
 const [country,setCountry]=useState<'RU'|'BY'|'all'|'demo'>('RU');
 const shown=products.filter(p=>country==='all'?true:country==='demo'?!p.country:p.country===country);
 return <div className="card right-panel" id="product-match"><div className="match-head"><div className="section-row"><div><h2>Похожие товары</h2><p>Модели из каталогов России и Беларуси</p></div><button className="icon-button" title="Настройки поиска" onClick={onFilter}>⌘</button></div>{active&&<div className="selected-object"><div><strong>{active.label}</strong><div className="subtle" style={{marginTop:4}}>Поиск по категории · {active.category}</div></div><span>↗ изменить объект</span></div>}</div>
  <div className="catalog-tabs">{[{id:'RU',label:'Россия'},{id:'BY',label:'Беларусь'},{id:'all',label:'Все каталоги'},{id:'demo',label:'Примеры'}].map(t=><button key={t.id} className={country===t.id?'active':''} onClick={()=>setCountry(t.id as typeof country)}>{t.label}</button>)}</div>
  <div className="tier-tabs">{tiers.map(t=><button key={t.id} className={tier===t.id?'active':''} onClick={()=>onTier(t.id)}>{t.label}</button>)}</div>
  <div className="products">{shown.length?shown.map(p=><article className="product" key={p.id}><ProductThumb product={p}/><div className="product-info"><strong>{p.title}</strong><div className="product-meta"><a href={p.url} target="_blank" rel="noreferrer">{p.store} ↗</a>{p.note?` · ${p.note}`:''}</div><div className="product-dims">{p.dimensions.length||p.dimensions.width||p.dimensions.height?`${p.dimensions.length||'—'} × ${p.dimensions.width||'—'} × ${p.dimensions.height||'—'} мм`:'Габариты уточнить'}</div><div className={`stock ${p.inStock?'':'out'}`}>{p.availability??(p.inStock?'● В наличии':'○ Уточнить наличие')}</div></div><div className="product-buy"><div className="price">{money(p.price,p.currency)}</div><button className="add-button" onClick={()=>onAdd(p)}>＋ В смету</button></div></article>):<div className="empty-state">Для этой страны и категории пока нет проверенных карточек. Попробуйте «Все каталоги».</div>}</div><div className="panel-foot"><span>Каталожные цены проверены 20.11.2026</span><span>{shown.length} позиций</span></div>
 </div>
}
