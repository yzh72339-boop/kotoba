'use client';
import {useEffect,useState} from 'react';
import {useReducedMotion} from 'framer-motion';
import {richExperienceEffects} from '@/lib/platform/experience-effects';
type DeviceNavigator=Navigator&{deviceMemory?:number;connection?:EventTarget&{saveData?:boolean}};
export function useExperienceEffects(){
 const reduceMotion=useReducedMotion();
 const [richEffects,setRichEffects]=useState(false);
 useEffect(()=>{
  const device=navigator as DeviceNavigator;
  const update=()=>setRichEffects(richExperienceEffects({reducedMotion:reduceMotion!==false,saveData:device.connection?.saveData,memoryGB:device.deviceMemory,cores:device.hardwareConcurrency}));
  update();device.connection?.addEventListener('change',update);
  return()=>device.connection?.removeEventListener('change',update);
 },[reduceMotion]);
 return {reduceMotion,richEffects};
}
