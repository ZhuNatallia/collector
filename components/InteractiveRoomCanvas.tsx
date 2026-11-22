'use client';
import { ChangeEvent, ReactNode } from 'react';
import { DetectedObject } from '@/types';
const symbols:Record<string,string>={'Диваны':'▰','Кресла':'◒','Столы':'⌑','Светильники':'✳','Ковры':'▤','Текстиль':'❋','Декор':'✿','Стулья':'◍'};
export function InteractiveRoomCanvas({imageUrl,objects,activeId,uploading,busy,live,status,children,onSelect,onUpload}:{imageUrl:string;objects:DetectedObject[];activeId:string;uploading:boolean;busy:boolean;live:boolean;status:string;children?:ReactNode;onSelect:(id:string)=>void;onUpload:(e:ChangeEvent<HTMLInputElement>)=>void}){
 return <div className="card canvas-card"><div className="card-head"><div><div className="card-title">Визуализация комнаты</div><div className="subtle" style={{marginTop:4}}>Нажмите на метку, чтобы подобрать похожие предметы</div></div><div className="analysis-title"><span className="spark">✦</span> AI-анализ</div></div>
  <div className={live ? "room-canvas live-room" : "room-canvas"}><div className="room-frame"><img src={imageUrl} alt="Визуализация гостиной"/><div className="canvas-caption">Гостиная · референс проекта</div>{objects.map((o,i)=><button key={o.id} className={`hotspot ${activeId===o.id?'selected':''}`} style={{left:`${o.bbox.x + (live ? o.bbox.width / 2 : 0)}%`,top:`${o.bbox.y + (live ? o.bbox.height / 2 : 0)}%`}} disabled={uploading || busy} onClick={()=>onSelect(o.id)} title={`${o.label} · ${o.category}${o.confidence == null ? '' : ` · ${Math.round(o.confidence * 100)}%`}`}>{symbols[o.category]??i+1}</button>)}</div></div>
  <div className="canvas-controls"><div className="small-note"><i/> {uploading?'Анализируем…':`${objects.length} · ${status}`}</div><label className="upload-label">Загрузить изображение <input id="room-upload" type="file" accept="image/*" disabled={uploading || busy} onChange={onUpload}/></label></div>
  {children}
  <div style={{borderTop:'1px solid #eef0ed',marginTop:13,paddingTop:13}}><div className="card-head" style={{marginBottom:9}}><div className="card-title">Найденные предметы</div><div className="subtle">Выберите предмет</div></div><div className="object-list">{objects.map(o=><button key={o.id} className={`object-chip ${activeId===o.id?'active':''}`} disabled={uploading || busy} onClick={()=>onSelect(o.id)}>{o.label}<b>· {o.category}</b></button>)}</div></div>
 </div>
}
