// @ts-nocheck
export function loadPropertiesFromJson(json) {
  if (!json || typeof json !== "object" || !Array.isArray(json.properties)) {
    throw new Error("Invalid format: expected { properties: [...] }");
  }

  return json.properties.map((p, i) => {
    for (const k of ["id", "label", "zone", "lot_size_m2", "frontage_m", "corner_lot", "setbacks_m"]) {
      if (!(k in p)) throw new Error(`Missing "${k}" in properties[${i}]`);
    }
    if (typeof p.id !== "string") throw new Error("id must be string");
    if (typeof p.label !== "string") throw new Error("label must be string");
    if (typeof p.zone !== "string") throw new Error("zone must be string");
    if (typeof p.lot_size_m2 !== "number") throw new Error("lot_size_m2 must be number");
    if (typeof p.frontage_m !== "number") throw new Error("frontage_m must be number");
    if (typeof p.corner_lot !== "boolean") throw new Error("corner_lot must be boolean");
    if (typeof p.setbacks_m !== "object" || p.setbacks_m === null) {
      throw new Error("setbacks_m must be object");
    }

    const latitude = typeof p.latitude === "number" ? p.latitude : undefined;
    const longitude = typeof p.longitude === "number" ? p.longitude : undefined;
    const zoneLabel = typeof p.zone_label === "string" ? p.zone_label : undefined;
    const overlaySource = typeof p.overlay_source === "string" ? p.overlay_source : null;
    const bal = typeof p.bal === "string" ? p.bal : "UNKNOWN";
    const floodCategory = typeof p.floodCategory === "string" ? p.floodCategory : "UNKNOWN";
    const floodControlLot = Boolean(p.floodControlLot);
    const foreshoreProximity = Boolean(p.foreshore_proximity);

    const prechecksDefaults = {
      heritage_item: false,
      heritage_conservation_area: false,
      environmentally_sensitive: false,
      critical_habitat: false,
      asbestos_management_area: false,
    };
    const prechecks = {
      ...prechecksDefaults,
      ...(typeof p.prechecks === "object" && p.prechecks !== null ? p.prechecks : {}),
    };

    const servicesDefaults = {
      near_easement: false,
      above_sewer_main: false,
      distance_to_dwelling_m: undefined,
    };
    const services = {
      ...servicesDefaults,
      ...(typeof p.services === "object" && p.services !== null ? p.services : {}),
    };

    return {
      id: p.id,
      label: p.label,
      zone: p.zone,
      zone_label: zoneLabel,
      lot_size_m2: p.lot_size_m2,
      frontage_m: p.frontage_m,
      corner_lot: p.corner_lot,
      setbacks_m: p.setbacks_m,
      latitude,
      longitude,
      bal,
      floodCategory,
      floodControlLot,
      prechecks,
      services,
      overlay_source: overlaySource,
      notes: p.notes ?? undefined,
      foreshore_proximity: foreshoreProximity,
    };
  });
}
