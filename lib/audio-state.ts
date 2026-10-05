import type {AppState,AudioFile,Position} from './store.ts';

// Replacement time is the time the user selected the file, not upload time.
// A queued upload from an old device must not win simply because it finished later.
export function newestAudio(a:AudioFile,b:AudioFile):AudioFile{
 if(a.updatedAt!==b.updatedAt)return a.updatedAt>b.updatedAt?a:b;
 return JSON.stringify(a)>JSON.stringify(b)?a:b;
}

export function commitAudioUpload(state:AppState,id:string,file:AudioFile):AppState{
 const current=state.audioFiles[id];
 if(current&&newestAudio(current,file)===current)return state;
 return {...state,audioFiles:{...state.audioFiles,[id]:file}};
}

export function audioMediaId(storagePath:string){return storagePath.split('/').filter(Boolean).at(-1)??storagePath}

export function audioResumeOffset(position:Position|undefined,mediaId:string,selectedAt:number):number{
 if(!position)return 0;
 if(position.mediaId?position.mediaId!==mediaId:position.updatedAt<selectedAt)return 0;
 return Math.max(0,position.offset??0);
}
