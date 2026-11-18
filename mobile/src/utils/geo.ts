/**
 * Geo utilities for EntregaFácil
 * Polyline encoding/decoding, distance calculations, bounding boxes
 */

/**
 * Decodes Google encoded polyline (polyline6) to array of [lat, lng]
 * @param encoded - Google encoded polyline string
 * @returns Array of { latitude, longitude } objects
 */
export function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    // Decode latitude delta
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    // Decode longitude delta
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push({
      latitude: lat / 1e6,
      longitude: lng / 1e6,
    });
  }

  return points;
}

/**
 * Encodes array of coordinates to Google encoded polyline (polyline6)
 * @param points - Array of { latitude, longitude } objects
 * @returns Google encoded polyline string
 */
export function encodePolyline(points: Array<{ latitude: number; longitude: number }>): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.latitude * 1e6);
    const lng = Math.round(point.longitude * 1e6);

    const dLat = lat - prevLat;
    const dLng = lng - prevLng;

    prevLat = lat;
    prevLng = lng;

    encoded += encodeValue(dLat);
    encoded += encodeValue(dLng);
  }

  return encoded;
}

function encodeValue(value: number): string {
  let encoded = '';
  value = value < 0 ? ~(value << 1) : (value << 1);

  while (value >= 0x20) {
    encoded += String.fromCharCode((value & 0x1f) | 0x20);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}

/**
 * Calculates distance between two points using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
}

/**
 * Calculates bearing between two points
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (θ * 180 / Math.PI + 360) % 360;
}

/**
 * Calculates destination point given start point, bearing and distance
 * @param lat - Start latitude
 * @param lng - Start longitude
 * @param bearing - Bearing in degrees
 * @param distance - Distance in meters
 * @returns Destination point { latitude, longitude }
 */
export function calculateDestination(lat: number, lng: number, bearing: number, distance: number): { latitude: number; longitude: number } {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat * Math.PI / 180;
  const λ1 = lng * Math.PI / 180;
  const θ = bearing * Math.PI / 180;
  const δ = distance / R;

  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    latitude: φ2 * 180 / Math.PI,
    longitude: λ2 * 180 / Math.PI,
  };
}

/**
 * Checks if a point is inside a polygon (ray casting algorithm)
 * @param point - Point to test { latitude, longitude }
 * @param polygon - Array of polygon vertices [{ latitude, longitude }]
 * @returns True if point is inside polygon
 */
export function isPointInPolygon(point: { latitude: number; longitude: number }, polygon: Array<{ latitude: number; longitude: number }>): boolean {
  let inside = false;
  const { latitude, longitude } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect = ((yi > latitude) !== (yj > latitude)) &&
      (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates bounding box of an array of points
 * @param points - Array of { latitude, longitude }
 * @returns Bounding box { minLat, maxLat, minLng, maxLng }
 */
export function calculateBounds(points: Array<{ latitude: number; longitude: number }>): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Calculates center of bounding box
 * @param bounds - Bounding box { minLat, maxLat, minLng, maxLng }
 * @returns Center point { latitude, longitude }
 */
export function getBoundsCenter(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): {
  latitude: number;
  longitude: number;
} {
  return {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2,
  };
}

/**
 * Formats distance for display
 * @param meters - Distance in meters
 * @returns Formatted string (e.g., "1.2 km" or "500 m")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats duration for display
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "1h 30min" or "45min")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Interpolates between two coordinates
 * @param coord1 - Start coordinate { latitude, longitude }
 * @param coord2 - End coordinate { latitude, longitude }
 * @param fraction - Fraction between 0 and 1
 * @returns Interpolated coordinate
 */
export function interpolateCoordinates(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
  fraction: number
): { latitude: number; longitude: number } {
  return {
    latitude: coord1.latitude + (coord2.latitude - coord1.latitude) * fraction,
    longitude: coord1.longitude + (coord2.longitude - coord1.longitude) * fraction,
  };
}

/**
 * Simplifies polyline using Douglas-Peucker algorithm
 * @param points - Array of coordinates
 * @param tolerance - Tolerance in meters
 * @returns Simplified array of coordinates
 */
export function simplifyPolyline(
  points: Array<{ latitude: number; longitude: number }>,
  tolerance: number = 10
): Array<{ latitude: number; longitude: number }> {
  if (points.length <= 2) return points;

  function perpendicularDistance(point: { latitude: number; longitude: number }, lineStart: { latitude: number; longitude: number }, lineEnd: { latitude: number; longitude: number }): number {
    const area = Math.abs(
      (lineEnd.longitude - lineStart.longitude) * (lineStart.latitude - point.latitude) -
      (lineStart.longitude - point.longitude) * (lineEnd.latitude - lineStart.latitude)
    );
    const length = Math.sqrt(
      Math.pow(lineEnd.longitude - lineStart.longitude, 2) +
      Math.pow(lineEnd.latitude - lineStart.latitude, 2)
    );
    return length === 0 ? 0 : area / length;
  }

  function simplify(start: number, end: number, result: Array<{ latitude: number; longitude: number }>) {
    let maxDist = 0;
    let index = 0;

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > tolerance) {
      simplify(start, index, result);
      result.push(points[index]);
      simplify(index, end, result);
    }
  }

  const result = [points[0]];
  simplify(0, points.length - 1, result);
  result.push(points[points.length - 1]);

  return result;
}

export default {
  decodePolyline,
  encodePolyline,
  calculateDistance,
  calculateBearing,
  calculateDestination,
  isPointInPolygon,
  calculateBounds,
  getBoundsCenter,
  formatDistance,
  formatDuration,
  interpolateCoordinates,
  simplifyPolyline,
};