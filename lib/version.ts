import packageInfo from '../package.json';
import {validBuild} from './platform/app-updates';
export const APP_VERSION=packageInfo.version;
/** The page's compiled identity is distinct from an already-switched controller. */
export function runningAppBuild():string|null{
 return typeof document==='undefined'?null:validBuild(document.querySelector('meta[name="kotoba-build"]')?.getAttribute('content'));
}
