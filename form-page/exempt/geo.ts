import * as turf from "@turf/turf";
import { Feature, Polygon, MultiPolygon } from "geojson";
import zoningData from "./geo_data_sample/LEP__Land_Zoning.geojson";

// Geocode the address using OpenStreetMap Nominatim
async function geocodeAddress(address: string): Promise<[number, number]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data || data.length === 0) {
    throw new Error("Address not found");
  }

  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

// Find the zone containing the point
async function findZone(address: string) {
  const [lon, lat] = await geocodeAddress(address);
  const point = turf.point([lon, lat]);

  for (const feature of zoningData.features) {
    // ✅ Feature is already typed as Polygon | MultiPolygon from geojson.d.ts
    if (turf.booleanPointInPolygon(point, feature as Feature<Polygon | MultiPolygon>)) {
      return feature.properties; // e.g., ZONE, EVIEW_DISP
    }
  }

  return null; // address not inside any zone
}

// Example usage
(async () => {
  const address = "123 Main St, Sydney NSW";

  try {
    const zone = await findZone(address);
    if (zone) {
      console.log(
        "This address is in zone:",
        zone.ZONE,
        "-",
        zone.EVIEW_DISP
      );
    } else {
      console.log("Address not inside any zoning polygon");
    }
  } catch (err) {
    console.error(err);
  }
})();
