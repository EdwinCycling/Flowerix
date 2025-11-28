



import React, { useState } from 'react';
import { Icons } from '../Icons';
import { WeatherData, HomeLocation, TempUnit, LengthUnit } from '../../types';

interface WeatherWidgetProps {
    weather: WeatherData | null;
    homeLocation: HomeLocation | null;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    tempUnit?: TempUnit;
    lengthUnit?: LengthUnit;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weather, homeLocation, lang, t, tempUnit = 'C', lengthUnit = 'mm' }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!weather || !homeLocation) return null;

    const formatTemp = (temp: number) => {
        if (tempUnit === 'F') {
            return Math.round(temp * 9/5 + 32);
        }
        return Math.round(temp);
    };

    // Convert mm to inches if needed. Open-Meteo defaults to mm.
    const formatLength = (val: number | undefined) => {
        if (val === undefined) return 0;
        if (lengthUnit === 'in') {
            return (val / 25.4).toFixed(2);
        }
        return val.toFixed(1);
    };

    const getWeatherIcon = (code: number) => {
        if (code === 0) return <Icons.Sun className="w-full h-full text-yellow-500" />;
        if (code >= 1 && code <= 3) return <Icons.Cloud className="w-full h-full text-gray-400" />;
        if ([45, 48].includes(code)) return <Icons.CloudFog className="w-full h-full text-gray-400" />;
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <Icons.CloudRain className="w-full h-full text-blue-400" />;
        if ([71, 73, 75].includes(code)) return <Icons.CloudSnow className="w-full h-full text-white" />;
        if ([95, 96, 99].includes(code)) return <Icons.CloudLightning className="w-full h-full text-purple-500" />;
        return <Icons.Sun className="w-full h-full text-yellow-500" />;
    };

    const getWeatherDesc = (code: number) => {
        const mappings: Record<number, string> = {
            0: t('weather_clear'),
            1: t('weather_cloudy'), 2: t('weather_cloudy'), 3: t('weather_cloudy'),
            45: t('weather_fog'), 48: t('weather_fog'),
            51: t('weather_rain'), 53: t('weather_rain'), 55: t('weather_rain'), 61: t('weather_rain'), 63: t('weather_rain'), 65: t('weather_rain'), 80: t('weather_rain'), 81: t('weather_rain'), 82: t('weather_rain'),
            71: t('weather_snow'), 73: t('weather_snow'), 75: t('weather_snow'),
            95: t('weather_storm'), 96: t('weather_storm'), 99: t('weather_storm')
        };
        return mappings[code] || t('weather_clear');
    };

    return (
        <div className="px-3 py-2 md:px-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-xl overflow-hidden shadow-md text-white transition-all">
                <div className="p-2 md:p-3 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
                                <div className="w-5 h-5 md:w-6 md:h-6">
                                    {getWeatherIcon(weather.current.weatherCode)}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-[10px] md:text-xs opacity-90 uppercase tracking-wide">{t('current_weather')}</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg md:text-xl font-bold">{formatTemp(weather.current.temperature)}°{tempUnit}</span>
                                    <span className="text-xs opacity-90 line-clamp-1">{getWeatherDesc(weather.current.weatherCode)}</span>
                                </div>
                                {weather.updatedAt && (
                                    <div className="text-[9px] opacity-75">
                                        {(lang === 'nl' ? 'Laatste update' : 'Updated') + ': ' + new Date(weather.updatedAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs opacity-75 truncate max-w-[80px] sm:max-w-[150px] text-right">{homeLocation.name.split(',')[0]}</span>
                            {isCollapsed ? <Icons.ChevronDown className="w-4 h-4" /> : <Icons.ChevronUp className="w-4 h-4" />}
                        </div>
                    </div>
                </div>
                {!isCollapsed && (
                    <div className="px-2 pb-2 md:px-3 md:pb-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex gap-4 text-xs opacity-90 mb-2 border-t border-white/20 pt-2">
                            <span className="flex items-center gap-0.5"><Icons.ArrowUp className="w-3 h-3" /> {t('temp_max')}: {formatTemp(weather.current.maxTemp)}°</span>
                            <span className="flex items-center gap-0.5"><Icons.ArrowDown className="w-3 h-3" /> {t('temp_min')}: {formatTemp(weather.current.minTemp)}°</span>
                        </div>
                        <div className="border-t border-white/20 pt-2">
                            <h4 className="text-[10px] font-bold mb-2 opacity-80 uppercase tracking-wider">{t('weather_forecast')}</h4>
                            <div className="flex justify-between text-center gap-1 overflow-x-auto no-scrollbar pb-1">
                                {weather.forecast.map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[45px]">
                                        <span className="text-[9px] opacity-90 uppercase">{new Date(day.date).toLocaleDateString(lang, { weekday: 'short' })}</span>
                                        <div className="w-4 h-4 md:w-5 md:h-5">{getWeatherIcon(day.weatherCode)}</div>
                                        <div className="text-[10px] md:text-xs font-medium flex gap-1">
                                            <span>{formatTemp(day.maxTemp)}°</span>
                                            <span className="opacity-60">{formatTemp(day.minTemp)}°</span>
                                        </div>
                                        {day.precipitationSum !== undefined && day.precipitationSum > 0 && (
                                            <div className="flex items-center gap-0.5 text-[9px] text-blue-200">
                                                <Icons.Droplet className="w-2 h-2" />
                                                <span>{formatLength(day.precipitationSum)}{lengthUnit === 'in' ? '"' : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
