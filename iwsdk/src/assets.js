import { AssetType, defineAssets } from '@iwsdk/core';

const publicAssetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;

export default defineAssets({
  'pigeon-pea-pod': {
    url: publicAssetUrl('models/pigeon_pea_fresh_pod.glb'),
    type: AssetType.GLTF,
    name: 'Pigeon Pea fresh pod',
  },
  'welcome-panel': {
    url: publicAssetUrl('ui/welcome.uikitml'),
    type: AssetType.UIKitML,
    name: 'NLXR grab test panel',
  },
  'tutorial-wrist': {
    url: publicAssetUrl('ui/tutorial-wrist.uikitml'),
    type: AssetType.UIKitML,
    name: 'NLXR tutorial wrist controls',
    priority: 'lazy',
  },
});
