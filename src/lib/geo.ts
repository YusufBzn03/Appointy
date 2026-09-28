export type GeoPoint = { lat: number; lng: number };

export type LocationEntry = GeoPoint & { postalCode: string; city: string };

/**
 * Small hand-picked directory of the postal codes used in mock-data.ts — not a
 * real geocoding service. Powers both the postal-code autocomplete and the
 * "within X km" search filter. A postal code typed here that isn't in this list
 * falls back to a plain text match on city name in filterSalons().
 */
export const locations: LocationEntry[] = [
  { postalCode: "10115", city: "Berlin", lat: 52.5309, lng: 13.3846 },
  { postalCode: "20249", city: "Hamburg", lat: 53.5911, lng: 9.9942 },
  { postalCode: "80469", city: "München", lat: 48.1257, lng: 11.5716 },
  { postalCode: "50823", city: "Köln", lat: 50.9526, lng: 6.9095 },
  { postalCode: "60323", city: "Frankfurt am Main", lat: 50.118, lng: 8.6613 },
  { postalCode: "70197", city: "Stuttgart", lat: 48.7784, lng: 9.16 },
  { postalCode: "91757", city: "Treuchtlingen", lat: 48.9581, lng: 10.9101 },
  { postalCode: "91781", city: "Weißenburg in Bayern", lat: 49.0333, lng: 10.9667 },
  { postalCode: "91710", city: "Gunzenhausen", lat: 49.1167, lng: 10.75 },
];

export const postalCodeGeo: Record<string, GeoPoint> = Object.fromEntries(
  locations.map((l) => [l.postalCode, { lat: l.lat, lng: l.lng }])
);

/** Postal codes (prefix match) or city names (substring match) starting with `query`. */
export function suggestLocations(query: string, limit = 6): LocationEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return locations
    .filter((l) => l.postalCode.startsWith(q) || l.city.toLowerCase().includes(q))
    .slice(0, limit);
}

/** Postal code with an exact, unambiguous match in `locations`, if any. */
export function exactLocationMatch(query: string): LocationEntry | undefined {
  const q = query.trim();
  return locations.find((l) => l.postalCode === q);
}

/** Great-circle distance in kilometers (Haversine formula). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
