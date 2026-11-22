import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Комплектатор — AI-подбор интерьера', description: 'Находите мебель и собирайте ведомости комплектации интерьерных проектов.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ru"><body>{children}</body></html>; }
