export const DEVELOPER_TOOLS_KEY='nxr-developer-tools';
export function developerToolsEnabled(){try{return localStorage.getItem(DEVELOPER_TOOLS_KEY)==='true';}catch{return false;}}
export async function developerLabSession(){const {API_BASE,HOSTED_MODE,apiFetch}=await import('./apiClient.js');const response=await apiFetch(`${API_BASE}/auth/session`);if(!response.ok)throw Error('Developer login is unavailable.');const session=await response.json();if(HOSTED_MODE && session.authDisabled)throw Error('Developer Lab requires server password protection to be enabled.');return session.authenticated===true;}
export async function requireDeveloperLabSession(){if(!await developerLabSession())throw Error('Sign in to Developer Lab first.');}
