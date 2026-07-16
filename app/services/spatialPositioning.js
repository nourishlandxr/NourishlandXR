const EARTH_RADIUS_METRES = 6371008.8;
const radians = degrees => Number(degrees) * Math.PI / 180;
const degrees = radiansValue => radiansValue * 180 / Math.PI;

function validCoordinate(point) {
    return Number.isFinite(Number(point?.latitude)) && Number.isFinite(Number(point?.longitude));
}

export function localEastNorth(origin, target) {
    if (!validCoordinate(origin) || !validCoordinate(target)) throw new Error('Valid origin and target coordinates are required.');
    const originLatitude = radians(origin.latitude);
    const targetLatitude = radians(target.latitude);
    const deltaLatitude = targetLatitude - originLatitude;
    const deltaLongitude = radians(target.longitude) - radians(origin.longitude);
    const meanLatitude = (originLatitude + targetLatitude) / 2;
    return {
        east: EARTH_RADIUS_METRES * Math.cos(meanLatitude) * deltaLongitude,
        north: EARTH_RADIUS_METRES * deltaLatitude
    };
}

export function reconstructGpsMarker(startingPoint, currentPosition, markerPosition, headingDegrees) {
    const heading = radians(headingDegrees);
    if (!Number.isFinite(heading)) throw new Error('A true-north device heading is required.');
    const current = localEastNorth(startingPoint, currentPosition);
    const marker = localEastNorth(startingPoint, markerPosition);
    const east = marker.east - current.east;
    const north = marker.north - current.north;
    const distance = Math.hypot(east, north);
    const bearing = (degrees(Math.atan2(east, north)) + 360) % 360;
    const x = east * Math.cos(heading) - north * Math.sin(heading);
    const z = -(north * Math.cos(heading) + east * Math.sin(heading));
    const uncertainty = Math.sqrt([startingPoint.accuracy, currentPosition.accuracy, markerPosition.accuracy].reduce((sum, value) => {
        const numeric = Number(value);
        return sum + (Number.isFinite(numeric) ? numeric * numeric : 0);
    }, 0));
    return { x, z, east, north, distance, bearing, uncertainty };
}

export function requestCurrentGps(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('GPS is unavailable on this device.'));
        navigator.geolocation.getCurrentPosition(position => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            captured_at: new Date(position.timestamp).toISOString()
        }), failure => reject(new Error(failure.code === 1 ? 'Location permission was denied.' : 'Current GPS position is unavailable.')), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000, ...options });
    });
}

export async function requestAbsoluteHeading(timeoutMs = 10000) {
    if (typeof DeviceOrientationEvent === 'undefined') throw new Error('Absolute device heading is unavailable.');
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') throw new Error('Device heading permission was denied.');
    }
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (result, error) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('deviceorientationabsolute', handle);
            window.removeEventListener('deviceorientation', handle);
            window.clearTimeout(timer);
            if (error) reject(error); else resolve(result);
        };
        const handle = event => {
            const webkitHeading = Number(event.webkitCompassHeading);
            if (Number.isFinite(webkitHeading)) return finish({ degrees: (webkitHeading + 360) % 360, accuracy: Number(event.webkitCompassAccuracy) || null });
            const alpha = Number(event.alpha);
            if (event.absolute === true && Number.isFinite(alpha)) finish({ degrees: (360 - alpha) % 360, accuracy: null });
        };
        const timer = window.setTimeout(() => finish(null, new Error('A reliable true-north heading could not be acquired.')), timeoutMs);
        window.addEventListener('deviceorientationabsolute', handle, true);
        window.addEventListener('deviceorientation', handle, true);
    });
}
