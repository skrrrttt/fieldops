const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/**
 * Reverse geocode a coordinate to get road/place name
 */
async function reverseGeocode(coord: [number, number]): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const [lng, lat] = coord;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      // Extract just the street name from the full address
      const text: string = data.features[0].text || data.features[0].place_name || '';
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a segment name from start/end coordinates.
 * Returns something like "Main St" or "Main St to Oak Ave"
 */
export async function reverseGeocodeRoadName(
  start: [number, number],
  end: [number, number]
): Promise<string | null> {
  const [startName, endName] = await Promise.all([
    reverseGeocode(start),
    reverseGeocode(end),
  ]);

  if (!startName && !endName) return null;
  if (!startName) return endName;
  if (!endName) return startName;

  // Same road — just use the name
  if (startName === endName) return startName;

  // Different roads — show range
  return `${startName} to ${endName}`;
}
