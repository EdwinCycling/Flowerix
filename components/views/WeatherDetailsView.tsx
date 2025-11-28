






import React, { useState } from 'react';
import { Icons } from '../Icons';
import { WeatherData, HomeLocation, TempUnit, LengthUnit, DailyWeather, WindUnit, TimeFormat } from '../../types';

interface WeatherDetailsViewProps {
    weather: WeatherData | null;
    homeLocation: HomeLocation | null;
    tempUnit: TempUnit;
    lengthUnit: LengthUnit;
    windUnit: WindUnit; 
    timeFormat: TimeFormat; // Added Prop
    onBack: () => void;
    onRefresh: () => void; 
    lang: 'en' | 'nl';
    t: (key: string) => string;
}

export const WeatherDetailsView: React.FC<WeatherDetailsViewProps> = ({ weather, homeLocation, tempUnit, lengthUnit, windUnit, timeFormat, onBack, onRefresh, lang, t }) => {
    // State to track tapped day index for mobile tooltips
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

    if (!weather) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-center p-6">
            <Icons.Cloud className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">{t('weather_no_data')}</h2>
            <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">{t('back')}</button>
        </div>
    );

    const formatTemp = (c: number) => tempUnit === 'F' ? Math.round(c * 9/5 + 32) : Math.round(c);
    
    const formatLength = (val: number | undefined) => {
        if (val === undefined) return "0";
        if (lengthUnit === 'in') {
            return (val / 25.4).toFixed(2);
        }
        return val.toFixed(1);
    };

    const formatWind = (kmh: number | undefined) => {
        if (kmh === undefined) return "0";
        if (windUnit === 'mph') {
            return (kmh * 0.621371).toFixed(1) + " mph";
        }
        if (windUnit === 'bft') {
            let bft = 0;
            if (kmh < 2) bft = 0;
            else if (kmh < 6) bft = 1;
            else if (kmh < 12) bft = 2;
            else if (kmh < 20) bft = 3;
            else if (kmh < 29) bft = 4;
            else if (kmh < 39) bft = 5;
            else if (kmh < 50) bft = 6;
            else if (kmh < 62) bft = 7;
            else if (kmh < 75) bft = 8;
            else if (kmh < 89) bft = 9;
            else if (kmh < 103) bft = 10;
            else if (kmh < 118) bft = 11;
            else bft = 12;
            return bft + " Bft";
        }
        return kmh.toFixed(1) + " km/h";
    };

    const isWeekend = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getDay() === 0 || d.getDay() === 6;
    };

    const getDayName = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(lang, { weekday: 'short' });
    };

    const getDateString = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(lang, { day: 'numeric', month: 'numeric' });
    };

    const formatTime = (isoStr?: string) => {
        if (!isoStr) return "--:--";
        return new Date(isoStr).toLocaleTimeString(lang, { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: timeFormat === '12h'
        });
    };

    const getWeatherIcon = (code: number) => {
        if (code === 0) return <Icons.Sun className="w-full h-full text-yellow-500" />;
        if ([1, 2, 3].includes(code)) return <Icons.Cloud className="w-full h-full text-gray-400" />;
        if ([45, 48].includes(code)) return <Icons.CloudFog className="w-full h-full text-gray-400" />;
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <Icons.CloudRain className="w-full h-full text-blue-400" />;
        if ([71, 73, 75].includes(code)) return <Icons.CloudSnow className="w-full h-full text-white" />;
        if ([95, 96, 99].includes(code)) return <Icons.CloudLightning className="w-full h-full text-purple-500" />;
        return <Icons.Sun className="w-full h-full text-yellow-500" />;
    };

    // --- Chart Helpers ---
    const totalRain = weather.history.reduce((acc, curr) => acc + (curr.precipitationSum || 0), 0);
    
    // Rainfall Cap (20mm or approx 0.8in)
    const rainCap = lengthUnit === 'mm' ? 20 : 0.8;
    
    // Aggregate Temps
    const allMaxTemps = weather.history.map(d => d.maxTemp);
    const allMinTemps = weather.history.map(d => d.minTemp);
    
    const highestTemp = Math.max(...allMaxTemps);
    const lowestTemp = Math.min(...allMinTemps);
    
    const avgMaxTemp = allMaxTemps.reduce((a, b) => a + b, 0) / allMaxTemps.length;
    const avgMinTemp = allMinTemps.reduce((a, b) => a + b, 0) / allMinTemps.length;

    // Temp Range for Chart scaling
    const chartMinTemp = Math.min(...allMinTemps) - 2;
    const chartMaxTemp = Math.max(...allMaxTemps) + 2;
    const chartTempRange = chartMaxTemp - chartMinTemp || 1;

    const historyLength = weather.history.length;

    // Today's Details (Index 0 of Forecast usually, but lets be safe)
    const todayForecast: Partial<DailyWeather> = weather.forecast[0] || {};

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 justify-between">
                <div className="flex items-center">
                    <button onClick={onBack} className="text-gray-600 dark:text-gray-300"><Icons.ArrowLeft /></button>
                    <h2 className="ml-4 font-semibold text-lg text-gray-900 dark:text-white">{t('weather_station')}</h2>
                </div>
                <button onClick={onRefresh} className="text-gray-500 dark:text-gray-400 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title={t('weather_refresh')}>
                    <Icons.Repeat className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                {/* Current Weather Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-blue-100 font-medium text-sm uppercase tracking-wider mb-1">{homeLocation?.name}</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-bold">{formatTemp(weather.current.temperature)}°</span>
                                <span className="text-2xl font-medium opacity-80">{tempUnit}</span>
                            </div>
                            <p className="text-blue-100 mt-1 capitalize">
                                {weather.current.weatherCode === 0 ? t('weather_clear') : t('weather_cloudy')}
                            </p>
                            {weather.updatedAt && (
                                <div className="text-[10px] text-blue-100 mt-2">
                                    {lang === 'nl' ? 'Laatste update:' : 'Last updated:'} {new Date(weather.updatedAt).toLocaleString(lang)}
                                </div>
                            )}
                        </div>
                        <div className="w-20 h-20">
                            {getWeatherIcon(weather.current.weatherCode)}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-4">
                        <div className="flex flex-col items-center">
                            <Icons.Droplet className="w-5 h-5 mb-1 opacity-80" />
                            <span className="text-xs opacity-70 uppercase">{t('weather_humidity')}</span>
                            <span className="font-bold">{weather.current.humidity || 0}%</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Icons.Wind className="w-5 h-5 mb-1 opacity-80" />
                            <span className="text-xs opacity-70 uppercase">{t('weather_wind')}</span>
                            <span className="font-bold">{formatWind(weather.current.windSpeed)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Icons.Umbrella className="w-5 h-5 mb-1 opacity-80" />
                            <span className="text-xs opacity-70 uppercase">{t('weather_precip')}</span>
                            <span className="font-bold">{formatLength(weather.current.precipitation)} {lengthUnit}</span>
                        </div>
                    </div>
                </div>

                {/* Garden Vitality (New) */}
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">{t('weather_garden_conditions')}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 shadow-sm">
                            <Icons.Sunrise className="w-6 h-6 text-orange-400" />
                            <div className="text-xs text-gray-500 uppercase">{t('weather_sunrise')}</div>
                            <div className="font-bold text-gray-800 dark:text-white">{formatTime(todayForecast.sunrise)}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 shadow-sm">
                            <Icons.Sun className="w-6 h-6 text-yellow-500" />
                            <div className="text-xs text-gray-500 uppercase">{t('weather_uv')}</div>
                            <div className="font-bold text-gray-800 dark:text-white">{todayForecast.uvIndex?.toFixed(1) || '-'}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 shadow-sm">
                            <Icons.Sunset className="w-6 h-6 text-purple-400" />
                            <div className="text-xs text-gray-500 uppercase">{t('weather_sunset')}</div>
                            <div className="font-bold text-gray-800 dark:text-white">{formatTime(todayForecast.sunset)}</div>
                        </div>
                    </div>
                </div>

                {/* Forecast */}
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3">{t('weather_forecast')}</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {weather.forecast.map((day, i) => {
                            const isFreezing = day.minTemp < 0;
                            return (
                                <div key={i} className={`flex-shrink-0 w-22 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 ${isWeekend(day.date) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{new Date(day.date).toLocaleDateString(lang, { weekday: 'short' })}</span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(day.date).toLocaleDateString(lang, { day: 'numeric', month: 'numeric' })}</span>
                                    <div className="w-8 h-8">{getWeatherIcon(day.weatherCode)}</div>
                                    <div className="flex flex-col items-center text-xs">
                                        <span className={`font-bold ${day.maxTemp < 0 ? 'text-blue-500' : 'text-gray-800 dark:text-white'}`}>{formatTemp(day.maxTemp)}°</span>
                                        <div className="flex items-center gap-1">
                                            <span className={`${isFreezing ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>{formatTemp(day.minTemp)}°</span>
                                            {isFreezing && <Icons.Snowflake className="w-3 h-3 text-blue-500" />}
                                        </div>
                                    </div>
                                    {day.precipitationSum !== undefined && day.precipitationSum > 0 && (
                                        <span className="text-[10px] text-blue-500 font-medium">{formatLength(day.precipitationSum)} {lengthUnit}</span>
                                    )}
                                    {day.sunshineDuration !== undefined && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mt-1">
                                            <Icons.Sun className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                            <span className="text-[10px] text-yellow-700 dark:text-yellow-300 font-bold">{Math.round(day.sunshineDuration)}h</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Historical Data Header */}
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center justify-between">
                        <span>{t('weather_history_28')}</span>
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{new Date(weather.history[0].date).toLocaleDateString()} - {new Date(weather.history[weather.history.length-1].date).toLocaleDateString()}</span>
                    </h3>
                    
                    {/* Summary Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('weather_rain_total')}</div>
                            <div className="text-2xl font-bold text-blue-500">{formatLength(totalRain)} {lengthUnit}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('weather_avg_temp')}</div>
                            <div className="text-2xl font-bold text-orange-500">{formatTemp((avgMaxTemp + avgMinTemp) / 2)}°{tempUnit}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('weather_max_highest')}</div>
                            <div className="text-2xl font-bold text-red-500">{formatTemp(highestTemp)}°{tempUnit}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('weather_min_lowest')}</div>
                            <div className="text-2xl font-bold text-blue-400">{formatTemp(lowestTemp)}°{tempUnit}</div>
                        </div>
                    </div>

                    {/* Rainfall Chart */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">{t('weather_rainfall_history')}</h4>
                        <div className="flex items-end gap-[2px] h-40 w-full relative pb-8">
                            {/* Y-Axis Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-gray-400 pointer-events-none z-0 pb-8">
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1 flex justify-between items-center">
                                    <span className="bg-white dark:bg-gray-800 px-1 text-red-400">{rainCap}+ {lengthUnit}</span>
                                </div>
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">{formatLength(rainCap/2)}</div>
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">0</div>
                            </div>

                            {weather.history.map((day, i) => {
                                const precip = day.precipitationSum || 0;
                                const isCapped = precip > rainCap;
                                const height = Math.min((precip / rainCap) * 100, 100);
                                const date = new Date(day.date);
                                const daysFromEnd = historyLength - 1 - i;
                                const showLabel = daysFromEnd === 0 || daysFromEnd === 1 || daysFromEnd === 7 || daysFromEnd === 14 || daysFromEnd === 21;
                                const isSelected = selectedDayIndex === i;
                                
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedDayIndex(isSelected ? null : i)}
                                        className={`flex-1 flex flex-col justify-end group relative z-10 h-full cursor-pointer ${isWeekend(day.date) ? 'bg-gray-100/50 dark:bg-gray-700/30 rounded-sm' : ''}`}
                                    >
                                        {/* Rainfall Info Overlay on Graph if > 0 */}
                                        {precip > 0 && !isCapped && (
                                            <div className="text-[7px] text-center text-blue-400 -mt-3 mb-0.5">{formatLength(precip)}</div>
                                        )}
                                        
                                        {isCapped && (
                                            <div className="flex justify-center -mt-3 mb-0.5">
                                                <Icons.ArrowUp className="w-3 h-3 text-red-500 animate-bounce" />
                                            </div>
                                        )}

                                        <div 
                                            className={`${isCapped ? 'bg-red-400 dark:bg-red-500' : 'bg-blue-400 dark:bg-blue-600'} rounded-t-sm min-h-[1px] hover:opacity-80 transition-colors mx-auto w-full`} 
                                            style={{ height: `${height}%` }} 
                                        />
                                        
                                        {/* Axis Label - Specific Days */}
                                        {showLabel && (
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-medium text-center leading-tight whitespace-nowrap">
                                                <div className="text-gray-800 dark:text-white font-bold">{getDayName(day.date)}</div>
                                                <div>{getDateString(day.date)}</div>
                                                {daysFromEnd === 0 && <div className="text-[8px] text-blue-500 italic">Today</div>}
                                                {daysFromEnd === 1 && <div className="text-[8px] text-blue-500 italic">Yest</div>}
                                            </div>
                                        )}

                                        {/* Tooltip */}
                                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none flex flex-col items-center shadow-lg transition-opacity duration-200 ${isSelected ? 'opacity-100 z-30' : ''}`}>
                                            <span className="uppercase font-bold text-[9px] opacity-70">{getDayName(day.date)}</span>
                                            <span>{date.toLocaleDateString(lang, {month:'short', day:'numeric'})}</span>
                                            <span className="font-bold text-blue-300 mt-1">{formatLength(precip)} {lengthUnit}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Temp History Chart */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mb-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">{t('weather_temp_history')}</h4>
                        <div className="flex items-end gap-[2px] h-40 w-full relative pb-8">
                             {/* Y-Axis Lines */}
                             <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-gray-400 pointer-events-none z-0 pb-8">
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">{formatTemp(chartMaxTemp)}</div>
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">{formatTemp((chartMaxTemp+chartMinTemp)/2)}</div>
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">{formatTemp(chartMinTemp)}</div>
                            </div>

                            {weather.history.map((day, i) => {
                                // Calculate position relative to min/max history range
                                const bottom = ((day.minTemp - chartMinTemp) / chartTempRange) * 100;
                                const height = ((day.maxTemp - day.minTemp) / chartTempRange) * 100;
                                const date = new Date(day.date);
                                const isFreezing = day.minTemp < 0;
                                const isDeepFreeze = day.maxTemp <= 0;
                                const daysFromEnd = historyLength - 1 - i;
                                const showLabel = daysFromEnd === 0 || daysFromEnd === 7 || daysFromEnd === 14 || daysFromEnd === 21;
                                const isSelected = selectedDayIndex === i;
                                
                                // Determine bar color based on temperature
                                let barClass = 'bg-orange-300 dark:bg-orange-400';
                                if (isDeepFreeze) {
                                    barClass = 'bg-blue-400 dark:bg-blue-500';
                                } else if (isFreezing) {
                                    barClass = 'bg-gradient-to-t from-blue-400 to-orange-300 dark:from-blue-500 dark:to-orange-400';
                                }

                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedDayIndex(isSelected ? null : i)}
                                        className={`flex-1 relative h-full group z-10 cursor-pointer ${isWeekend(day.date) ? 'bg-gray-100/50 dark:bg-gray-700/30 rounded-sm' : ''}`}
                                    >
                                        <div 
                                            className={`absolute w-full ${barClass} rounded-full opacity-90 hover:opacity-100 transition-opacity min-h-[4px] left-0 right-0 mx-auto max-w-[80%] shadow-sm`}
                                            style={{ bottom: `${bottom}%`, height: `${Math.max(height, 2)}%` }}
                                        ></div>
                                        
                                        {isFreezing && (
                                            <div 
                                                className="absolute left-0 right-0 flex justify-center pointer-events-none"
                                                style={{ bottom: `calc(${bottom}% - 14px)` }}
                                            >
                                                <Icons.Snowflake className="w-3 h-3 text-blue-500 dark:text-blue-300" />
                                            </div>
                                        )}

                                        {/* Axis Label - Specific Days */}
                                        {showLabel && (
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-medium text-center leading-tight whitespace-nowrap">
                                                <div className="text-gray-800 dark:text-white font-bold">{getDayName(day.date)}</div>
                                                <div>{getDateString(day.date)}</div>
                                            </div>
                                        )}

                                         {/* Tooltip */}
                                         <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 mb-1 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none flex flex-col items-center shadow-lg transition-opacity duration-200 ${isSelected ? 'opacity-100 z-30' : ''}`}>
                                            <span className="uppercase font-bold text-[9px] opacity-70">{getDayName(day.date)}</span>
                                            <span>{date.toLocaleDateString(lang, {month:'short', day:'numeric'})}</span>
                                            <span className="font-bold text-orange-300 mt-1">{formatTemp(day.maxTemp)}° / {formatTemp(day.minTemp)}°</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sunshine Chart */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">{t('weather_sun_history')}</h4>
                        <div className="flex items-end gap-[2px] h-32 w-full relative pb-8">
                            {/* Y-Axis Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-gray-400 pointer-events-none z-0 pb-8">
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">14h</div>
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">7h</div>
                                <div className="border-b border-gray-100 dark:border-gray-700 w-full text-right pr-1">0h</div>
                            </div>

                            {weather.history.map((day, i) => {
                                const sunHours = Math.round(day.sunshineDuration || 0); // Round to 0 decimals
                                const height = Math.min((sunHours / 14) * 100, 100); // Cap at ~14 hours for scaling
                                const date = new Date(day.date);
                                const daysFromEnd = historyLength - 1 - i;
                                const showLabel = daysFromEnd === 0 || daysFromEnd === 7 || daysFromEnd === 14 || daysFromEnd === 21;
                                const isSelected = selectedDayIndex === i;

                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedDayIndex(isSelected ? null : i)}
                                        className={`flex-1 flex flex-col justify-end group relative z-10 h-full cursor-pointer ${isWeekend(day.date) ? 'bg-gray-100/50 dark:bg-gray-700/30 rounded-sm' : ''}`}
                                    >
                                        {/* Value overlay */}
                                        {sunHours > 4 && (
                                            <div className="absolute bottom-1 inset-x-0 text-[8px] text-center text-yellow-900 dark:text-yellow-100 font-medium opacity-50">{sunHours}</div>
                                        )}

                                        <div 
                                            className="bg-yellow-400 dark:bg-yellow-600 rounded-t-sm min-h-[1px] hover:bg-yellow-500 transition-colors mx-auto w-full" 
                                            style={{ height: `${height}%` }} 
                                        />
                                        
                                        {/* Axis Label - Specific Days */}
                                        {showLabel && (
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-medium text-center leading-tight whitespace-nowrap">
                                                <div className="text-gray-800 dark:text-white font-bold">{getDayName(day.date)}</div>
                                                <div>{getDateString(day.date)}</div>
                                            </div>
                                        )}

                                        {/* Tooltip */}
                                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none flex flex-col items-center shadow-lg transition-opacity duration-200 ${isSelected ? 'opacity-100 z-30' : ''}`}>
                                            <span className="uppercase font-bold text-[9px] opacity-70">{getDayName(day.date)}</span>
                                            <span>{date.toLocaleDateString(lang, {month:'short', day:'numeric'})}</span>
                                            <span className="font-bold text-yellow-300 mt-1">{sunHours}h</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
