/** One update protocol shared with the network-only legacy recovery page. */
export {watchAppUpdates,checkAppUpdate,downloadWorkerUpdate,readAppBuild,activateSavedUpdate,fetchServerVersion,parseVersionMetadata,updateMessage,validBuild,createUpdateGate,canActivateSnapshot,UpdateError} from '../../public/api/update-core.js';
export type {UpdateSnapshot,UpdateStatus,VersionMetadata} from '../../public/api/update-core.js';
