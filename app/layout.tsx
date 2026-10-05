import type { Metadata, Viewport } from 'next';
import './globals.css';
import './fluid.css';
export const metadata: Metadata = {title: 'Kotoba — A little progress, every day',description:'Private personal English and Japanese learning.',robots:{index:false,follow:false},icons:{icon:'/favicon.ico',apple:'/apple-touch-icon.png'},appleWebApp:{capable:true,statusBarStyle:'default',title:'Kotoba'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: light)',color:'#FAFAF8'},{media:'(prefers-color-scheme: dark)',color:'#111111'}]};
export default function Layout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="zh-CN" suppressHydrationWarning><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head><body>{children}</body></html> }
