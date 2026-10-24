import {validatePimoGraph,pimoGraphFromDocument,pimoId} from "./pimoGraph.js?v=0.9812";
import {createPimDocument,validatePimDocument} from "./pimModel.js?v=0.9812";
import {PIM_COMPASS} from "./pimCompass.js?v=0.9812";
import {applyPimoDesign} from "./pimoGraphDesigns.js?v=0.9812";
export function pimoGraphForPlant(document){
 const graph=pimoGraphFromDocument(document),saved=document.metadata?.editorCanvas;
 const seed=typeof saved?.identityNodeId==='string'&&!['__proto__','prototype','constructor'].includes(saved.identityNodeId)&&!graph.nodes.some(n=>n.id===saved.identityNodeId)?saved.identityNodeId:pimoId('identity');
 graph.metadata={originalHoneycomb:true,identityNodeId:seed,sourceDocumentMetadata:structuredClone(document.metadata||{}),sourceCreatedAt:document.createdAt};
 delete graph.metadata.sourceDocumentMetadata.editorCanvas;
 graph.nodes.unshift({id:seed,title:graph.identity.title,body:document.identity?.identityStatement||'',informationType:'category',status:'draft',sourceIds:[]});
 graph.layout.nodes[seed]={x:0,y:0,width:200,height:173,color:'#507869',shape:'hexagon',hexOrientation:'flat'};
 for(const node of document.nodes.filter(n=>!n.parentId))graph.edges.push({id:pimoId('link'),from:seed,to:node.id,kind:'branch',label:'',waypoints:[]});
 const known=new Set(graph.nodes.map(n=>n.id));for(const edge of document.metadata?.relationships||[])if(edge.kind==='relationship'&&known.has(edge.from)&&known.has(edge.to))graph.edges.push(structuredClone(edge));
 let arranged=applyPimoDesign(graph,'classic');
 if(saved?.layout){const restored=structuredClone(arranged);for(const node of restored.nodes)if(saved.layout.nodes?.[node.id])restored.layout.nodes[node.id]=structuredClone(saved.layout.nodes[node.id]);restored.layout.design=saved.layout.design||'classic';if(validatePimoGraph(restored).valid)arranged=restored;}
 const valid=validatePimoGraph(arranged);if(!valid.valid)throw Error(valid.errors[0]);return arranged;
}
// A projection for the real plant reader; the editor graph remains the source.
export function pimoGraphDocument(graph){
 const valid=validatePimoGraph(graph);if(!valid.valid)throw Error(valid.errors[0]);
 const seed=graph.metadata?.identityNodeId||(graph.metadata?.template?graph.nodes[0]?.id:null),parents=new Map(graph.edges.filter(edge=>edge.kind==='branch').map(edge=>[edge.to,edge.from]));
 const ids=new Map(),usedFamilies=new Set();
 for(const node of graph.nodes){
  if(node.id===seed)continue;
  const parent=parents.get(node.id),family=(!parent||parent===seed)&&PIM_COMPASS.find(f=>f.id===node.id||f.id===node.compassId||f.title.toLowerCase()===node.title.toLowerCase());
  if(family&&!usedFamilies.has(family.id)){ids.set(node.id,family.id);usedFamilies.add(family.id);}else ids.set(node.id,node.id);
 }
 const sources=structuredClone(graph.sources||[]);
 const nodes=graph.nodes.filter(node=>node.id!==seed).map(node=>{
  const parent=parents.get(node.id),sourceIds=[...(node.sourceIds||[])];
  if(/^https?:\/\//i.test(node.sourceUrl||'')){const id='editor-source-'+node.id;if(!sources.some(s=>s.id===id))sources.push({id,title:node.attribution||node.sourceUrl,url:node.sourceUrl});if(!sourceIds.includes(id))sourceIds.push(id);}
  return {...structuredClone(node),id:ids.get(node.id),parentId:parent&&parent!==seed?ids.get(parent):null,sourceIds,informationType:node.informationType==='topic'?(graph.edges.some(e=>e.kind==='branch'&&e.from===node.id)?'category':'fact'):node.informationType};
 });
 const identityCell=graph.nodes.find(n=>n.id===seed);
 const document=createPimDocument({id:graph.id,plantId:graph.identity.plantId||graph.legacy?.plantId||graph.id,identity:{...graph.identity,commonName:graph.identity.commonName||graph.identity.title,identityStatement:identityCell?identityCell.body:graph.identity.identityStatement||''},nodes,sources,
  metadata:{...graph.metadata?.sourceDocumentMetadata,editorGraphId:graph.id,editorCanvas:{identityNodeId:seed,layout:structuredClone(graph.layout)},relationships:graph.edges.filter(e=>e.kind==='relationship').map(e=>({...e,from:ids.get(e.from)||e.from,to:ids.get(e.to)||e.to}))},createdAt:graph.metadata?.sourceCreatedAt,updatedAt:graph.updatedAt});
 const checked=validatePimDocument(document);if(!checked.valid)throw Error(checked.errors[0]);return document;
}
