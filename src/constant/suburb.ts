export function toLatLng(coords: number[][]) {
    return coords.map(([lng, lat]) => ({ lat, lng }));
  }
  
  export function geoToUIRegions(geometry: any) {
    const regions: any[] = [];
  
    if (!geometry) return regions;
  
    // ---------- POLYGON ----------
    if (geometry.type === 'Polygon') {
      const [outer, ...holes] = geometry.coordinates;
  
      regions.push({
        base: toLatLng(outer),
        plus_regions: [],
        except_regions: holes.map(toLatLng)
      });
    }
  
    // ---------- MULTI POLYGON ----------
    if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) {
        const [outer, ...holes] = polygon;
  
        regions.push({
          base: toLatLng(outer),
          plus_regions: [],
          except_regions: holes.map(toLatLng)
        });
      }
    }
  
    return regions;
  }
  