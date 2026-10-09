import type {AppState} from './store';
export type ThemePreference='light'|'dark'|'system';
const key='app-theme-preference';
export function themePreference(state:AppState):ThemePreference{const value=state.notes[key];return value==='light'||value==='dark'||value==='system'?value:state.theme}
export function resolvedTheme(state:AppState,systemDark:boolean){const preference=themePreference(state);return preference==='system'?(systemDark?'dark':'light'):preference}
export function withThemePreference(state:AppState,preference:ThemePreference):AppState{return {...state,theme:preference==='system'?state.theme:preference,notes:{...state.notes,[key]:preference}}}
