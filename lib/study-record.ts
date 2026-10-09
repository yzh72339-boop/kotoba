import type {AppState,Session} from './store';
export function saveStudyRecord(s:AppState,record:Session):AppState{return s.sessions.some(session=>session.id===record.id)?s:{...s,sessions:[...s.sessions,record]}}
