// The root publisher may update the reviewed website and static XR client only.
// API code, project data, routing rules and dotfiles are never overlay targets.
export function allowedFrontendFile(name, routes) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(name) || name.startsWith('/') ||
      name.split('/').some(part => !part || part.startsWith('.'))) return false;
  return routes.has(name) || ['xr/living-objects.css','xr/pimo-editor.css','xr/pimo-reader-preview.css','xr/features/ar-demo/demoPreviewMarkup.js','xr/entry.js','robots.txt','sitemap.xml','404.html'].includes(name) ||
    /^site\/[a-zA-Z0-9_./-]+\.(js|mjs|css|json|webp)$/.test(name) ||
    /^xr\/(screens|services|v2|vendor)\/[a-zA-Z0-9_./-]+\.(html|js|mjs|css|json|webp|png|jpg|jpeg|svg|mp4|webm|wasm|bin|glb|gltf)$/.test(name);
}
