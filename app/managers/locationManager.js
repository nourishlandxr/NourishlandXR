import { createLocation } from '../models/location.js';

export class LocationManager {
    constructor() {
        this.locations = [];
    }

    getAllLocations() {
        return this.locations;
    }

    getLocation(id) {
        return this.locations.find(location => location.id === id) || null;
    }

    createLocation(location) {
        const newLocation = createLocation(location);
        this.locations.push(newLocation);
        return newLocation;
    }

    updateLocation(location) {
        const index = this.locations.findIndex(existingLocation => existingLocation.id === location.id);

        if (index >= 0) {
            this.locations[index] = createLocation(location);
            return this.locations[index];
        }

        return null;
    }

    deleteLocation(id) {
        const initialLength = this.locations.length;
        this.locations = this.locations.filter(location => location.id !== id);
        return this.locations.length < initialLength;
    }
}
