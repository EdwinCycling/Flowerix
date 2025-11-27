

// Service to interact with OpenStreetMap Nominatim API
export const searchLocation = async (query: string) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return data.map((item: any) => ({
                name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            }));
        }
        return [];
    } catch (error) {
        console.error("Error searching location:", error);
        return [];
    }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<{ name: string, countryCode?: string } | null> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
        const data = await response.json();
        
        return {
            name: data.display_name || "Unknown Location",
            countryCode: data.address?.country_code ? data.address.country_code.toUpperCase() : undefined
        };
    } catch (error) {
        console.error("Error reverse geocoding:", error);
        return null;
    }
};
