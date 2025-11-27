
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';
import { GARDENER_CONFIG } from '../../gardener_config';
import { Plant, GardenLogItem, TimelineItem, ModulesConfig } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { trackUsage } from '../../services/usageService';

interface FlowerixChatWidgetProps {
    plants: Plant[];
    gardenLogs: GardenLogItem[];
    lang: 'en' | 'nl';
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    isDocked: boolean;
    setIsDocked: (docked: boolean) => void;
    width: number;
    setWidth: (width: number) => void;
    onAddToNotebook: (item: TimelineItem) => void;
    chatTrigger?: { text: string, timestamp: number } | null;
    modules: ModulesConfig;
}

interface Message {
    id: string;
    sender: 'user' | 'flora';
    text: string;
    timestamp: Date;
    hideActions?: boolean;
}

type PersonaType = 'expert' | 'junior' | 'professor' | 'architect';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const FlowerixChatWidget: React.FC<FlowerixChatWidgetProps> = ({ 
    plants, gardenLogs, lang, 
    isOpen, setIsOpen, isDocked, setIsDocked, width, setWidth, onAddToNotebook,
    chatTrigger, modules
}) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activePersona, setActivePersona] = useState<PersonaType>('expert');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null); // Ref for auto-focus
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    // Clear Confirmation State
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Summary Modal State
    const [showSummary, setShowSummary] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    // Date Selection Modal State
    const [pendingNotebookAction, setPendingNotebookAction] = useState<{ text: string, type: 'NOTE' | 'TASK' } | null>(null);
    const [dateOffset, setDateOffset] = useState(0);

    const hasUserMessages = messages.some(m => m.sender === 'user');

    // Effect to handle chat trigger from AI Spark
    useEffect(() => {
        if (chatTrigger) {
            setInput(chatTrigger.text);
            setActivePersona('expert'); // Ensure Flora the Gardener is selected
            if (isOpen && inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [chatTrigger, isOpen]);

    const getWelcomeMessage = (persona: PersonaType = 'expert'): Message => {
        let text = "";
        
        if (persona === 'junior') {
            text = lang === 'nl' 
                ? "Hoi! Ik ben Flora Junior. Ik leg alles simpel uit in Jip-en-janneke taal! 🎒" 
                : "Hi! I'm Flora Junior. I'll explain everything simply! 🎒";
        } else if (persona === 'professor') {
            text = lang === 'nl' 
                ? "Uitstekend. Prof. Dr. Flora hier. Laten we dit wetenschappelijk benaderen. 🎓" 
                : "Excellent. Prof. Dr. Flora here. Let us approach this scientifically. 🎓";
        } else if (persona === 'architect') {
            text = lang === 'nl'
                ? "Hallo, ik ben Peter de Tuinarchitect. Laten we kijken naar de indeling en sfeer van je droomtuin! 📐"
                : "Hello, I am Peter the Landscape Architect. Let's discuss the layout and atmosphere of your dream garden! 📐";
        } else {
            text = lang === 'nl' 
                ? "Hoi! Ik ben Flora 🌻. Hoe kan ik je helpen met je tuin vandaag?"
                : "Hi! I'm Flora 🌻. How can I help you with your garden today?";
        }

        return {
            id: Date.now().toString(), // Unique ID to force render
            sender: 'flora',
            text: text,
            timestamp: new Date(),
            hideActions: true
        };
    };

    // Initialize welcome message on mount or language change
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([getWelcomeMessage(activePersona)]);
        }
    }, [lang]);

    // Auto-scroll
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            
            // Calculate new width based on mouse position from right edge
            const newWidth = window.innerWidth - e.clientX;
            
            // Constraints (min 300px, max 800px or window width - margin)
            const maxWidth = Math.min(800, window.innerWidth - 20);
            if (newWidth > 300 && newWidth < maxWidth) {
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        // Undock if screen becomes too small
        const handleResize = () => {
            if (window.innerWidth < 768 && isDocked) {
                setIsDocked(false);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('resize', handleResize);
        };
    }, [isDocked]);

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    const constructContext = () => {
        const plantContext = plants.map(p => ({
            name: p.name,
            scientific: p.scientificName,
            location: p.isIndoor ? 'Indoor' : 'Outdoor',
            planted: p.datePlanted,
            logs_count: p.logs.length
        }));
        
        const logContext = gardenLogs.slice(0, 5).map(l => ({
            date: l.date,
            title: l.title
        }));

        return `
CONTEXT DATA (JSON):
Plants: ${JSON.stringify(plantContext)}
Recent Garden Logs: ${JSON.stringify(logContext)}
Current Date: ${new Date().toLocaleDateString()}
`;
    };

    const callGeminiAPI = async (userMessage: string, history: Message[]) => {
        try {
            const context = constructContext();
            const chatHistoryStr = history.map(m => `${m.sender === 'user' ? 'User' : 'Model'}: ${m.text}`).join('\n');
            const langInstruction = lang === 'en' 
                ? "IMPORTANT: The user's language is ENGLISH. Translate your persona and ALL responses to ENGLISH." 
                : "Taal: Nederlands.";
            
            // Inject active persona instructions
            const personaInstruction = GARDENER_CONFIG.personas[activePersona];

            const prompt = `
${GARDENER_CONFIG.system_instruction}
${personaInstruction}
${langInstruction}
${context}
CHAT HISTORY:
${chatHistoryStr}
User: ${userMessage}
Model:`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: prompt }] },
            });

            const outputText = response.text || (lang === 'nl' ? "Hmm, ik kan even niet nadenken." : "Hmm, I can't think right now.");
            
            // Track tokens (Chat typically doesn't use images in this widget flow currently)
            trackUsage(prompt, outputText, 0);

            return outputText;
        } catch (error) {
            console.error("Chat Error:", error);
            return lang === 'nl' ? "Oeps! Mijn internetverbinding is even weg." : "Oops! Connection issues.";
        }
    };

    const handleSummaryCommand = async () => {
        setIsGeneratingSummary(true);
        setShowSummary(true);
        try {
            const historyStr = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
            const langName = lang === 'nl' ? 'Dutch' : 'English';
            const prompt = `Summarize this conversation into concrete action points (bullet points). Language: ${langName}.\n\nConversation:\n${historyStr}`;
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: prompt }] },
            });
            
            const result = response.text || "Error.";
            setSummaryText(result);
            trackUsage(prompt, result, 0);

        } catch (e) {
            setSummaryText("Error generating summary.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleFollowUpCommand = async () => {
        setIsLoading(true);
        try {
            const lastFlora = [...messages].reverse().find(m => m.sender === 'flora');
            if (!lastFlora) { setIsLoading(false); return; }
            const langName = lang === 'nl' ? 'Dutch' : 'English';
            const prompt = `Generate 1 logical, short follow-up question the user might ask based on your last answer: "${lastFlora.text}". Return ONLY the question. Language: ${langName}.`;
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: prompt }] },
            });
            if (response.text) {
                setInput(response.text.trim());
                trackUsage(prompt, response.text, 0);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const switchPersona = (persona: PersonaType) => {
        if (activePersona === persona) return;
        setActivePersona(persona);
        
        // Generate a welcome message for the new persona
        const welcomeMsg = getWelcomeMessage(persona);
        // Ensure it's treated as a new message
        welcomeMsg.id = Date.now().toString();
        
        setMessages(prev => [...prev, welcomeMsg]);
    };

    const handleCommandClick = async (cmd: string) => {
        if (cmd === '#junior') { switchPersona('junior'); return; }
        if (cmd === '#professor') { switchPersona('professor'); return; }
        if (cmd === '#expert') { switchPersona('expert'); return; }
        if (cmd === '#architect') { switchPersona('architect'); return; }
        
        if (cmd === '#summary') { await handleSummaryCommand(); return; }
        if (cmd === '#next') { await handleFollowUpCommand(); return; }
    };

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        // Handle Typed Commands manually if user types them
        const lowerInput = trimmedInput.toLowerCase();
        if (lowerInput === '#junior') { switchPersona('junior'); setInput(''); return; }
        if (lowerInput === '#professor') { switchPersona('professor'); setInput(''); return; }
        if (lowerInput === '#expert') { switchPersona('expert'); setInput(''); return; }
        if (lowerInput === '#architect') { switchPersona('architect'); setInput(''); return; }
        if (lowerInput.startsWith('#samenvatting') || lowerInput.startsWith('#summary')) { setInput(''); await handleSummaryCommand(); return; }
        if (lowerInput.startsWith('#vervolgvraag') || lowerInput.startsWith('#next')) { setInput(''); await handleFollowUpCommand(); return; }

        // Regular Message
        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: trimmedInput, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        const responseText = await callGeminiAPI(userMsg.text, messages);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'flora', text: responseText, timestamp: new Date() }]);
        setIsLoading(false);
    };

    const handleClearClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowClearConfirm(true);
    };

    const confirmClearChat = () => {
        setMessages([getWelcomeMessage(activePersona)]);
        setShowClearConfirm(false);
    };

    const handleConvertToNotebook = (text: string, type: 'NOTE' | 'TASK') => {
        setPendingNotebookAction({ text, type });
        setDateOffset(0); // Reset to today
    };

    const confirmNotebookEntry = () => {
        if (!pendingNotebookAction) return;

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dateOffset);
        
        const title = pendingNotebookAction.type === 'NOTE' 
            ? (lang === 'nl' ? 'Notitie van Flora' : 'Note from Flora')
            : (lang === 'nl' ? 'Taak van Flora' : 'Task from Flora');
            
        const newItem: TimelineItem = {
            id: Date.now().toString(),
            type: pendingNotebookAction.type,
            title: title,
            description: pendingNotebookAction.text,
            date: targetDate.toISOString().split('T')[0],
            isDone: false,
            recurrence: 'none'
        };
        onAddToNotebook(newItem);
        setPendingNotebookAction(null);
    };

    const getCalculatedDateLabel = () => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dateOffset);
        
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateString = targetDate.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-US', options);
        
        if (dateOffset === 0) return lang === 'nl' ? `Vandaag, ${dateString}` : `Today, ${dateString}`;
        if (dateOffset === 1) return lang === 'nl' ? `Morgen, ${dateString}` : `Tomorrow, ${dateString}`;
        if (dateOffset === -1) return lang === 'nl' ? `Gisteren, ${dateString}` : `Yesterday, ${dateString}`;
        
        return dateString;
    };

    // Render formatted text (Bold, Italic, Lists, Headers)
    const renderMessageContent = (text: string) => {
        const parseInline = (content: string) => {
            // Split by bold (**text**) and italic (*text*)
            const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                    return <em key={i} className="italic">{part.slice(1, -1)}</em>;
                }
                return part;
            });
        };

        return text.split('\n').map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={index} className="h-2" />;

            // Headers (Map to bold, slightly larger)
            if (trimmed.startsWith('###')) return <div key={index} className="font-bold text-sm mt-2">{parseInline(trimmed.replace(/^###\s/, ''))}</div>;
            if (trimmed.startsWith('##')) return <div key={index} className="font-bold text-sm mt-3">{parseInline(trimmed.replace(/^##\s/, ''))}</div>;
            if (trimmed.startsWith('#')) return <div key={index} className="font-bold text-base mt-4 underline">{parseInline(trimmed.replace(/^#\s/, ''))}</div>;

            // Unordered List
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                return (
                    <div key={index} className="flex items-start gap-2 ml-2 mb-1">
                        <span className="mt-1.5 w-1 h-1 bg-current rounded-full flex-shrink-0 opacity-70"></span>
                        <span className="leading-relaxed">{parseInline(trimmed.replace(/^[-*•]\s/, ''))}</span>
                    </div>
                );
            }

            // Ordered List
            const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
            if (orderedMatch) {
                return (
                    <div key={index} className="flex items-start gap-1 ml-1 mb-1">
                        <span className="font-bold min-w-[16px]">{orderedMatch[1]}.</span>
                        <span className="leading-relaxed">{parseInline(orderedMatch[2])}</span>
                    </div>
                );
            }

            // Standard Paragraph
            return <div key={index} className="mb-1 leading-relaxed">{parseInline(trimmed)}</div>;
        });
    };

    // Style Helpers based on Persona
    const getHeaderStyle = () => {
        switch(activePersona) {
            case 'junior': return 'from-orange-400 to-yellow-500';
            case 'professor': return 'from-indigo-900 to-purple-800';
            case 'architect': return 'from-cyan-600 to-blue-600';
            default: return 'from-emerald-600 to-green-500';
        }
    };

    const getAvatar = () => {
        switch(activePersona) {
            case 'junior': return '🎒';
            case 'professor': return '🎓';
            case 'architect': return '📐';
            default: return '🌻';
        }
    };

    const getName = () => {
        if (activePersona === 'junior') return 'Flora Junior';
        if (activePersona === 'professor') return 'Prof. Dr. Flora';
        if (activePersona === 'architect') return 'Peter Architect';
        return lang === 'nl' ? 'Flora de Hovenier' : 'Flora the Gardener';
    };

    return (
        <>
            {isOpen && (
                <div 
                    className={isDocked 
                        ? `fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-[60] border-l border-gray-200 dark:border-gray-700 transition-none`
                        : `fixed bottom-20 right-4 max-h-[90vh] h-[75vh] md:h-[55vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 z-50 animate-in slide-in-from-bottom-10 zoom-in-95 duration-300`
                    }
                    style={{ 
                        width: `${width}px`, 
                        maxWidth: isDocked ? '100vw' : '90vw', // Mobile safety
                        height: isDocked ? '100%' : undefined // Default height handled by classes
                    }}
                >
                    {/* Resize Handle (Left Edge) - Visible mainly on Desktop when Docked */}
                    {isDocked && (
                        <div 
                            className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize hover:bg-green-500/50 z-50 hidden md:flex items-center justify-center group transition-colors"
                            onMouseDown={startResize}
                        >
                            <div className="h-8 w-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-green-500 transition-colors"></div>
                        </div>
                    )}

                    {/* Custom Clear Confirmation Overlay */}
                    {showClearConfirm && (
                        <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl w-full max-w-[250px] text-center">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                                    {lang === 'nl' ? "Geschiedenis wissen?" : "Clear History?"}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    {lang === 'nl' ? "Dit kan niet ongedaan worden gemaakt." : "This cannot be undone."}
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowClearConfirm(false)} 
                                        className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        {lang === 'nl' ? "Annuleren" : "Cancel"}
                                    </button>
                                    <button 
                                        onClick={confirmClearChat} 
                                        className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-colors shadow-md"
                                    >
                                        {lang === 'nl' ? "Wissen" : "Clear"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className={`bg-gradient-to-r ${getHeaderStyle()} p-4 flex items-center justify-between shadow-md flex-shrink-0 transition-colors duration-500 ${isDocked ? '' : 'cursor-pointer'}`} onClick={() => !isDocked && setIsDocked(true)}>
                        <div className="flex items-center gap-3 ml-2">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border-2 border-white/30">
                                {getAvatar()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white text-sm">{getName()}</h3>
                                    <div className="relative group">
                                        <Icons.ShieldAlert 
                                            className="w-4 h-4 text-white/70 hover:text-white cursor-help transition-colors" 
                                            onClick={(e) => { e.stopPropagation(); setShowDisclaimer(!showDisclaimer); }}
                                        />
                                        {showDisclaimer && (
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-xl text-[10px] text-gray-600 dark:text-gray-300 z-50 border border-gray-200 dark:border-gray-700 leading-tight">
                                                {lang === 'nl' 
                                                    ? "Flora is een AI en kan fouten maken. Flowerix is niet aansprakelijk voor advies m.b.t. eetbaarheid of medisch gebruik." 
                                                    : "Flora is an AI and can make mistakes. Flowerix is not liable for advice regarding edible or medicinal use."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="text-white/80 text-xs flex items-center gap-1">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> Online
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Dock Toggle (Desktop Only) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsDocked(!isDocked); }} 
                                className="hidden md:flex text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" 
                                title={isDocked ? "Undock" : "Dock to Right"}
                            >
                                {isDocked ? <Icons.Pin className="w-5 h-5 fill-current" /> : <Icons.PinOff className="w-5 h-5" />}
                            </button>
                            
                            <button onClick={handleClearClick} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" title="Clear Chat">
                                <Icons.Trash2 className="w-5 h-5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" title="Close">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area Container - Flex grow to fill space */}
                    <div className="flex-1 relative min-h-0">
                        
                        {/* Fixed Background Layer */}
                        <div className="absolute inset-0 z-0">
                            <img 
                                src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80" 
                                alt="Garden Background" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm"></div>
                        </div>

                        {/* Scrollable Content Layer */}
                        <div className="absolute inset-0 z-10 overflow-y-auto p-4 scroll-smooth">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-green-100/90 dark:bg-green-900/60 text-green-900 dark:text-green-100 rounded-tr-none backdrop-blur-sm' : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700 backdrop-blur-sm'}`}>
                                            {renderMessageContent(msg.text)}
                                        </div>
                                        {msg.sender === 'flora' && !msg.hideActions && modules.notebook && (
                                            <div className="flex gap-2 mt-1 ml-2">
                                                <button 
                                                    onClick={() => handleConvertToNotebook(msg.text, 'TASK')}
                                                    className="text-[10px] flex items-center gap-1 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors shadow-sm"
                                                >
                                                    <Icons.ListTodo className="w-3 h-3" /> {lang === 'nl' ? 'Maak Taak' : 'Task'}
                                                </button>
                                                <button 
                                                    onClick={() => handleConvertToNotebook(msg.text, 'NOTE')}
                                                    className="text-[10px] flex items-center gap-1 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 text-gray-500 hover:text-yellow-600 hover:border-yellow-300 transition-colors shadow-sm"
                                                >
                                                    <Icons.Notebook className="w-3 h-3" /> {lang === 'nl' ? 'Maak Notitie' : 'Note'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700 flex gap-1">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 relative z-20">
                        
                        {/* Persona Segmented Control */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-2 overflow-x-auto no-scrollbar gap-1">
                            <button 
                                onClick={() => switchPersona('expert')} 
                                className={`flex-1 py-1.5 px-2 text-[10px] md:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${activePersona === 'expert' ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 hover:text-green-600'}`}
                            >
                                <span>🌻</span> {lang === 'nl' ? 'Expert' : 'Gardener'}
                            </button>
                            <button 
                                onClick={() => switchPersona('junior')} 
                                className={`flex-1 py-1.5 px-2 text-[10px] md:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${activePersona === 'junior' ? 'bg-white dark:bg-gray-600 shadow text-orange-500' : 'text-gray-500 dark:text-gray-400 hover:text-orange-500'}`}
                            >
                                <span>🎒</span> {lang === 'nl' ? 'Junior' : 'Simple'}
                            </button>
                            <button 
                                onClick={() => switchPersona('professor')} 
                                className={`flex-1 py-1.5 px-2 text-[10px] md:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${activePersona === 'professor' ? 'bg-white dark:bg-gray-600 shadow text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 hover:text-purple-600'}`}
                            >
                                <span>🎓</span> {lang === 'nl' ? 'Prof.' : 'Prof.'}
                            </button>
                            <button 
                                onClick={() => switchPersona('architect')} 
                                className={`flex-1 py-1.5 px-2 text-[10px] md:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${activePersona === 'architect' ? 'bg-white dark:bg-gray-600 shadow text-cyan-600 dark:text-cyan-400' : 'text-gray-500 dark:text-gray-400 hover:text-cyan-600'}`}
                            >
                                <span>📐</span> {lang === 'nl' ? 'Peter' : 'Peter'}
                            </button>
                        </div>

                        <div className="relative flex items-center gap-2">
                            <input 
                                ref={inputRef}
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={lang === 'nl' ? "Stel je vraag aan Flora..." : "Ask Flora something..."}
                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                            />
                            <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95">
                                <Icons.Send className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Quick Actions - Only if conversation started */}
                        {hasUserMessages && (
                            <div className="flex gap-2 mt-2 animate-in slide-in-from-bottom-2 fade-in overflow-x-auto no-scrollbar">
                                <button onClick={() => handleCommandClick('#summary')} className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full whitespace-nowrap border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1">
                                    <Icons.FileText className="w-3 h-3" /> {lang === 'nl' ? 'Samenvatting' : 'Summary'}
                                </button>
                                <button onClick={() => handleCommandClick('#next')} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full whitespace-nowrap border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                                    <Icons.MessageSquare className="w-3 h-3" /> {lang === 'nl' ? 'Vervolgvraag' : 'Next Question'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FAB - Show when closed, regardless of dock state */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-4 right-4 md:bottom-20 md:right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 hover:scale-110 active:scale-95 bg-green-600 text-white hover:bg-green-700"
                >
                    <span className="text-2xl">🌻</span>
                </button>
            )}

            {/* Summary Modal */}
            {showSummary && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-gray-900/50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-green-800 dark:text-green-400 flex items-center gap-2">
                                <Icons.FileText className="w-5 h-5" /> {lang === 'nl' ? 'Samenvatting' : 'Summary'}
                            </h3>
                            <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white"><Icons.X /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {isGeneratingSummary ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                    <span>{lang === 'nl' ? 'Bezig met samenvatten...' : 'Summarizing...'}</span>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert text-sm text-gray-800 dark:text-gray-200">
                                    <p className="whitespace-pre-line">{summaryText}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                            {modules.notebook && (
                                <>
                                    <button 
                                        onClick={() => handleConvertToNotebook(summaryText, 'NOTE')}
                                        className="py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                                    >
                                        <Icons.Notebook className="w-4 h-4" /> {lang === 'nl' ? 'Notitie' : 'Note'}
                                    </button>
                                    <button 
                                        onClick={() => handleConvertToNotebook(summaryText, 'TASK')}
                                        className="py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        <Icons.ListTodo className="w-4 h-4" /> {lang === 'nl' ? 'Taak' : 'Task'}
                                    </button>
                                </>
                            )}
                            <button onClick={() => { navigator.clipboard.writeText(summaryText); alert(lang === 'nl' ? "Gekopieerd!" : "Copied!"); }} className="py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 text-xs">
                                <Icons.Copy className="w-4 h-4" /> {lang === 'nl' ? 'Kopieer' : 'Copy'}
                            </button>
                            <button onClick={() => alert("PDF: OK")} className="py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl font-bold flex items-center justify-center gap-2 text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                <Icons.Download className="w-4 h-4" /> PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Selection Modal for Notebook */}
            {pendingNotebookAction && modules.notebook && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border-2 border-green-500 transform transition-all scale-100">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                            {pendingNotebookAction.type === 'NOTE' ? <Icons.Notebook className="w-5 h-5 text-yellow-500" /> : <Icons.ListTodo className="w-5 h-5 text-green-500" />}
                            {lang === 'nl' ? 'Toevoegen aan Notitieboek' : 'Add to Notebook'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{lang === 'nl' ? 'Kies een datum voor dit item.' : 'Select a date for this item.'}</p>

                        <div className="mb-8 text-center">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                                {getCalculatedDateLabel()}
                            </div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider">{lang === 'nl' ? 'Geselecteerde Datum' : 'Selected Date'}</div>
                        </div>

                        <div className="mb-8">
                            <input 
                                type="range" 
                                min="-30" 
                                max="365" 
                                value={dateOffset} 
                                onChange={(e) => setDateOffset(Number(e.target.value))}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{dateOffset}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setDateOffset(dateOffset - 1)} className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">-1</button>
                                    <button onClick={() => setDateOffset(dateOffset + 1)} className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">+1</button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setPendingNotebookAction(null)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs">{lang === 'nl' ? 'Annuleren' : 'Cancel'}</button>
                            <button onClick={confirmNotebookEntry} className="flex-1 py-2 bg-green-600 text-white rounded-xl font-bold text-xs">{lang === 'nl' ? 'Opslaan' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
