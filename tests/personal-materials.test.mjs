import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../lib/store.ts';
import {prepareMaterial,putMaterial,personalMaterial,personalMaterials,materialSnapshot,snapshotById,removeMaterial,duplicateMaterial,decodeMaterialFile,materialSentences,materialParagraphs,saveMaterialProgress,materialProgress} from '../lib/personal-materials.ts';
import {exportJSON} from '../lib/export.ts';
import {parseBackup} from '../lib/backend/backup-schema.ts';
import {stampChanges,mergeStates} from '../lib/sync-state.ts';
const input=(language='ja',text='「まだ終わっていない。」彼はそう言った。\n\n雨の中を歩いた。')=>({title:'私の文章',language,level:null,source:'自分のノート',text});
const fresh=()=>structuredClone(initialState);
test('Japanese and English materials persist stable IDs, original text, source and unassessed level through existing export/sync',async()=>{
 for(const language of ['ja','en']){const text=language==='ja'?input().text:'Dr. Lee works in the U.S.\n\nHe paid $3.50. Then he left.';const p=await prepareMaterial(input(language,text));let s=putMaterial(fresh(),p);s=mergeStates(stampChanges(fresh(),s,1000),fresh());s=parseBackup(exportJSON(s));const m=personalMaterial(s,p.material.id);assert.equal(m.level,null);assert.equal(m.source,input().source);assert.equal(materialSnapshot(s,m).text,text);assert.equal(personalMaterials(s,language).length,1);assert.equal((await prepareMaterial(input(language,text))).material.id,m.id)}
});
test('duplicates are detected, explicit copies are idempotent, and an edited original cannot be overwritten by reimport',async()=>{
 const p=await prepareMaterial(input());let s=putMaterial(fresh(),p);const duplicate=await prepareMaterial(input());assert.equal(duplicateMaterial(s,duplicate).id,p.material.id);assert.equal(putMaterial(s,duplicate),s);
 s=putMaterial(s,duplicate,true);assert.equal(personalMaterials(s).length,2);assert.equal(putMaterial(s,duplicate,true),s);
 const edit=await prepareMaterial(input('ja','新しい原文。'),p.material);s=putMaterial(s,edit);assert.equal(personalMaterial(s,p.material.id).version,2);
 // A distinct import may hash to an ID created before its original was edited.
 s=removeMaterial(s,personalMaterials(s).find(m=>m.id!==p.material.id).id);s=putMaterial(s,duplicate);assert.equal(personalMaterial(s,p.material.id).hash,edit.material.hash);assert.equal(personalMaterials(s).length,2);
});
test('editing/deleting retains old snapshots while stale editors and invalid anchors cannot overwrite current data',async()=>{
 const p=await prepareMaterial(input()),s=putMaterial(fresh(),p);const paragraph=p.snapshot.paragraphs[0];const tracked=saveMaterialProgress(s,p.material,paragraph.id);const edit=await prepareMaterial(input('ja','改訂した内容。\n\n次の段落。'),p.material);const changed=putMaterial(tracked,edit);
 assert.equal(snapshotById(changed,p.snapshot.id).text,p.snapshot.text);assert.equal(materialProgress(changed,p.material.id,1).paragraphId,paragraph.id);assert.throws(()=>putMaterial(changed,edit),/更新/);
 const deleted=removeMaterial(changed,p.material.id);assert.equal(personalMaterial(deleted,p.material.id),null);assert.ok(snapshotById(parseBackup(exportJSON(deleted)),p.snapshot.id));assert.throws(()=>putMaterial(deleted,edit),/削除|删除/);assert.equal(saveMaterialProgress(s,p.material,'unknown'),s);
});
test('UTF-8 import refuses invalid encoding, unsupported formats, empty/control content and excessive size without changing state',async()=>{
 assert.equal(decodeMaterialFile('test.MD',new TextEncoder().encode('# Title\n\nBody.')),'# Title\n\nBody.');assert.throws(()=>decodeMaterialFile('test.txt',new Uint8Array([0xff,0xfe])),/UTF-8/);assert.throws(()=>decodeMaterialFile('test.pdf',new Uint8Array()),/TXT/);assert.throws(()=>decodeMaterialFile('test.txt',new TextEncoder().encode('  ')),/非空/);assert.throws(()=>decodeMaterialFile('test.txt',new TextEncoder().encode('A\u0000B')),/控制/);await assert.rejects(()=>prepareMaterial(input('en','x'.repeat(12001))),/过长/);await assert.rejects(()=>prepareMaterial({...input(),title:''}),/标题/);
});
test('paragraph and conservative sentence boundaries preserve Japanese quotations, English abbreviations and decimal numbers',async()=>{
 const ja='「はい。まだです。」彼は答えた。次の話になった。';const sentences=materialSentences(ja,'ja');assert.equal(sentences[0].text,'「はい。まだです。」彼は答えた。');assert.equal(sentences.map(s=>s.text).join(''),ja);
 const en='Dr. Lee paid $3.50. Then he said, "Not yet. Wait!"';const parts=materialSentences(en,'en');assert.equal(parts[0].text,'Dr. Lee paid $3.50.');assert.equal(parts.map(s=>s.text).join(''),en);
 const p=await prepareMaterial(input('ja','同じ文。\n\n同じ文。'));assert.equal(new Set(p.snapshot.paragraphs.map(p=>p.id)).size,2);assert.deepEqual(materialParagraphs(p.snapshot).map(p=>p.text),['同じ文。','同じ文。']);
});
test('immutable snapshots survive concurrent edits under existing last-write conflict policy and deletion tombstones',async()=>{
 const original=await prepareMaterial(input()),base=putMaterial(fresh(),original);const [a,b]=await Promise.all([prepareMaterial(input('ja','端末Aの編集。'),original.material,2000),prepareMaterial(input('ja','端末Bの編集。'),original.material,3000)]);const merged=mergeStates(stampChanges(base,putMaterial(base,a),2000),stampChanges(base,putMaterial(base,b),3000));assert.equal(personalMaterial(merged,original.material.id).hash,b.material.hash);assert.ok(snapshotById(merged,a.snapshot.id));assert.ok(snapshotById(merged,b.snapshot.id));const deleted=stampChanges(merged,removeMaterial(merged,original.material.id),4000);assert.equal(personalMaterials(mergeStates(deleted,merged)).length,0);assert.ok(snapshotById(mergeStates(deleted,merged),original.snapshot.id));
});
