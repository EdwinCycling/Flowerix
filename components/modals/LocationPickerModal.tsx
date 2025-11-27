import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import { HomeLocation } from '../../types';
import { searchLocation, reverseGeocode } from '../../services/mapService';

// Declare Leaflet globally
declare const L: any;

interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    homeLocation: HomeLocation | null;
    setHomeLocation: (loc: HomeLocation | null) => void;
    showToast: (msg: string) => void;
    t: (key: string) => string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
    isOpen, onClose, homeLocation, setHomeLocation, showToast, t
}) => {
    const [locationSearchQuery, setLocationSearchQuery] = useState('');
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerInstanceRef = useRef<any>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>([52.3676, 4.9041]); // Default Amsterdam

    // Handle Map Logic
    useEffect(() => {
        if (isOpen) {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerInstanceRef.current = null;
            }

            setTimeout(() => {
                if (!mapContainerRef.current) return;

                const initialLat = homeLocation ? homeLocation.latitude : mapCenter[0];
                const initialLng = homeLocation ? homeLocation.longitude : mapCenter[1];
                const initialZoom = homeLocation ? 13 : 5;

                const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                map.on('click', async (e: any) => {
                    const { lat, lng } = e.latlng;
                    if (markerInstanceRef.current) {
                        markerInstanceRef.current.setLatLng([lat, lng]);
                    } else {
                        markerInstanceRef.current = L.marker([lat, lng]).addTo(map);
                    }

                    const geoResult = await reverseGeocode(lat, lng);
                    setHomeLocation({ 
                        latitude: lat, 
                        longitude: lng, 
                        name: geoResult?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        countryCode: geoResult?.countryCode
                    });
                });

                if (homeLocation) {
                    markerInstanceRef.current = L.marker([homeLocation.latitude, homeLocation.longitude]).addTo(map);
                }

                mapInstanceRef.current = map;
                map.invalidateSize();
            }, 100);
        } else {
            // Cleanup
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerInstanceRef.current = null;
            }
        }
    }, [isOpen]); // Re-run when modal opens

    // Sync map center if search updates
    useEffect(() => {
        if (mapInstanceRef.current && isOpen) {
            mapInstanceRef.current.setView(mapCenter, 13);
        }
    }, [mapCenter, isOpen]);

    const handleLocationSearch = async () => {
        if (!locationSearchQuery) return;
        const results = await searchLocation(locationSearchQuery);
        if (results.length > 0) {
            setMapCenter([results[0].lat, results[0].lon]);
        } else {
            showToast(t('location_search_error'));
        }
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                const geoResult = await reverseGeocode(latitude, longitude);
                const newLoc = { 
                    latitude, 
                    longitude, 
                    name: geoResult?.name || "Current Location",
                    countryCode: geoResult?.countryCode
                };
                setHomeLocation(newLoc);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([latitude, longitude], 13);
                    if (markerInstanceRef.current) {
                        markerInstanceRef.current.setLatLng([latitude, longitude]);
                    } else {
                        markerInstanceRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
                    }
                }
            }, (err) => {
                console.error(err);
                showToast("Could not get location. Check permissions.");
            });
        } else {
            showToast("Geolocation not supported");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-800 rounded-none md:rounded-2xl shadow-2xl w-full md:max-w-lg h-[100dvh] md:h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2 bg-white dark:bg-gray-800 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('set_location')}</h3>
                        <button onClick={onClose} className="text-gray-500"><Icons.X /></button>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={locationSearchQuery} onChange={(e) => setLocationSearchQuery(e.target.value)} placeholder={t('search_location')} className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()} />
                        <button onClick={handleLocationSearch} className="bg-blue-600 text-white px-3 py-2 rounded-lg"><Icons.Search className="w-4 h-4" /></button>
                        <button onClick={handleUseCurrentLocation} className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1"><Icons.Navigation className="w-4 h-4" /></button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t('location_privacy_subtitle')}</p>
                </div>
                <div className="flex-1 relative min-h-0 w-full">
                    <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-gray-100 dark:bg-gray-900" />
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    {homeLocation ? (
                        <div className="flex flex-col gap-2">
                            <div className="text-sm text-gray-700 dark:text-gray-300"><span className="font-bold">{t('location_set')}:</span> {homeLocation.name}</div>
                            <button onClick={onClose} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">{t('confirm')}</button>
                            <button onClick={() => { setHomeLocation(null); if (markerInstanceRef.current) markerInstanceRef.current.remove(); }} className="w-full py-2 text-red-500 text-sm">{t('remove_location')}</button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center">{t('tap_to_place')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};