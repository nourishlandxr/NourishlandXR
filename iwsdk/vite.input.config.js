import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

export default defineConfig({
    plugins: [{
        name: 'nlxr-scoped-sdk-grab-imports',
        // The pinned compiled GrabSystem eagerly imports renderer/UI setup for
        // World.create(). NLXR supplies its own renderer and interaction world.
        // Omit only these side-effect imports; keep the SDK class unchanged.
        load(id) {
            if(!id.replaceAll('\\','/').endsWith('/@iwsdk/core/dist/grab/grab-system.js'))return null;
            return { code: readFileSync(id,'utf8').replace(/^import ['"][^'"]+['"];\r?$/gmu,''), map:null };
        },
        generateBundle(options,bundle) {
            for(const output of Object.values(bundle))if(output.type==='chunk' && (output.isEntry || output.name==='iwsdkInputAdapter') && Buffer.byteLength(output.code)>2_500_000){
                this.error('NLXR input/shared-renderer entry exceeds its 2.5 MB budget; keep optional systems in separate chunks.');
            }
        }
    }],
    resolve: {
        alias: [
            { find: /^three$/, replacement: fileURLToPath(new URL('./node_modules/three/build/three.module.js', import.meta.url)) },
            { find: /^@iwsdk\/xr-input$/, replacement: require.resolve('@iwsdk/xr-input') },
            { find: /^@iwsdk\/core$/, replacement: fileURLToPath(new URL('./grabSdk.js', import.meta.url)) }
        ],
        dedupe: ['three', '@pmndrs/pointer-events']
    },
    build: {
        outDir: '../app/vendor/iwsdk-input', emptyOutDir: true, target: 'esnext',
        lib: { entry: fileURLToPath(new URL('../app/services/iwsdkInputAdapter.js', import.meta.url)),
            formats: ['es'], fileName: () => 'index.js' },
        rollupOptions: {
            // Retain the selected grab exports, not core's unrelated eager
            // physics/UI initializers. These two modules install runtime hooks.
            treeshake: { moduleSideEffects: id => {
                const path=id.replaceAll('\\','/');
                if(/\/(?:@pmndrs\/(?:uikit[^/]*|msdfonts)|@drawcall\/uikitml)\//u.test(path))return false;
                return path.includes('/@iwsdk/core/dist/')
                    ? /\/(?:runtime\/three|ecs\/entity)\.js$/u.test(path) : null;
            } },
            output: { inlineDynamicImports: false }
        }
    }
});
