let visitor={name:'',favouriteFruit:''};
export const getZinniaVisitor=()=>({...visitor});
export function resetZinniaVisitor(){visitor={name:'',favouriteFruit:''};}
export function rememberZinniaVisitor(values){visitor={...visitor,...values};return getZinniaVisitor();}
