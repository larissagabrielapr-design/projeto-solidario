import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Projeto Solidário | Cuidar, juntos.',description:'Um espaço privado para organizar famílias, cestas e gestos de solidariedade.',robots:{index:false,follow:false},referrer:'no-referrer',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
