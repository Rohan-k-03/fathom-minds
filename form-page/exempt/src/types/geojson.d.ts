import { FeatureCollection, Polygon, MultiPolygon } from "geojson";

declare module "*.geojson" {
  const value: FeatureCollection<Polygon | MultiPolygon>;
  export default value;
}
