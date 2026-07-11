export class Asset {
    constructor(assetOrId, name, category) {
        if (typeof assetOrId === 'object' && assetOrId !== null) {
            this.id = assetOrId.id;
            this.name = assetOrId.name;
            this.category = assetOrId.category;
        } else {
            this.id = assetOrId;
            this.name = name;
            this.category = category;
        }
    }
}

export function createAsset(assetOrId, name, category) {
    return new Asset(assetOrId, name, category);
}
