// Lightweight read-only connector for public NSW contour features.
// The display grid is interpolated from contours and remains distinct from a DEM.
export const NSW_CONTOUR_LAYER_URL='https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Elevation_and_Depth_Theme/FeatureServer/2/query';
export const SHEEPSTATION_BRINDLE_BOUNDS=Object.freeze({xmin:153.01,ymin:-28.422,xmax:153.08,ymax:-28.37,spatialReference:4326});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>typeof value==='number'&&Number.isFinite(value);

export function contourRequestUrl(bounds=SHEEPSTATION_BRINDLE_BOUNDS){
    const params=new URLSearchParams({where:'1=1',geometry:`${bounds.xmin},${bounds.ymin},${bounds.xmax},${bounds.ymax}`,
        geometryType:'esriGeometryEnvelope',inSR:String(bounds.spatialReference||4326),outSR:'4326',spatialRel:'esriSpatialRelIntersects',
        outFields:'elevation,capturesourcecode,verticalaccuracy,sourceprogram',returnGeometry:'true',geometryPrecision:'5',
        maxAllowableOffset:'0.00012',resultRecordCount:'1500',f:'json'});
    return `${NSW_CONTOUR_LAYER_URL}?${params}`;
}

export function terrainApiUrl(bounds=SHEEPSTATION_BRINDLE_BOUNDS){
    const base=typeof window!=='undefined'?(window.NOURISHLAND_CONFIG?.apiBase||(window.location.pathname==='/xr'||window.location.pathname.startsWith('/xr/')?'/xr-api':'/api')):'/api';
    const params=new URLSearchParams({bbox:[bounds.xmin,bounds.ymin,bounds.xmax,bounds.ymax].join(',')});
    return `${base}/terrain/contours?${params}`;
}

export async function fetchNswContourFeatures({bounds=SHEEPSTATION_BRINDLE_BOUNDS,signal}={}){
    const response=await fetch(terrainApiUrl(bounds),{signal,headers:{Accept:'application/json'}});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.error||`Nourishland terrain API returned ${response.status}.`);}
    const result=await response.json();
    if(result.error)throw new Error(result.error.message||'NSW contour query failed.');
    const features=(result.features||[]).filter(feature=>finite(Number(feature.attributes?.elevation))&&Array.isArray(feature.geometry?.paths));
    if(!features.length)throw new Error('No contour features were returned for this map area.');
    return {features,exceededTransferLimit:Boolean(result.exceededTransferLimit),bounds:result.bounds||bounds,source:result.source||NSW_CONTOUR_LAYER_URL,cached:Boolean(result.cached),cachedAt:result.cachedAt||null};
}

export function createContourTerrainGrid(features,bounds=SHEEPSTATION_BRINDLE_BOUNDS,{radius=6.3,segments=80,sampleLimit=2600}={}){
    const centerLat=(bounds.ymin+bounds.ymax)/2,centerLon=(bounds.xmin+bounds.xmax)/2,cos=Math.cos(centerLat*Math.PI/180),halfX=(bounds.xmax-bounds.xmin)*111320*cos/2,halfZ=(bounds.ymax-bounds.ymin)*110540/2;
    const scale=(radius*.88)/Math.hypot(halfX,halfZ),project=(lon,lat)=>({x:(lon-centerLon)*111320*cos*scale,z:(centerLat-lat)*110540*scale});
    const allLines=[],samples=[];
    for(const feature of features){const elevation=Number(feature.attributes?.elevation);if(!Number.isFinite(elevation))continue;for(const path of feature.geometry.paths){if(!Array.isArray(path)||path.length<2)continue;const points=path.filter(point=>Array.isArray(point)&&finite(Number(point[0]))&&finite(Number(point[1]))).map(point=>project(Number(point[0]),Number(point[1])));if(points.length<2)continue;allLines.push({elevation,points});}}
    if(!allLines.length)throw new Error('The contour response had no usable line geometry.');
    const min=Math.min(...allLines.map(line=>line.elevation)),max=Math.max(...allLines.map(line=>line.elevation)),range=Math.max(1,max-min);
    for(const line of allLines){const stride=Math.max(1,Math.floor(line.points.length/Math.max(2,Math.floor(sampleLimit/Math.min(120,allLines.length)))));for(let i=0;i<line.points.length;i+=stride)samples.push({...line.points[i],elevation:line.elevation});}
    if(samples.length>sampleLimit){const stride=Math.ceil(samples.length/sampleLimit);for(let i=samples.length-1;i>=0;i--)if(i%stride)samples.splice(i,1);}
    const count=clamp(Math.round(segments),32,96),size=count+1,step=radius*2/count,heights=new Float32Array(size*size);let gridMin=Infinity,gridMax=-Infinity;
    const metres=new Float32Array(size*size);
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
        const x=-radius+col*step,z=-radius+row*step,distances=[];let exact;
        for(const sample of samples){const dx=x-sample.x,dz=z-sample.z,d2=dx*dx+dz*dz;if(d2<1e-7){exact=sample.elevation;break;}let index=distances.length;while(index>0&&distances[index-1].d2>d2)index--;if(index<8){distances.splice(index,0,{d2,elevation:sample.elevation});if(distances.length>8)distances.pop();}}
        const weighted=exact??distances.reduce((sum,item)=>sum+item.elevation/(item.d2+.015),0)/distances.reduce((sum,item)=>sum+1/(item.d2+.015),0),normalized=clamp((weighted-(min+max)/2)/range*1.8,-.9,.9),index=row*size+col;
        heights[index]=normalized;metres[index]=weighted;gridMin=Math.min(gridMin,weighted);gridMax=Math.max(gridMax,weighted);
    }
    const contourLines=allLines.filter((line,index)=>index%Math.max(1,Math.ceil(allLines.length/80))===0).slice(0,80).map((line,index)=>{const stride=Math.max(1,Math.ceil((line.points.length-1)/31)),selected=line.points.filter((_,pointIndex)=>pointIndex===0||pointIndex%stride===0).slice(0,32);if(selected.at(-1)!==line.points.at(-1))selected.push(line.points.at(-1));return {id:`nsw-contour-${index}`,type:'contour',name:`${Math.round(line.elevation)} m AHD`,elevation:line.elevation,points:selected.map(({x,z})=>({x:clamp(x,-radius+.36,radius-.36),z:clamp(z,-radius+.36,radius-.36)})),size:.5};}).filter(line=>line.points.length>1);
    return {grid:{radius,shape:'circular',segments:count,size,step,heights,metres,min:-.9,max:.9,edits:[]},contourLines,elevation:{min,max,interpolatedMin:Math.round(gridMin),interpolatedMax:Math.round(gridMax),datum:'AHD',contourCount:allLines.length,sampleCount:samples.length},bounds,profile:{start:project(bounds.xmin,(bounds.ymin+bounds.ymax)/2),end:project(bounds.xmax,(bounds.ymin+bounds.ymax)/2)}};
}
