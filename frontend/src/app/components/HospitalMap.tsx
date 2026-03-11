import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { MapPin, Navigation, X, Info } from 'lucide-react';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'motion/react';

// Fix leaflet default icon issue (if needed, but we use custom icons)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 };

const HOSPITALS_DATA = [
  { name: "Government General Hospital", lat: 13.0732, lng: 80.2609 },
  { name: "Rajiv Gandhi Government General Hospital", lat: 13.0839, lng: 80.2785 },
  { name: "Stanley Medical College Hospital", lat: 13.1116, lng: 80.2891 },
  { name: "Institute of Child Health", lat: 13.0712, lng: 80.2756 },
  { name: "Government Kilpauk Medical College Hospital", lat: 13.0841, lng: 80.2396 },
  { name: "Government Royapettah Hospital", lat: 13.0508, lng: 80.2667 },
  { name: "Government Omandurar Multi Speciality Hospital", lat: 13.0712, lng: 80.2631 },
  { name: "ESI Hospital Ashok Nagar", lat: 13.0339, lng: 80.2126 },
  { name: "Government Peripheral Hospital KK Nagar", lat: 13.0442, lng: 80.1948 },
  { name: "Government Peripheral Hospital Chromepet", lat: 12.9516, lng: 80.1462 },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

interface HospitalMapProps {
  onClose: () => void;
}

export default function HospitalMap({ onClose }: HospitalMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortedHospitals, setSortedHospitals] = useState<any[]>([]);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    // Get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          initializeMap(coords);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setUserLocation(null);
          initializeMap(CHENNAI_CENTER);
        }
      );
    } else {
      initializeMap(CHENNAI_CENTER);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initializeMap = (center: { lat: number; lng: number }) => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initial hospital sort based on provided center
    updateHospitalsList(center);

    // Add User Marker if available
    addUserMarker(center, center.lat !== CHENNAI_CENTER.lat);

    // Add Hospital Markers
    addHospitalMarkers(center);
  };

  const updateHospitalsList = (currentCenter: { lat: number; lng: number }) => {
    const list = HOSPITALS_DATA.map(h => ({
      ...h,
      distance: getDistance(currentCenter.lat, currentCenter.lng, h.lat, h.lng)
    })).sort((a, b) => a.distance - b.distance);
    setSortedHospitals(list);
  };

  const addUserMarker = (coords: { lat: number; lng: number }, isActual: boolean) => {
    if (!mapRef.current) return;

    const userIcon = L.divIcon({
      className: 'custom-user-icon',
      html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const label = isActual ? "You are here" : "Chennai Center (Default)";
    
    L.marker([coords.lat, coords.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup(`<strong>${label}</strong>`)
      .openPopup();
  };

  const addHospitalMarkers = (currentCenter: { lat: number; lng: number }) => {
    if (!mapRef.current) return;

    const hospitalIcon = L.divIcon({
      className: 'custom-hospital-icon',
      html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; border-radius: 50%; background-color: white;"></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    HOSPITALS_DATA.forEach(h => {
      const distance = getDistance(currentCenter.lat, currentCenter.lng, h.lat, h.lng);
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
      
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-bold text-gray-900 mb-1">${h.name}</h3>
          <div class="flex items-center gap-2 mb-2">
            <span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">Government Hospital</span>
          </div>
          <p class="text-sm text-gray-600 mb-3 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            ${distance} km away
          </p>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" 
             style="display: block; width: 100%; text-align: center; background-color: #0f172a; color: white; padding: 8px; border-radius: 6px; font-size: 0.875rem; font-weight: 500; text-decoration: none;">
            Get Directions
          </a>
        </div>
      `;

      const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon })
        .addTo(mapRef.current!)
        .bindPopup(popupContent);
      
      markersRef.current[h.name] = marker;
    });
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(coords);
        if (mapRef.current) {
          mapRef.current.flyTo([coords.lat, coords.lng], 15);
          updateHospitalsList(coords);
        }
      });
    }
  };

  const handleHospitalClick = (hospital: any) => {
    if (mapRef.current) {
      mapRef.current.flyTo([hospital.lat, hospital.lng], 15);
      const marker = markersRef.current[hospital.name];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col pt-16">
      <div className="absolute top-0 left-0 right-0 h-16 border-b bg-white flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <MapPin className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Government Hospitals in Chennai</h2>
            <p className="text-sm text-gray-500">Find nearest medical facilities</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-6xl mx-auto p-6 space-y-6 pb-24">
          
          <div className="relative group overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
            <div 
              id="hospital-map" 
              ref={mapContainerRef} 
              className="w-full" 
              style={{ height: '500px', zIndex: 1 }}
            />
            
            <button 
              onClick={handleLocateMe}
              className="absolute bottom-6 right-6 z-[1000] bg-white p-3 rounded-xl shadow-lg hover:bg-slate-50 transition-colors border border-slate-200 group/btn"
              title="Locate Me"
            >
              <Navigation className="w-6 h-6 text-blue-600 group-hover/btn:scale-110 transition-transform" />
            </button>

            <div className="absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 text-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                Legend
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white ring-1 ring-blue-500/30"></div>
                  <span>You are here</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white ring-1 ring-red-500/30"></div>
                  <span>Government Hospital</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Nearby Hospitals</h3>
              <Badge variant="secondary" className="px-3 py-1 font-medium bg-blue-50 text-blue-700 hover:bg-blue-100">
                Sorted by Distance
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {sortedHospitals.map((hospital, index) => (
                  <motion.div
                    key={hospital.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleHospitalClick(hospital)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{hospital.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100 uppercase tracking-tight">Government</Badge>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-sm font-semibold text-blue-600">{hospital.distance} km</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Navigation className="w-5 h-5" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
