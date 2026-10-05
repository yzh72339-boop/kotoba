'use client';
import {useEffect,useState} from 'react';
import {MOBILE_QUERY} from '@/lib/responsive';
export function useMediaQuery(query:string){const [matches,setMatches]=useState(false);useEffect(()=>{const m=window.matchMedia(query);setMatches(m.matches);const update=()=>setMatches(m.matches);m.addEventListener('change',update);return()=>m.removeEventListener('change',update)},[query]);return matches;}
export function useIsMobile(){return useMediaQuery(MOBILE_QUERY);}
