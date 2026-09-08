"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COTABATO_CENTER: [number, number] = [7.2047, 124.2310];

// Refined bounds for Cotabato City area - fixed orientation [lat, lng]
const COTABATO_BOUNDS_COORDS: [[number, number], [number, number]] = [
  [7.1430, 124.1800], // Southwest (Lower Latitude, Lower Longitude)
  [7.2800, 124.2800]  // Northeast (Higher Latitude, Higher Longitude)
];

const COTABATO_BARANGAYS = [
  { name: 'Bagua I', lat: 7.2275, lng: 124.2366 },
  { name: 'Bagua II', lat: 7.2189, lng: 124.2352 },
  { name: 'Bagua III', lat: 7.2215, lng: 124.2429 },
  { name: 'Mother Bagua', lat: 7.2240, lng: 124.2462 },
  { name: 'Kalanganan I', lat: 7.2580, lng: 124.2010 },
  { name: 'Kalanganan II', lat: 7.2650, lng: 124.1850 },
  { name: 'Mother Kalanganan', lat: 7.2501, lng: 124.2063 },
  { name: 'Poblacion I', lat: 7.2255, lng: 124.2440 },
  { name: 'Poblacion II', lat: 7.2230, lng: 124.2465 },
  { name: 'Poblacion III', lat: 7.2205, lng: 124.2490 },
  { name: 'Poblacion IV', lat: 7.2180, lng: 124.2515 },
  { name: 'Poblacion V', lat: 7.2155, lng: 124.2540 },
  { name: 'Poblacion VI', lat: 7.2130, lng: 124.2565 },
  { name: 'Poblacion VII', lat: 7.2105, lng: 124.2590 },
  { name: 'Poblacion VIII', lat: 7.2080, lng: 124.2615 },
  { name: 'Poblacion IX', lat: 7.2055, lng: 124.2640 },
  { name: 'Mother Poblacion', lat: 7.2215, lng: 124.2543 },
  { name: 'Rosary Heights I', lat: 7.2206, lng: 124.2461 },
  { name: 'Rosary Heights II', lat: 7.2150, lng: 124.2450 },
  { name: 'Rosary Heights III', lat: 7.2137, lng: 124.2540 },
  { name: 'Rosary Heights IV', lat: 7.2134, lng: 124.2474 },
  { name: 'Rosary Heights V', lat: 7.2103, lng: 124.2489 },
  { name: 'Rosary Heights VI', lat: 7.2049, lng: 124.2480 },
  { name: 'Rosary Heights VII', lat: 7.1977, lng: 124.2445 },
  { name: 'Rosary Heights VIII', lat: 7.1898, lng: 124.2432 },
  { name: 'Rosary Heights IX', lat: 7.2080, lng: 124.2410 },
  { name: 'Rosary Heights X', lat: 7.2059, lng: 124.2366 },
  { name: 'Rosary Heights XI', lat: 7.2037, lng: 124.2297 },
  { name: 'Rosary Heights XII', lat: 7.2164, lng: 124.2384 },
  { name: 'Rosary Heights XIII', lat: 7.2000, lng: 124.2250 },
  { name: 'Mother Rosary Heights', lat: 7.2104, lng: 124.2437 },
  { name: 'Tamontaka I', lat: 7.1950, lng: 124.2150 },
  { name: 'Tamontaka II', lat: 7.1900, lng: 124.2100 },
  { name: 'Tamontaka III', lat: 7.1850, lng: 124.2050 },
  { name: 'Tamontaka IV', lat: 7.1800, lng: 124.2000 },
  { name: 'Tamontaka V', lat: 7.1750, lng: 124.1950 },
  { name: 'Mother Tamontaka', lat: 7.1825, lng: 124.2238 },
];

interface AddressMapProps {
  address: string;
  selectedBarangay?: string;
  onAddressChange: (address: string, barangay: string) => void;
  error?: string;
}

export default function AddressMap({ address, selectedBarangay, onAddressChange, error }: AddressMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const onAddressChangeRef = useRef(onAddressChange);
  const [isLocating, setIsLocating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    onAddressChangeRef.current = onAddressChange;
  }, [onAddressChange]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const findNearestBarangay = useCallback((lat: number, lng: number) => {
    let nearest = COTABATO_BARANGAYS[0];
    let minDist = Infinity;
    for (const b of COTABATO_BARANGAYS) {
      const dist = Math.sqrt(Math.pow(b.lat - lat, 2) + Math.pow(b.lng - lng, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = b;
      }
    }
    return nearest;
  }, []);

  const getAddressFromCoords = async (lat: number, lng: number) => {
    setIsLocating(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'OSCALink-App'
          }
        }
      );
      const data = await response.json();
      if (data && data.display_name) return data.display_name;
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsLocating(false);
    }
    return null;
  };

  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    if (!mapInstance.current) return;

    // Boundary Validation Logic
    const bounds = L.latLngBounds(COTABATO_BOUNDS_COORDS);
    if (!bounds.contains(e.latlng)) {
      setLocalError("Location is outside Cotabato City area. Please select a valid location.");
      return;
    }
    
    setLocalError(null);

    if (markerInstance.current) {
      markerInstance.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.7C12 21.7 20 14.3 20 8C20 3.6 16.4 0 12 0C7.6 0 4 3.6 4 8C4 14.3 12 21.7 12 21.7ZM12 12C9.8 12 8 10.2 8 8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8C16 10.2 14.2 12 12 12Z" fill="#3b82f6" stroke="white" stroke-width="0.5"/>
            <circle cx="12" cy="8" r="3.5" fill="white"/>
          </svg>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      markerInstance.current = L.marker([lat, lng], { icon }).addTo(mapInstance.current);
    }

    const accurateAddress = await getAddressFromCoords(lat, lng);
    
    // Check if the OSM result already contains a barangay name
    let detectedBarangay = '';
    if (accurateAddress) {
      const addrLower = accurateAddress.toLowerCase();
      const match = COTABATO_BARANGAYS.find(b => {
        const bName = b.name.toLowerCase();
        // Check for specific matches like "Rosary Heights 12" or "Mother Bagua"
        if (bName.includes('mother')) {
          const base = bName.replace('mother', '').trim();
          return addrLower.includes(`mother ${base}`) || addrLower.includes(`${base} mother`);
        }
        // Handle numbered barangays (12 vs XII)
        const simplifiedName = bName.replace('rosary heights', 'rh').trim();
        return addrLower.includes(bName) || addrLower.includes(simplifiedName);
      });
      if (match) detectedBarangay = match.name;
    }

    // Fallback to nearest-neighbor if OSM doesn't specify a known barangay
    if (!detectedBarangay) {
      const nearest = findNearestBarangay(lat, lng);
      detectedBarangay = nearest.name;
    }
    
    if (accurateAddress) {
      onAddressChangeRef.current(accurateAddress, detectedBarangay);
    } else {
      const fallbackAddr = `${detectedBarangay}, Cotabato City`;
      onAddressChangeRef.current(fallbackAddr, detectedBarangay);
    }
  }, [findNearestBarangay]);

  useEffect(() => {
    if (selectedBarangay && mapInstance.current) {
      const b = COTABATO_BARANGAYS.find(curr => curr.name === selectedBarangay);
      if (b) {
        // Use flyTo for a smoother, more reliable movement and ensure zoom is high enough
        mapInstance.current.flyTo([b.lat, b.lng], 16, {
          duration: 1.5
        });
        
        // Also place or move marker
        if (markerInstance.current) {
          markerInstance.current.setLatLng([b.lat, b.lng]);
        } else {
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.7C12 21.7 20 14.3 20 8C20 3.6 16.4 0 12 0C7.6 0 4 3.6 4 8C4 14.3 12 21.7 12 21.7ZM12 12C9.8 12 8 10.2 8 8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8C16 10.2 14.2 12 12 12Z" fill="#3b82f6" stroke="white" stroke-width="0.5"/>
                <circle cx="12" cy="8" r="3.5" fill="white"/>
              </svg>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });
          markerInstance.current = L.marker([b.lat, b.lng], { icon }).addTo(mapInstance.current);
        }

        // Force a layout recalculation to ensure marker is visible
        setTimeout(() => {
          mapInstance.current?.invalidateSize();
        }, 100);
      }
    }
  }, [selectedBarangay]);

  useEffect(() => {
    if (!isMounted || !mapRef.current || mapInstance.current) return;

    const container = mapRef.current;
    
    // Geofenced Map Initialization
    const map = L.map(container, {
      center: COTABATO_CENTER,
      zoom: 14,
      minZoom: 13,
      maxZoom: 18,
      zoomControl: false,
      maxBounds: COTABATO_BOUNDS_COORDS,
      maxBoundsViscosity: 1.0 // Bounces user back if they try to pan outside
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      className: 'map-tiles-dark',
      noWrap: true,
      bounds: COTABATO_BOUNDS_COORDS
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstance.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      handleMapClick(e);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    map.invalidateSize();
    setTimeout(() => {
      map.invalidateSize();
      // Ensure we start with a clean state and centered correctly
      map.setView(COTABATO_CENTER, 14);
    }, 500);

    return () => {
      resizeObserver.disconnect();
      map.off();
      map.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
  }, [isMounted, handleMapClick]);

  if (!isMounted) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">location_on</span>
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value, '')}
          placeholder={isLocating ? "Locating address..." : "Enter address or tap map below"}
          className={`w-full bg-surface-low border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-foreground text-sm placeholder:text-outline focus:outline-none transition-all ${
            (error || localError) ? 'border border-red-500' : ''
          } ${isLocating ? 'animate-pulse' : ''}`}
        />
        {isLocating && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {(error || localError) && (
        <p className="text-red-400 text-xs mt-1 font-bold animate-pulse">
          {localError || error}
        </p>
      )}

      <div 
        className="w-full relative rounded-xl overflow-hidden border-2 border-outline-variant/30 shadow-inner"
        style={{ height: '300px', background: '#0e141b' }}
      >
        <div 
          ref={mapRef} 
          className="absolute inset-0 z-0"
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] text-outline uppercase tracking-wider font-bold">
          {isLocating ? '🔍 Validating Location...' : '🔒 Map Restricted to Cotabato City'}
        </p>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">
          ✓ Geofence Active
        </p>
      </div>

      <style>{`
        .leaflet-container {
          background: #0e141b !important;
        }
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .leaflet-bar a {
          background-color: #1a2027 !important;
          color: #9ca3af !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-bar a:hover {
          background-color: #242a32 !important;
          color: white !important;
        }
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}