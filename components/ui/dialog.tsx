'use client';
import {useRef,useState,useEffect} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
export function Dialog({open,onOpenChange,title,children,wide=false,sheet=false,fullScreen=false}:{open:boolean;onOpenChange:(v:boolean)=>void;title:string;children:React.ReactNode;wide?:boolean;sheet?:boolean;fullScreen?:boolean}){
 const [expanded,setExpanded]=useState(false);const dragStart=useRef<number|null>(null),dragged=useRef(false);
 useEffect(()=>{if(!open)setExpanded(false)},[open]);
 return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="modal-overlay"/><DialogPrimitive.Content aria-describedby={undefined} className={`modal ${wide?'modal-wide':''} ${sheet?'mobile-sheet':''} ${fullScreen?'mobile-full-modal':''} ${expanded?'sheet-expanded':''}`}>
 {sheet&&<button className="sheet-handle" aria-label={expanded?'收起抽屉':'展开抽屉'} onClick={()=>{if(!dragged.current)setExpanded(v=>!v);dragged.current=false}} onPointerDown={e=>{dragged.current=false;dragStart.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerCancel={()=>{dragStart.current=null;dragged.current=true}} onPointerUp={e=>{if(dragStart.current===null)return;const dy=e.clientY-dragStart.current;dragStart.current=null;dragged.current=Math.abs(dy)>15;if(dy>70){if(expanded)setExpanded(false);else onOpenChange(false)}else if(dy < -45)setExpanded(true)}}><span/></button>}
 <div className="modal-heading"><DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title><DialogPrimitive.Close className="icon-btn modal-close" aria-label="关闭"><X size={19}/></DialogPrimitive.Close></div><div className="modal-body">{children}</div></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>
}
