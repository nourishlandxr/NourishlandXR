export class Location {
    constructor(locationOrId, name, type) {
        if (typeof locationOrId === 'object' && locationOrId !== null) {
            this.id = locationOrId.id;
            this.name = locationOrId.name;
            this.type = locationOrId.type;
        } else {
            this.id = locationOrId;
            this.name = name;
            this.type = type;
        }
    }
}

export function createLocation(locationOrId, name, type) {
    return new Location(locationOrId, name, type);
}
