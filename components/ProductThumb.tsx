import { Product } from '@/types';
const symbols:Record<string,string>={'Диваны':'▰','Кресла':'◒','Столы':'⌑','Светильники':'✳','Ковры':'▤','Текстиль':'❋','Декор':'✿','Стулья':'◍'};
export function ProductThumb({product,small=false}:{product:Product;small?:boolean}){
 if(!product.country)return <img className={`product-img ${small?'small':''}`} src={product.image} alt=""/>;
 return <div className={`product-img product-thumb-regional ${small?'small':''}`} aria-label={`Карточка из каталога ${product.country==='BY'?'Беларуси':'России'}`}><span className="thumb-country">{product.country==='BY'?'BY':'RU'}</span><span className="thumb-symbol">{symbols[product.category]??'◇'}</span></div>;
}
