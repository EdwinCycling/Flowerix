




import { WeatherData, LogWeather, DailyWeather, PublicHoliday } from "../types";

// WMO Weather interpretation codes (v1)
// 0: Clear sky
// 1, 2, 3: Mainly clear, partly cloudy, and overcast
// 45, 48: Fog
// 51, 53, 55: Drizzle
// 61, 63, 65: Rain
// 71, 73, 75: Snow
// 80, 81, 82: Rain showers
// 95, 96, 99: Thunderstorm

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
    try {
        // Fetch current + forecast + history (28 past days)
        // past_days=28 will prepend 28 days of history to the daily array
        // Added sunshine_duration (seconds), sunrise, sunset, uv_index_max
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,relative_humidity_2m,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7&past_days=28`
        );
        const data = await response.json();
        
        if (data && data.current && data.daily) {
            const allDaily: DailyWeather[] = data.daily.time.map((time: string, index: number) => ({
                date: time,
                maxTemp: data.daily.temperature_2m_max[index],
                minTemp: data.daily.temperature_2m_min[index],
                weatherCode: data.daily.weather_code[index],
                precipitationSum: data.daily.precipitation_sum[index],
                sunshineDuration: data.daily.sunshine_duration ? data.daily.sunshine_duration[index] / 3600 : 0, // Convert seconds to hours
                sunrise: data.daily.sunrise ? data.daily.sunrise[index] : undefined,
                sunset: data.daily.sunset ? data.daily.sunset[index] : undefined,
                uvIndex: data.daily.uv_index_max ? data.daily.uv_index_max[index] : undefined
            }));

            // The API returns chronological data. 
            // With past_days=28, index 0 to 27 are past. Index 28 is today.
            // Ensure we don't crash if API returns partial data
            const todayIndex = 28;
            
            const history = allDaily.slice(0, todayIndex);
            const forecast = allDaily.slice(todayIndex); // Today + future

            return {
                current: {
                    temperature: data.current.temperature_2m,
                    weatherCode: data.current.weather_code,
                    isDay: data.current.is_day,
                    maxTemp: forecast[0]?.maxTemp || 0, 
                    minTemp: forecast[0]?.minTemp || 0,
                    humidity: data.current.relative_humidity_2m,
                    windSpeed: data.current.wind_speed_10m,
                    precipitation: data.current.precipitation,
                    uvIndex: forecast[0]?.uvIndex
                },
                forecast,
                history,
                updatedAt: new Date().toISOString()
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching weather:", error);
        return null;
    }
};

export const fetchWeatherForDate = async (lat: number, lon: number, dateStr: string): Promise<LogWeather | null> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // If date is today, use the Forecast API "current" endpoint for best accuracy right now
        if (dateStr === today) {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
            );
            const data = await response.json();
            if (data && data.current) {
                return {
                    temperature: data.current.temperature_2m,
                    weatherCode: data.current.weather_code,
                    isDay: data.current.is_day
                };
            }
        } else {
            // If date is in the past, use the Archive API
            const response = await fetch(
                `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,weather_code&timezone=auto`
            );
            const data = await response.json();
            
            if (data && data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max.length > 0) {
                // For historical, we store the MAX temperature as the reference "temperature"
                return {
                    temperature: data.daily.temperature_2m_max[0],
                    weatherCode: data.daily.weather_code[0],
                    isDay: 1 // Assume day for icon purposes
                };
            }
        }
        return null;
    } catch (error) {
        console.error("Error fetching historical weather:", error);
        return null;
    }
};

export const fetchHolidays = async (year: number, countryCode: string): Promise<PublicHoliday[]> => {
    try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data as PublicHoliday[];
    } catch (e) {
        console.error("Fetch Holidays Error", e);
        return [];
    }
};
