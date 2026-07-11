export class Site {
    constructor(siteOrId, name) {
        if (typeof siteOrId === 'object' && siteOrId !== null) {
            this.id = siteOrId.id;
            this.name = siteOrId.name;
            this.locations = siteOrId.locations || [];
            this.template = siteOrId.template || '';
        } else {
            this.id = siteOrId;
            this.name = name;
            this.locations = [];
            this.template = '';
        }
    }
}

export function createSite(siteOrId, name) {
    return new Site(siteOrId, name);
}
