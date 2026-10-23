import {parse} from 'acorn';

// Cache versions must follow the module graph, not just the entry script.
export function versionModuleImports(source,version){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 function walk(node){
  if(!node||typeof node!=='object')return;
  if(['ImportDeclaration','ImportExpression','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)){
   const target=node.source,value=target?.value;
   if(typeof value==='string'&&/^(?:\.\.?\/|\/site\/|\/xr\/services\/)/.test(value)&&/\.(?:m?js)(?:\?|$)/.test(value)){
    const [pathname,query='']=value.split('?'),params=new URLSearchParams(query);params.set('v',version);
    edits.push({start:target.start,end:target.end,text:JSON.stringify(pathname+'?'+params)});
   }
  }
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
 }
 walk(ast);for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
 return source;
}

export function versionCssImports(source,version){
 return source.replace(/(@import\s+(?:url\(\s*)?["'])([^"'?]+\.css)(?:\?[^"']*)?(["'])/g,`$1$2?v=${version}$3`);
}
