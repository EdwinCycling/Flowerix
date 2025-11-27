
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { RecurrenceType, TimelineItem, WeatherData, HomeLocation, PublicHoliday } from '../../types';
import { DatePicker } from '../ui/DatePicker';
import { Toast } from '../ui/Overlays';
import { generateNotebookPDF } from '../../services/pdfService';
import { fetchHolidays } from '../../services/weatherService';
import { sanitizeForCSV } from '../../services/securityService';

interface NotebookViewProps {
    timelineItems: TimelineItem[];
    onAddNotebookItem: (item: TimelineItem | TimelineItem[]) => void;
    onUpdateNotebookItem: (item: TimelineItem) => void;
    onDeleteNotebookItem: (id: string | string[]) => void;
    handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => void;
    lang: 'en' | 'nl';
    t: (key: string) => string;
    firstDayOfWeek?: 'mon' | 'sun' | 'sat';
    weather?: WeatherData | null;
    homeLocation?: HomeLocation | null;
    useWeather?: boolean;
}

export const NotebookView: React.FC<NotebookViewProps> = ({ 
    timelineItems, 
    onAddNotebookItem, 
    onUpdateNotebookItem, 
    onDeleteNotebookItem,
    handleImageUpload, lang, t, firstDayOfWeek = 'mon', weather, homeLocation, useWeather 
}) => {
    const [viewMode, setViewMode] = useState<'TIMELINE' | 'CALENDAR'>('TIMELINE');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null); 
    const [editForm, setEditForm] = useState<Partial<TimelineItem>>({}); 
    
    const [showEditRecurrenceModal, setShowEditRecurrenceModal] = useState(false); 
    
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
    const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);

    const [itemToDelete, setItemToDelete] = useState<TimelineItem | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartOffset, setExportStartOffset] = useState(0); 
    const [exportEndOffset, setExportEndOffset] = useState(6); 

    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const todayRef = useRef<HTMLDivElement>(null);
    const [hasScrolled, setHasScrolled] = useState(false);

    const sortedItems = [...timelineItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    useEffect(() => {
        if (viewMode === 'TIMELINE' && !hasScrolled && sortedItems.length > 0) {
            const timer = setTimeout(() => {
                if (todayRef.current) {
                    todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setHasScrolled(true);
                }
            }, 300); 
            return () => clearTimeout(timer);
        }
    }, [sortedItems, hasScrolled, viewMode]);

    useEffect(() => {
        const loadHolidays = async () => {
            if (homeLocation?.countryCode) {
                const year = currentMonth.getFullYear();
                const fetched = await fetchHolidays(year, homeLocation.countryCode);
                setHolidays(fetched);
            }
        };
        loadHolidays();
    }, [homeLocation?.countryCode, currentMonth.getFullYear()]);

    useEffect(() => {
        if (selectedItem) {
            setEditForm({ ...selectedItem });
        } else {
            setEditForm({});
        }
    }, [selectedItem]);

    const handleScrollToToday = () => {
        if (viewMode === 'TIMELINE') {
            if (todayRef.current) {
                todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            setCurrentMonth(new Date());
        }
    };

    const resetForm = () => {
        setTitle('');
        setDesc('');
        setDate(new Date().toISOString().split('T')[0]);
        setRecurrence('none');
        setSelectedImage(undefined);
    };

    const generateRecurringTasks = (baseTask: TimelineItem, startDateOverride?: Date, forceParentId?: string) => {
        const tasks: TimelineItem[] = [baseTask];
        const startDate = startDateOverride || new Date(baseTask.date);
        const now = new Date();
        const limitDate = new Date(now);
        limitDate.setFullYear(limitDate.getFullYear() + 1); 

        let nextDate = new Date(startDate);
        
        for (let i = 0; i < 60; i++) { 
            if (baseTask.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            if (baseTask.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
            if (baseTask.recurrence === 'fourweekly') nextDate.setDate(nextDate.getDate() + 28);
            if (baseTask.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            if (baseTask.recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
            if (baseTask.recurrence === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

            if (nextDate > limitDate) break;

            tasks.push({
                ...baseTask,
                id: 'temp', 
                date: nextDate.toISOString().split('T')[0],
                isDone: false,
                originalParentId: forceParentId || baseTask.originalParentId 
            });
        }
        return tasks;
    };

    const extendRecurringTasks = () => {
        let addedCount = 0;
        const now = new Date();
        const limitDate = new Date(now);
        limitDate.setFullYear(limitDate.getFullYear() + 1);

        const parentIds = Array.from(new Set(timelineItems.filter(i => i.originalParentId).map(i => i.originalParentId)));
        
        const newItemsToAdd: TimelineItem[] = [];

        parentIds.forEach(pid => {
            const series = timelineItems.filter(i => i.originalParentId === pid || i.id === pid);
            if (series.length === 0) return;

            const baseTask = series[0]; 
            const dates = series.map(i => new Date(i.date).getTime());
            const maxDate = new Date(Math.max(...dates));

            const threshold = new Date(limitDate);
            threshold.setMonth(threshold.getMonth() - 1);

            if (maxDate < threshold) {
                const generated = generateRecurringTasks({
                    ...baseTask,
                    id: 'temp', 
                    date: maxDate.toISOString().split('T')[0] 
                }, maxDate, pid as string);
                
                const toAdd = generated.slice(1);
                newItemsToAdd.push(...toAdd);
                addedCount += toAdd.length;
            }
        });

        if (addedCount > 0) {
            onAddNotebookItem(newItemsToAdd);
            setToastMsg(`${addedCount} ${t('tasks_extended')}`);
            setTimeout(() => setToastMsg(null), 3000);
        } else {
            setToastMsg(t('tasks_up_to_date'));
            setTimeout(() => setToastMsg(null), 3000);
        }
    };

    const handleAddNote = () => {
        if (!title) return;
        const newNote: TimelineItem = {
            id: 'temp',
            type: 'NOTE',
            title,
            description: desc,
            date,
            imageUrl: selectedImage
        };
        onAddNotebookItem(newNote);
        setShowAddNoteModal(false);
        resetForm();
    };

    const handleAddTask = () => {
        if (!title) return;
        const tempGroupId = recurrence !== 'none' ? Date.now().toString() : undefined;

        const baseTask: TimelineItem = {
            id: 'temp',
            type: 'TASK',
            title,
            description: desc,
            date,
            isDone: false,
            recurrence,
            originalParentId: tempGroupId
        };

        const newTasks = recurrence !== 'none' ? generateRecurringTasks(baseTask, undefined, tempGroupId) : [baseTask];
        onAddNotebookItem(newTasks);
        setShowAddTaskModal(false);
        
        if (newTasks.length > 1) {
            setToastMsg(`${newTasks.length} ${t('tasks_extended')}`);
            setTimeout(() => setToastMsg(null), 3000);
        }
        resetForm();
    };

    const toggleTaskDone = (id: string) => {
        const item = timelineItems.find(i => i.id === id);
        if (item) {
            onUpdateNotebookItem({ ...item, isDone: !item.isDone });
            if (editForm.id === id) {
                setEditForm(prev => ({ ...prev, isDone: !prev.isDone }));
            }
        }
    };

    const promptDelete = (item: TimelineItem) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const confirmDelete = (mode: 'SINGLE' | 'FUTURE') => {
        if (!itemToDelete) return;

        if (mode === 'SINGLE' || !itemToDelete.originalParentId) {
            onDeleteNotebookItem(itemToDelete.id);
        } else {
            const toDelete = timelineItems.filter(i => {
                if (i.originalParentId !== itemToDelete.originalParentId && i.id !== itemToDelete.originalParentId) return false;
                return new Date(i.date) >= new Date(itemToDelete.date); 
            }).map(i => i.id);
            
            onDeleteNotebookItem(toDelete);
        }
        setShowDeleteModal(false);
        setItemToDelete(null);
        setSelectedItem(null);
    };

    const handleSaveEdit = () => {
        if (!editForm.title || !selectedItem) return;

        if (selectedItem.type === 'NOTE' || !selectedItem.originalParentId) {
            onUpdateNotebookItem({ ...selectedItem, ...editForm } as TimelineItem);
            setSelectedItem(null);
            return;
        }
        setShowEditRecurrenceModal(true);
    };

    const confirmRecurringUpdate = (mode: 'SINGLE' | 'FUTURE') => {
        if (!selectedItem || !editForm.title) return;

        if (mode === 'SINGLE') {
            onUpdateNotebookItem({ ...selectedItem, ...editForm } as TimelineItem);
        } else {
            const futureItems = timelineItems.filter(i => {
                if (i.originalParentId !== selectedItem.originalParentId && i.id !== selectedItem.originalParentId) return false;
                return new Date(i.date) >= new Date(selectedItem.date); 
            });
            
            const idsToDelete = futureItems.map(i => i.id);
            onDeleteNotebookItem(idsToDelete);

            const baseTask: TimelineItem = {
                ...selectedItem,
                ...editForm,
                id: 'temp', 
                date: editForm.date!, 
                originalParentId: selectedItem.originalParentId
            } as TimelineItem;

            const newTasks = generateRecurringTasks(baseTask, undefined, baseTask.originalParentId);
            onAddNotebookItem(newTasks);
        }
        setShowEditRecurrenceModal(false);
        setSelectedItem(null);
    };

    const getExportDateRange = () => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() + exportStartOffset);
        const end = new Date(now);
        end.setDate(now.getDate() + exportEndOffset);
        return { start, end };
    };

    const handleCopyExport = () => {
        const { start, end } = getExportDateRange();
        const filtered = sortedItems.filter(i => {
            const d = new Date(i.date);
            return d >= start && d <= end;
        });
        
        const text = filtered.map(i => {
            const d = new Date(i.date).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US');
            const status = i.type === 'TASK' ? (i.isDone ? '[x]' : '[ ]') : '(i)';
            return `${d} ${status} ${i.title}${i.description ? '\n' + i.description : ''}`;
        }).join('\n\n');

        navigator.clipboard.writeText(text);
        setToastMsg(t('copy_success'));
        setTimeout(() => setToastMsg(null), 2000);
        setShowExportModal(false);
    };

    const handlePDFExport = () => {
        const { start, end } = getExportDateRange();
        const filtered = sortedItems.filter(i => {
            const d = new Date(i.date);
            return d >= start && d <= end;
        });
        if (generateNotebookPDF(filtered, start, end, lang, t)) {
            setToastMsg(t('pdf_downloaded'));
        } else {
            setToastMsg(t('pdf_error'));
        }
        setTimeout(() => setToastMsg(null), 2000);
        setShowExportModal(false);
    };

    const handleExcelExport = () => {
        const now = new Date();
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        const end = new Date(now);
        end.setFullYear(now.getFullYear() + 1);

        const filtered = sortedItems.filter(i => {
            const d = new Date(i.date);
            return d >= start && d <= end;
        });

        const headers = ["Date", "Type", "Title", "Status", "Description"];
        const rows = filtered.map(i => {
            const cleanDesc = sanitizeForCSV(i.description || "").replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');
            const cleanTitle = sanitizeForCSV(i.title).replace(/"/g, '""');
            const cleanType = sanitizeForCSV(i.type);
            const cleanDate = sanitizeForCSV(i.date);
            const cleanStatus = sanitizeForCSV(i.type === 'TASK' ? (i.isDone ? "Done" : "Todo") : "Note");

            return [
                cleanDate,
                cleanType,
                `"${cleanTitle}"`, 
                cleanStatus,
                `"${cleanDesc}"`
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `flowerix_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setToastMsg(t('excel_downloaded'));
        setTimeout(() => setToastMsg(null), 2000);
        setShowExportModal(false);
    };

    const getItemColorClass = (item: TimelineItem) => {
        if (item.type === 'NOTE') {
            return 'bg-[#fef9c3] dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50';
        }
        if (item.isDone) {
            return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        }
        const todayStr = new Date().toISOString().split('T')[0];
        if (item.date < todayStr) {
            return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
        }
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    };

    const getNodeStyle = (item: TimelineItem, isToday: boolean) => {
        const baseClass = "absolute left-[3px] w-4 h-4 border-2 z-10";
        const shapeClass = item.type === 'NOTE' ? 'rounded-sm' : 'rounded-full';
        
        let colorClass = '';
        if (item.type === 'NOTE') {
            colorClass = 'bg-yellow-200 border-yellow-400 dark:bg-yellow-900 dark:border-yellow-600';
        } else if (item.isDone) {
            colorClass = 'bg-green-200 border-green-500 dark:bg-green-900 dark:border-green-600';
        } else if (item.date < new Date().toISOString().split('T')[0]) {
            colorClass = 'bg-orange-200 border-orange-500 dark:bg-orange-900 dark:border-orange-600';
        } else {
            colorClass = 'bg-white border-gray-400 dark:bg-gray-700 dark:border-gray-500';
        }

        if (isToday) {
            return `${baseClass} ${shapeClass} ${colorClass} ring-2 ring-green-400 dark:ring-green-500 scale-125`;
        }
        return `${baseClass} ${shapeClass} ${colorClass}`;
    };

    const getDayOffset = (date: Date) => {
        const day = date.getDay(); 
        if (firstDayOfWeek === 'sun') return day;
        if (firstDayOfWeek === 'sat') return (day + 1) % 7;
        return (day + 6) % 7; 
    };

    const getWeatherForDate = (dateStr: string) => {
        if (!useWeather || !weather) return null;
        const today = new Date().toISOString().split('T')[0];
        const forecastDays = weather.forecast.slice(0, 3); 
        
        const match = forecastDays.find(d => d.date.split('T')[0] === dateStr);
        return match;
    };

    const getHolidayForDate = (dateStr: string) => {
        return holidays.find(h => h.date === dateStr);
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        const startDayOfWeek = getDayOffset(firstDay);

        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) days.push(null); 
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        const monthName = currentMonth.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', { month: 'long', year: 'numeric' });

        const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
        const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

        let weekDaysRaw = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        if (lang === 'nl') weekDaysRaw = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
        
        let weekDays = [...weekDaysRaw];
        if (firstDayOfWeek === 'sun') {
            const sun = weekDays.pop();
            weekDays.unshift(sun!);
        } else if (firstDayOfWeek === 'sat') {
            const sun = weekDays.pop();
            const sat = weekDays.pop();
            weekDays.unshift(sat!, sun!);
        }

        return (
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                        <Icons.ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">{monthName}</h3>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                        <Icons.ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                </div>
                
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shrink-0">
                    {weekDays.map((d, i) => {
                        let isWknd = false;
                        if (firstDayOfWeek === 'mon') isWknd = i >= 5;
                        else if (firstDayOfWeek === 'sun') isWknd = i === 0 || i === 6;
                        else if (firstDayOfWeek === 'sat') isWknd = i <= 1;

                        return (
                            <div key={d} className={`py-2 text-center text-xs font-bold ${isWknd ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{d}</div>
                        );
                    })}
                </div>

                <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-gray-200 dark:bg-gray-700 overflow-y-auto">
                    {days.map((day, idx) => {
                        if (!day) return <div key={`pad-${idx}`} className="bg-gray-100/80 dark:bg-black/40" />;
                        
                        const dateStr = day.toISOString().split('T')[0];
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const dayItems = sortedItems.filter(i => i.date === dateStr);
                        const dayOfWeek = day.getDay(); 
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const dayWeather = getWeatherForDate(dateStr);
                        const holiday = getHolidayForDate(dateStr);

                        return (
                            <div 
                                key={dateStr} 
                                onClick={() => { setSelectedDayDate(dateStr); }}
                                className={`p-1 min-h-[80px] relative cursor-pointer transition-colors flex flex-col items-stretch ${
                                    isWeekend 
                                        ? 'bg-orange-50/50 dark:bg-orange-900/10' 
                                        : 'bg-white dark:bg-gray-800'
                                } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-xs font-medium p-1 rounded-full w-6 h-6 flex items-center justify-center ${isToday ? 'bg-green-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {day.getDate()}
                                    </span>
                                    {dayWeather && (
                                        <div className="flex flex-col items-end">
                                            {dayWeather.weatherCode === 0 ? <Icons.Sun className="w-3 h-3 text-yellow-500" /> : <Icons.Cloud className="w-3 h-3 text-gray-400" />}
                                            {dayWeather.precipitationSum !== undefined && dayWeather.precipitationSum > 0 && <Icons.Droplet className="w-2 h-2 text-blue-400 mt-0.5" />}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 flex flex-col gap-1 overflow-hidden mt-1">
                                    {holiday && (
                                        <div className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1 rounded text-[8px] font-bold truncate">
                                            {holiday.localName}
                                        </div>
                                    )}

                                    {dayItems.slice(0, 3).map(item => (
                                        <div key={item.id} className="flex items-center gap-1">
                                            <div className={`w-2 h-2 flex-shrink-0 ${item.type === 'NOTE' ? 'rounded-sm bg-yellow-400' : item.isDone ? 'rounded-full bg-green-500' : 'rounded-full bg-blue-400'}`}></div>
                                            {item.imageUrl && <img src={item.imageUrl} className="w-4 h-4 rounded-sm object-cover border border-gray-200 dark:border-gray-600" />}
                                            <span className="text-[9px] truncate text-gray-600 dark:text-gray-400 hidden sm:block">{item.title}</span>
                                        </div>
                                    ))}
                                    {dayItems.length > 3 && (
                                        <span className="text-[9px] text-gray-400 pl-1">+{dayItems.length - 3}</span>
                                    )}
                                </div>
                                
                                {dayWeather && (
                                    <div className="mt-auto text-[8px] text-gray-400 text-right pr-1">
                                        {Math.round(dayWeather.maxTemp)}° / {Math.round(dayWeather.minTemp)}°
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayDetailModal = () => {
        if (!selectedDayDate) return null;
        const dayItems = sortedItems.filter(i => i.date === selectedDayDate);
        
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-lg dark:text-white">
                            {new Date(selectedDayDate).toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                        <button onClick={() => setSelectedDayDate(null)}><Icons.X className="text-gray-500" /></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                        {dayItems.length === 0 ? (
                            <p className="text-center text-gray-500 italic py-4">{t('no_timeline_items')}</p>
                        ) : (
                            dayItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => { setSelectedDayDate(null); setSelectedItem(item); }}
                                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer hover:shadow-md transition-shadow ${getItemColorClass(item)}`}
                                >
                                    {item.imageUrl ? (
                                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                            <img src={item.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className={`w-16 h-16 shrink-0 rounded-lg flex items-center justify-center ${item.type === 'NOTE' ? 'bg-yellow-200' : 'bg-blue-100'}`}>
                                            {item.type === 'NOTE' ? <Icons.Notebook className="w-8 h-8 text-yellow-700"/> : <Icons.ListTodo className="w-8 h-8 text-blue-600"/>}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-base mb-1 ${item.isDone ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{item.title}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{item.description || t('no_desc')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex gap-2">
                        <button 
                            onClick={() => { setDate(selectedDayDate); setSelectedDayDate(null); setShowAddNoteModal(true); }} 
                            className="flex-1 flex items-center justify-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-2 rounded-lg shadow-sm transition-colors font-bold text-xs"
                        >
                            <Icons.Notebook className="w-4 h-4" /> {t('add_note')}
                        </button>
                        <button 
                            onClick={() => { setDate(selectedDayDate); setSelectedDayDate(null); setShowAddTaskModal(true); }} 
                            className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-sm transition-colors font-bold text-xs"
                        >
                            <Icons.ListTodo className="w-4 h-4" /> {t('add_task')}
                        </button>
                        <button onClick={() => setSelectedDayDate(null)} className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">{t('close')}</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderExportModal = () => (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{t('export_options')}</h3>
                
                <div className="space-y-6 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('start_offset')}</label>
                        <div className="flex items-center justify-between mb-1 text-xs text-green-600 font-bold">
                            <span>-30d</span>
                            <span>{exportStartOffset === 0 ? t('range_today') : `${exportStartOffset > 0 ? '+' : ''}${exportStartOffset}d`}</span>
                            <span>0d</span>
                        </div>
                        <input 
                            type="range" 
                            min="-30" 
                            max="0" 
                            step="1" 
                            value={exportStartOffset} 
                            onChange={(e) => setExportStartOffset(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('end_offset')}</label>
                        <div className="flex items-center justify-between mb-1 text-xs text-green-600 font-bold">
                            <span>0d</span>
                            <span>{exportEndOffset === 0 ? t('range_today') : `+${exportEndOffset}d`}</span>
                            <span>+30d</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="30" 
                            step="1" 
                            value={exportEndOffset} 
                            onChange={(e) => setExportEndOffset(Number(e.target.value))} 
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" 
                        />
                    </div>
                    
                    <div className="text-center text-xs text-gray-500">
                        {t('date_range')}: {getExportDateRange().start.toLocaleDateString()} - {getExportDateRange().end.toLocaleDateString()}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={handlePDFExport} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold shadow-md flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
                        <Icons.FileText className="w-5 h-5" /> {t('export_pdf')}
                    </button>
                    <button onClick={handleExcelExport} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold shadow-md flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
                        <Icons.FileText className="w-5 h-5" /> {t('export_excel')}
                    </button>
                    <button onClick={handleCopyExport} className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold shadow-md flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                        <Icons.Copy className="w-5 h-5" /> {t('copy_items')}
                    </button>
                    <button onClick={() => setShowExportModal(false)} className="w-full py-2 text-gray-500 dark:text-gray-400 font-medium">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );

    const renderDeleteModal = () => (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('delete_task_confirm')}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {itemToDelete?.type === 'TASK' && itemToDelete.recurrence !== 'none' 
                        ? t('delete_future_tasks') 
                        : t('delete_confirm')}
                </p>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-600">{t('cancel')}</button>
                    {itemToDelete?.type === 'TASK' && itemToDelete.recurrence !== 'none' ? (
                        <>
                            <button onClick={() => confirmDelete('SINGLE')} className="flex-1 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold">{t('delete_only_this')}</button>
                            <button onClick={() => confirmDelete('FUTURE')} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold shadow-md">{t('delete_all_future')}</button>
                        </>
                    ) : (
                        <button onClick={() => confirmDelete('SINGLE')} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold shadow-md">{t('confirm')}</button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderRecurrenceUpdateModal = () => (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{t('edit_recurrence_title')}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{t('edit_recurrence_desc')}</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => confirmRecurringUpdate('SINGLE')} className="w-full py-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">{t('update_only_this')}</button>
                    <button onClick={() => confirmRecurringUpdate('FUTURE')} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold shadow-md">{t('update_all_future')}</button>
                    <button onClick={() => setShowEditRecurrenceModal(false)} className="w-full py-2 text-gray-500 dark:text-gray-400 font-medium">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );

    const renderDetailView = () => {
        if (!selectedItem) return null;
        const isDone = editForm.isDone;
        
        return (
            <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                    <button onClick={() => setSelectedItem(null)} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Icons.ArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="ml-3 font-bold text-lg text-gray-900 dark:text-white flex-1">
                        {t(selectedItem.type === 'NOTE' ? 'note_details' : 'task_details')}
                    </h2>
                    <button onClick={() => promptDelete(selectedItem)} className="text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <Icons.Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pb-20">
                    <div className="relative group w-full bg-black min-h-[200px] flex items-center justify-center">
                        {editForm.imageUrl ? (
                            <>
                                <img src={editForm.imageUrl} alt="Detail" className="w-full max-h-[50vh] object-contain" />
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="p-2 bg-black/50 text-white rounded-full cursor-pointer hover:bg-black/70">
                                        <Icons.Camera className="w-5 h-5" />
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload && handleImageUpload(e, (b64) => setEditForm(p => ({...p, imageUrl: b64})))} />
                                    </label>
                                    <button onClick={() => setEditForm(p => ({...p, imageUrl: undefined}))} className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600">
                                        <Icons.Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <label className="flex flex-col items-center justify-center text-gray-400 cursor-pointer py-10 w-full h-full hover:bg-gray-900">
                                <Icons.Camera className="w-12 h-12 mb-2" />
                                <span>{t('add_photo_opt')}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload && handleImageUpload(e, (b64) => setEditForm(p => ({...p, imageUrl: b64})))} />
                            </label>
                        )}
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('title_label')}</label>
                                <input 
                                    type="text" 
                                    maxLength={99}
                                    value={editForm.title || ''} 
                                    onChange={(e) => setEditForm(p => ({...p, title: e.target.value}))}
                                    className="w-full text-xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-green-500 outline-none py-1 text-gray-900 dark:text-white"
                                />
                            </div>
                            {selectedItem.type === 'TASK' && (
                                <button 
                                    onClick={() => setEditForm(p => ({...p, isDone: !p.isDone}))}
                                    className={`p-3 rounded-xl transition-colors shadow-sm ${isDone ? 'bg-green-100 text-green-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}
                                >
                                    <Icons.CheckSquare className="w-8 h-8" />
                                </button>
                            )}
                        </div>

                        <DatePicker 
                            label={t('log_date_label')}
                            value={editForm.date || ''}
                            onChange={(val) => setEditForm(p => ({...p, date: val}))}
                        />

                        {selectedItem.type === 'TASK' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('recurrence_label')}</label>
                                <select 
                                    value={editForm.recurrence || 'none'} 
                                    onChange={(e) => setEditForm(p => ({...p, recurrence: e.target.value as RecurrenceType}))}
                                    className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
                                >
                                    <option value="none">{t('rec_none')}</option>
                                    <option value="weekly">{t('rec_weekly')}</option>
                                    <option value="biweekly">{t('rec_biweekly')}</option>
                                    <option value="fourweekly">{t('rec_fourweekly')}</option>
                                    <option value="monthly">{t('rec_monthly')}</option>
                                    <option value="quarterly">{t('rec_quarterly')}</option>
                                    <option value="yearly">{t('rec_yearly')}</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('desc_label')}</label>
                            <textarea 
                                rows={6}
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm(p => ({...p, description: e.target.value}))}
                                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                                placeholder={t('log_notes_placeholder')}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center absolute bottom-0 w-full">
                    <button onClick={() => promptDelete(selectedItem)} className="text-red-500 font-bold text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Icons.Trash2 className="w-5 h-5" /> {t('delete_confirm')}
                    </button>
                    <div className="flex gap-3">
                        <button onClick={() => setSelectedItem(null)} className="px-6 py-3 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                            {t('cancel')}
                        </button>
                        <button onClick={handleSaveEdit} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-colors">
                            {t('save_changes')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 relative bg-gray-50 dark:bg-gray-900 flex flex-col">
            <Toast message={toastMsg || ''} visible={!!toastMsg} />
            
            <div className="sticky top-[65px] z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center shadow-sm shrink-0 gap-2 overflow-x-auto no-scrollbar">
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex-shrink-0">
                    <button onClick={() => setViewMode('TIMELINE')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'TIMELINE' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t('timeline_view')}
                    </button>
                    <button onClick={() => setViewMode('CALENDAR')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {t('calendar_view')}
                    </button>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setShowExportModal(true)} className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 transition-colors" title={t('export_data')}>
                        <Icons.Download className="w-5 h-5" />
                    </button>
                    <button onClick={extendRecurringTasks} className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 transition-colors" title={t('extend_tasks')}>
                        <Icons.Repeat className="w-5 h-5" />
                    </button>
                    <button onClick={handleScrollToToday} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap">
                        <Icons.Calendar className="w-4 h-4" /> {t('jump_today')}
                    </button>
                    <button onClick={() => setShowAddNoteModal(true)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-2 rounded-lg shadow-sm transition-colors font-bold text-xs whitespace-nowrap">
                        <Icons.Notebook className="w-4 h-4" /> {t('add_note')}
                    </button>
                    <button onClick={() => setShowAddTaskModal(true)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-sm transition-colors font-bold text-xs whitespace-nowrap">
                        <Icons.ListTodo className="w-4 h-4" /> {t('add_task')}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative">
                {viewMode === 'TIMELINE' ? (
                    <div className="p-4 pb-24 relative min-h-[500px]">
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-amber-700/20 dark:bg-amber-700/40 z-0"></div>

                        <div className="space-y-8 relative z-10 pl-2">
                            {sortedItems.length === 0 && (
                                <div className="text-center text-gray-400 mt-20 ml-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <Icons.Notebook className="w-12 h-12 mx-auto mb-3 opacity-50 text-yellow-600 dark:text-yellow-400" />
                                    <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">{t('no_notebook_title')}</h3>
                                    <p className="max-w-md mx-auto text-sm leading-relaxed whitespace-pre-line">{t('no_notebook_desc')}</p>
                                </div>
                            )}

                            {sortedItems.map((item) => {
                                const isToday = new Date(item.date).toDateString() === new Date().toDateString();
                                const dateObj = new Date(item.date);
                                const day = dateObj.getDate();
                                const month = dateObj.toLocaleDateString(lang, { month: 'short' }).toUpperCase();
                                const weekday = dateObj.toLocaleDateString(lang, { weekday: 'short' }).toUpperCase();
                                
                                return (
                                    <div key={item.id} ref={isToday ? todayRef : null} className="relative flex items-start group">
                                        <div className={getNodeStyle(item, isToday)}></div>
                                        
                                        <div className="absolute left-8 -top-3 text-xs font-bold text-amber-800/60 dark:text-amber-500/60 tracking-wide whitespace-nowrap">
                                            {day} {month} <span className="opacity-70 font-normal">{weekday}</span>
                                        </div>

                                        <div className={`ml-12 w-full rounded-xl rounded-tl-none shadow-sm border transition-all overflow-hidden text-gray-900 dark:text-white ${getItemColorClass(item)}`}>
                                            {item.imageUrl && (
                                                <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 overflow-hidden relative cursor-pointer" onClick={() => setSelectedItem(item)}>
                                                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="p-4 flex justify-between items-start">
                                                <div className="flex-1 cursor-pointer" onClick={() => setSelectedItem(item)}>
                                                    <h4 className={`font-bold text-sm ${item.isDone ? 'line-through opacity-60' : ''} text-gray-900 dark:text-white`}>
                                                        {item.title}
                                                    </h4>
                                                    {item.description && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap line-clamp-2">{item.description}</p>}
                                                    
                                                    {item.type === 'TASK' && item.recurrence !== 'none' && (
                                                        <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-0.5 rounded-full">
                                                            <Icons.Repeat className="w-3 h-3" />
                                                            <span>{t(`rec_${item.recurrence}` as any)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-2 ml-2 items-center">
                                                    <button onClick={() => setSelectedItem(item)} className="p-1.5 rounded-lg bg-white/50 dark:bg-gray-600/50 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                                        <Icons.Info className="w-4 h-4" />
                                                    </button>
                                                    {item.type === 'TASK' && (
                                                        <button onClick={() => toggleTaskDone(item.id)} className={`p-1.5 rounded-lg transition-colors ${item.isDone ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-gray-300'}`}>
                                                            <Icons.CheckSquare className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); promptDelete(item); }} className="p-1.5 rounded-lg bg-white/50 dark:bg-gray-600/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                        <Icons.Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="h-[calc(100vh-200px)] min-h-[500px]">
                        {renderCalendar()}
                    </div>
                )}
            </div>

            {showAddNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><Icons.Notebook className="w-5 h-5 text-yellow-500"/> {t('add_note')}</h3>
                        <div className="space-y-4 overflow-y-auto">
                            <div className="flex justify-center">
                                <div className="relative group cursor-pointer w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    {selectedImage ? (
                                        <>
                                            <img src={selectedImage} className="w-full h-full object-cover" alt="Note" />
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedImage(undefined); }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-sm"><Icons.X className="w-4 h-4" /></button>
                                        </>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-gray-400 text-gray-900 dark:text-white">
                                            <Icons.Camera className="w-8 h-8 mb-1" />
                                            <span className="text-xs font-medium">{t('add_photo_opt')}</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload && handleImageUpload(e, setSelectedImage)} />
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('note_title_label')} *</label>
                                <input type="text" maxLength={99} value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" placeholder={t('note_title_ph')} autoFocus />
                            </div>
                            <DatePicker label={`${t('log_date_label')} *`} value={date} onChange={setDate} required />
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('desc_label')}</label>
                                <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowAddNoteModal(false)} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">{t('cancel')}</button>
                                <button onClick={handleAddNote} disabled={!title} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50">{t('save_entry')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2"><Icons.ListTodo className="w-5 h-5 text-green-500"/> {t('add_task')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('task_title_label')} *</label>
                                <input type="text" maxLength={99} value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" placeholder={t('task_title_ph')} autoFocus />
                            </div>
                            <DatePicker label={`${t('log_date_label')} *`} value={date} onChange={setDate} required />
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('recurrence_label')}</label>
                                <select value={recurrence} onChange={e => setRecurrence(e.target.value as RecurrenceType)} className="w-full p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="none">{t('rec_none')}</option>
                                    <option value="weekly">{t('rec_weekly')}</option>
                                    <option value="biweekly">{t('rec_biweekly')}</option>
                                    <option value="fourweekly">{t('rec_fourweekly')}</option>
                                    <option value="monthly">{t('rec_monthly')}</option>
                                    <option value="quarterly">{t('rec_quarterly')}</option>
                                    <option value="yearly">{t('rec_yearly')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{t('desc_label')}</label>
                                <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowAddTaskModal(false)} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">{t('cancel')}</button>
                                <button onClick={handleAddTask} disabled={!title} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold disabled:opacity-50">{t('save_entry')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showExportModal && renderExportModal()}
            {showDeleteModal && itemToDelete && renderDeleteModal()}
            {selectedItem && renderDetailView()}
            {showEditRecurrenceModal && renderRecurrenceUpdateModal()}
            {selectedDayDate && renderDayDetailModal()}
        </div>
    );
};
