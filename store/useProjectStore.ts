'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EstimateItem, Project } from '@/types';
type State={project:Project;items:EstimateItem[];setImage:(imageUrl:string)=>void;setName:(name:string)=>void;setMarkup:(value:number)=>void;addItem:(item:EstimateItem)=>void;setQuantity:(id:string,quantity:number)=>void;removeItem:(id:string)=>void;clear:()=>void};
const initialProject:Project={id:'demo-room-01',name:'Проект «Тёплый минимализм»',imageUrl:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1300&q=90',markupPercent:10};
export const useProjectStore=create<State>()(persist((set)=>({project:initialProject,items:[],setImage:imageUrl=>set(s=>({project:{...s.project,imageUrl}})),setName:name=>set(s=>({project:{...s.project,name}})),setMarkup:markupPercent=>set(s=>({project:{...s.project,markupPercent}})),addItem:item=>set(s=>({items:s.items.some(i=>i.product.id===item.product.id)?s.items.map(i=>i.product.id===item.product.id?{...i,quantity:i.quantity+item.quantity}:i):[...s.items,item]})),setQuantity:(id,quantity)=>set(s=>({items:s.items.map(i=>i.id===id?{...i,quantity:Math.max(1,quantity)}:i)})),removeItem:id=>set(s=>({items:s.items.filter(i=>i.id!==id)})),clear:()=>set({items:[]})}),{name:'komplektator-project'}));
