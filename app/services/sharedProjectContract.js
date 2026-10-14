export function validateSharedProject(value, expectedProjectId) {
    const fail=message=>{throw new Error(`Invalid shared project: ${message}`);};
    const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(value);
    if(value?.schemaVersion!==1||value.contract!=='nourishland.shared-project')fail('unsupported contract version');
    if(typeof value.revision!=='string'||!/^sha256:[a-f0-9]{64}$/.test(value.revision))fail('revision');
    if(!id(value.project?.id)||value.project.id!==expectedProjectId)fail('project identity');
    const text=value=>typeof value==='string';
    if(!text(value.project.name)||!text(value.project.description))fail('project content');
    if(!['sites','areas','records'].every(key=>Array.isArray(value[key])))fail('collections');
    const sites=new Set(),areas=new Set(),records=new Set();
    for(const site of value.sites){if(!id(site.id)||site.projectId!==expectedProjectId||sites.has(site.id)||!text(site.name)||!text(site.description))fail('site relationship');sites.add(site.id);}
    for(const area of value.areas){const key=JSON.stringify([area.siteId,area.id]);if(!id(area.id)||area.projectId!==expectedProjectId||!sites.has(area.siteId)||areas.has(key)||!text(area.name)||!text(area.description))fail('area relationship');areas.add(key);}
    for(const record of value.records){
        const key=JSON.stringify([expectedProjectId,record.siteId,record.areaId,record.recordId]);
        if(!id(record.recordId)||record.projectId!==expectedProjectId||!areas.has(JSON.stringify([record.siteId,record.areaId]))||record.id!==key||records.has(key))fail('record relationship');
        if(!['title','kind','knowledgeId','description','scientificName','markerId'].every(field=>text(record[field])))fail('record content');
        if(record.knowledgeId&&!id(record.knowledgeId)||record.markerId&&!id(record.markerId))fail('record references');
        if(!record.profile||typeof record.profile!=='object'||Array.isArray(record.profile))fail('profile');
        records.add(key);
    }
    return value;
}
