// @vitest-environment node
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {createHouseDataProvider,definitions,hrQuery,readHR,type HouseRuntime,type Resource} from '../src/house';

// Captured from the actual current official Runtime read-side over all 24 licensed
// fixture documents and the unchanged HR schema; not a hand-shaped query mock.
const native=JSON.parse(readFileSync(new URL('./support/native-full-fields.json',import.meta.url),'utf8'));
it('loads the complete native fields:all projection, retaining exact snapshots without exposing type as an editable business field',()=>{
  expect(native.query).toEqual(hrQuery);
  expect(native.result.documents).toHaveLength(24);
  expect(native.result.documents.every((document:any)=>document.fields.type===document.type)).toBe(true);
  const original=structuredClone(native.result);
  const db=readHR(native.result,native.room);
  expect([db.teams.length,db.employees.length,db['time-offs'].length]).toEqual([4,5,15]);
  for(const document of native.result.documents){
    const resource=(Object.keys(definitions) as Resource[]).find(key=>definitions[key].type===document.type)!;
    const row=db[resource].find(value=>value.id===document.fields.id)!;
    expect(row.type).toBeUndefined();
    expect(row._house).toEqual({room:native.room,path:document.path,type:document.type,fields:document.fields,markdown:document.markdown});
  }
  expect(native.result).toEqual(original);
});
it.each(Object.keys(definitions) as Resource[])('keeps %s discriminator mismatches and undeclared business fields invalid',resource=>{
  for(const type of ['wrong_type',null,undefined,12]){
    const result=structuredClone(native.result);
    const document=result.documents.find((value:any)=>value.type===definitions[resource].type);
    document.fields.type=type;
    expect(()=>readHR(result,native.room)).toThrow('discriminator');
  }
  const result=structuredClone(native.result);
  result.documents.find((value:any)=>value.type===definitions[resource].type).fields.unknown_business_field='still rejected';
  expect(()=>readHR(result,native.room)).toThrow(`Unsupported ${resource} field: unknown_business_field`);
});
it('updates from a full native snapshot with exact business-field bases and no discriminator write',async()=>{
  const md={query:vi.fn(async()=>structuredClone(native.result)),roomDraft:{read:vi.fn(async()=>null),write:vi.fn(async(_room:string,path:string,_revision:unknown,parts:unknown)=>({outcome:'written',roomDraft:{path,revision:'draft-exact',parts}}))},save:vi.fn(async()=>({outcome:'saved',identifier:'queued-local'}))};
  const provider=createHouseDataProvider(md as unknown as HouseRuntime,native.room);
  const opened=readHR(native.result,native.room)['time-offs'][0];
  await provider.update({resource:'time-offs',id:opened.id,variables:{notes:'Updated locally'},meta:{opened}});
  const parts=md.roomDraft.write.mock.calls[0][3] as any;
  expect(parts.fields.notes).toEqual({value:'Updated locally',base:{value:opened.notes}});
  expect(parts.fields).not.toHaveProperty('type');
  expect(md.save).toHaveBeenCalledWith(native.room,[{path:opened._house!.path,revision:'draft-exact'}]);
});
