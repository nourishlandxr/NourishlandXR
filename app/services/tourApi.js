import {API_BASE,apiFetch} from './apiClient.js';
export async function tourRequest(projectId,{id='',action='',visitor=false,body}={}){
    const response=await apiFetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/tours${id?'/'+encodeURIComponent(id):''}${action?'/'+action:''}${visitor?'?view=visitor':''}`,body?{method:action?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
    const value=await response.json();if(!response.ok){const error=Error(value.error||'Tour request failed.');error.status=response.status;throw error;}return value;
}
