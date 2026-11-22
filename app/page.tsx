'use client';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { demoObjects } from '@/lib/ai/mock-data';
import { findSimilarProducts } from '@/lib/ai/search';
import { segmentRoomImage } from '@/lib/ai/segment';
import { exportToExcel, exportToPDF } from '@/lib/export/export';
import { useProjectStore } from '@/store/useProjectStore';
import { InteractiveRoomCanvas } from '@/components/InteractiveRoomCanvas';
import { ProductMatchDrawer } from '@/components/ProductMatchDrawer';
import { SpecificationTable } from '@/components/SpecificationTable';
import { Category, DetectedObject, EstimateItem, Tier } from '@/types';

const tiers: {id:Tier;label:string}[]=[{id:'premium',label:'Премиум'},{id:'mid',label:'Оптимальный'},{id:'budget',label:'Бюджет'}];
const money=(v:number)=>new Intl.NumberFormat('ru-RU').format(v)+' ₽';
const icons:Record<string,string>={'Диваны':'▰','Кресла':'◒','Столы':'⌑','Светильники':'✳','Ковры':'▤','Текстиль':'❋','Декор':'✿','Стулья':'◍'};

export default function Home(){
 const {project,items,setImage,setName,setMarkup,addItem,setQuantity,removeItem,clear}=useProjectStore();
 const [objects,setObjects]=useState<DetectedObject[]>(demoObjects),[activeId,setActiveId]=useState('obj-sofa'),[tier,setTier]=useState<Tier>('premium'),[uploading,setUploading]=useState(false),[toast,setToast]=useState(''),[supplierOpen,setSupplierOpen]=useState(false),[supplierStatus,setSupplierStatus]=useState(''),[logo,setLogo]=useState('');
 const active=objects.find(o=>o.id===activeId)??objects[0];
 const matches=useMemo(()=>active?findSimilarProducts(active.cropUrl,active.category):Promise.resolve({premium:[],mid:[],budget:[]}),[active]);
 const [productsByTier,setProductsByTier]=useState<Record<Tier,import('@/types').Product[]>>({premium:[],mid:[],budget:[]});
 useEffect(()=>{let valid=true;matches.then(v=>{if(valid)setProductsByTier(v)});return()=>{valid=false}},[matches]);
 const subtotal=items.reduce((s,i)=>s+i.product.price*i.quantity,0),markup=subtotal*project.markupPercent/100,total=subtotal+markup;
 const flash=(msg:string)=>{setToast(msg);window.setTimeout(()=>setToast(''),2600)};
 async function handleImage(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setUploading(true);const reader=new FileReader();reader.onload=async()=>{const data=String(reader.result);setImage(data);try{const detected=await segmentRoomImage(data);setObjects(detected);setActiveId(detected[0]?.id??'');flash('Изображение загружено · показан демо-анализ')}catch{setObjects(demoObjects);flash('Изображение загружено · используем демо-объекты')}finally{setUploading(false)}};reader.readAsDataURL(file)}
 function addProduct(p:import('@/types').Product){const objectId=active?.id??'unknown';const entry:EstimateItem={id:`${objectId}-${p.id}`,objectId,product:p,quantity:1};addItem(entry);flash(`${p.title} добавлен в ведомость`)}
 async function importFeed(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;const text=await file.text();const count=file.name.toLowerCase().endsWith('.csv')?text.split(/\r?\n/).filter(Boolean).length-1:(text.match(/<offer\b/g)||[]).length;setSupplierStatus(`Файл прочитан: ${Math.max(0,count)} товарных строк. Демо-режим: для индексации подключите Supabase.`)}
 const logoUpload=(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>setLogo(String(r.result));r.readAsDataURL(file)};
 function newProject(){const name=window.prompt('Название проекта','Новый интерьер');if(!name?.trim())return;clear();setName(name.trim());setMarkup(10);setImage('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1300&q=90');flash('Создан новый проект')}

 return <div className="shell">
  <header className="topbar"><div className="brand"><div className="brand-mark">К</div><div>КОМПЛЕКТАТОР<small>AI · интерьерная ведомость</small></div></div><nav className="nav"><button className="active">Рабочая область</button><button onClick={()=>document.getElementById('product-match')?.scrollIntoView({behavior:'smooth',block:'center'})}>Каталоги РФ и Беларуси</button><button onClick={()=>setSupplierOpen(true)}>Поставщики</button></nav><div className="top-actions"><button className="icon-button" title="Уведомления">♧</button><div className="user-chip"><div className="avatar">АК</div><span>Анна Ковалёва</span></div><button className="icon-button mobile-menu" onClick={()=>setSupplierOpen(true)}>☰</button></div></header>
  <main className="main">
   <div className="heading"><div><div className="eyebrow">Проект · Комплектация интерьера</div><h1>Рабочая область</h1><p>Загрузите визуализацию — подберём мебель и соберём смету в одном месте.</p></div><div className="project-controls"><select className="project-select" aria-label="Текущий проект"><option>{project.name}</option></select><button className="button" onClick={newProject}>＋ Новый проект</button></div></div>
   <section className="workspace">
    <InteractiveRoomCanvas imageUrl={project.imageUrl} objects={objects} activeId={activeId} uploading={uploading} onSelect={setActiveId} onUpload={handleImage}/>
    <ProductMatchDrawer active={active} products={productsByTier[tier]??[]} tier={tier} onTier={setTier} onAdd={addProduct} onFilter={()=>flash('Фильтры габаритов и наличия подключаются к каталогу Supabase')}/>
   </section>
   <SpecificationTable project={project} items={items} onQuantity={setQuantity} onRemove={removeItem} onMarkup={setMarkup} logo={logo} onLogo={logoUpload}/>
   <div style={{display:'flex',justifyContent:'space-between',padding:'18px 3px 0',fontSize:9,color:'#a0a9a1'}}><span>КОМПЛЕКТАТОР · MVP</span><span>Демо-данные · цены и наличие требуют проверки у поставщика</span></div>
  </main>
  {toast&&<div className="toast">{toast}</div>}
  {supplierOpen&&<div onClick={()=>setSupplierOpen(false)} style={{position:'fixed',inset:0,zIndex:50,background:'#1d282270',display:'grid',placeItems:'center',padding:15}}><div className="card" onClick={e=>e.stopPropagation()} style={{width:'min(510px,100%)',padding:24,boxShadow:'0 18px 60px #101a1740'}}><div className="section-row"><div><div className="eyebrow">B2B кабинет</div><h2 style={{font:'700 19px Manrope',margin:'0 0 6px'}}>Подключение поставщика</h2><p style={{fontSize:11,color:'#89948c',margin:0}}>Загрузите YML/XML или CSV-фид с товарами</p></div><button className="icon-button" onClick={()=>setSupplierOpen(false)}>×</button></div><div style={{marginTop:21,padding:25,textAlign:'center',border:'1px dashed #cad7cb',background:'#f8faf7',borderRadius:12}}><div style={{fontSize:30,color:'#66836c'}}>⇧</div><div style={{fontSize:12,fontWeight:700,margin:'7px 0'}}>Перетащите файл сюда или выберите</div><div className="subtle">YML · XML · CSV</div><label className="button light" style={{marginTop:14,cursor:'pointer'}}>Выбрать файл<input type="file" accept=".yml,.xml,.csv,text/csv,application/xml" onChange={importFeed} style={{display:'none'}}/></label></div>{supplierStatus&&<div style={{marginTop:13,padding:12,background:'#edf4e9',borderRadius:9,fontSize:11,color:'#456048'}}>{supplierStatus}</div>}<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20}}><span className="subtle">Демо: импорт читает файл локально</span><button className="button secondary" onClick={()=>setSupplierOpen(false)}>Готово</button></div></div></div>}
 </div>
}
