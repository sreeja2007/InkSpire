import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Book, Sparkles, Image as ImageIcon, Type, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface StorySegment {
    id: string;
    author: 'user' | 'ai' | 'system';
    content: string;
    imageUrl?: string | null; // For user uploaded images or AI generated context images
}

const StoryEditor: React.FC = () => {
    const location = useLocation();
    const [segments, setSegments] = useState<StorySegment[]>([]);
    const [inputText, setInputText] = useState('');
    const [storyConfig, setStoryConfig] = useState<any>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    
    // Feature States
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [storyTitle, setStoryTitle] = useState<string>('');
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64 of image to send

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [segments, isGeneratingAI]);

    useEffect(() => {
        const state = location.state as { config: any, prompt: string } | null;
        if (state?.config) {
            setStoryConfig(state.config);
            localStorage.setItem('current_story_config', JSON.stringify(state.config));
            
            // Initial Start
            if (segments.length === 0) {
                 handleStartStory(state.config, state.prompt);
            }
        } else {
            const savedConfig = localStorage.getItem('current_story_config');
            if (savedConfig) setStoryConfig(JSON.parse(savedConfig));
        }
    }, [location.state]);

    const handleStartStory = async (config: any, prompt: string) => {
        setIsGeneratingAI(true);
        try {
            const res = await fetch(`${API_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userInput: prompt,
                    context: "",
                    config
                })
            });
            const data = await res.json();
            
            setSegments([{
                id: Date.now().toString(),
                author: 'ai',
                content: data.text,
                imageUrl: null
            }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedImage) || isGeneratingAI) return;

        const currentInput = inputText;
        const currentImage = selectedImage;
        
        // 1. Add User Message to UI
        const newSegment: StorySegment = {
            id: Date.now().toString(),
            author: 'user',
            content: currentInput,
            imageUrl: currentImage
        };

        setSegments(prev => [...prev, newSegment]);
        setInputText('');
        setSelectedImage(null);
        setIsGeneratingAI(true);

        try {
            // 2. Prepare Context (Last few exchanges)
            const contextText = segments.slice(-6).map(s => `${s.author.toUpperCase()}: ${s.content}`).join('\n');

            // 3. Call API
            const res = await fetch(`${API_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userInput: currentInput,
                    image: currentImage, // Send base64 image if present
                    context: contextText,
                    config: storyConfig
                })
            });
            
            const data = await res.json();

            // 4. Add AI Response
            const aiSegment: StorySegment = {
                id: 'ai-' + Date.now(),
                author: 'ai',
                content: data.text
            };
            setSegments(prev => [...prev, aiSegment]);

        } catch (error) {
            console.error('Generation Error:', error);
            setSegments(prev => [...prev, {
                id: 'err-' + Date.now(),
                author: 'system',
                content: '⚠️ Connection failed. Please try again.'
            }]);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const generateCover = async () => {
        if (segments.length === 0) return;
        setIsGeneratingCover(true);
        try {
            const storyText = segments.map(s => s.content).join('\n');
            const res = await fetch(`${API_URL}/api/generate-cover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyText, config: storyConfig })
            });
            const data = await res.json();
            if (data.imageUrl) setCoverImageUrl(data.imageUrl);
        } catch (e) {
            console.error("Cover failed", e);
        } finally {
            setIsGeneratingCover(false);
        }
    };

    const generateTitle = async () => {
        if (segments.length === 0) return;
        setIsGeneratingTitle(true);
        try {
            const storyText = segments.map(s => s.content).join('\n');
            const res = await fetch(`${API_URL}/api/generate-title`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyText, config: storyConfig })
            });
            const data = await res.json();
            if (data.title) setStoryTitle(data.title);
        } catch (e) {
            console.error("Title failed", e);
        } finally {
            setIsGeneratingTitle(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSelectedImage(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* Header */}
            <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 dark:text-white leading-tight">FlowEditor</h1>
                        <p className="text-xs text-slate-500 font-medium">AI Co-Writer</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button 
                        onClick={generateCover} 
                        disabled={isGeneratingCover || segments.length === 0}
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                    >
                        <ImageIcon className="w-4 h-4" />
                        {isGeneratingCover ? 'Painting...' : 'Cover Art'}
                    </Button>
                    <Button 
                        onClick={generateTitle} 
                        disabled={isGeneratingTitle || segments.length === 0}
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                    >
                        <Type className="w-4 h-4" />
                        {isGeneratingTitle ? 'Thinking...' : 'Title'}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* Story Meta Header (Cover & Title) */}
                    {(coverImageUrl || storyTitle) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-6 items-center md:items-start"
                        >
                            {coverImageUrl && (
                                <img src={coverImageUrl} alt="Story Cover" className="w-40 h-60 object-cover rounded-lg shadow-md" />
                            )}
                            <div className="flex-1 text-center md:text-left pt-4">
                                {storyTitle && <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">{storyTitle}</h1>}
                                <div className="text-slate-500 text-sm">Created with NarrativeFlow AI</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Chat Stream */}
                    {segments.map((seg) => (
                        <motion.div 
                            key={seg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${seg.author === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-4 max-w-[85%] ${seg.author === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    seg.author === 'user' ? 'bg-indigo-100 text-indigo-600' : 
                                    seg.author === 'system' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                                }`}>
                                    {seg.author === 'user' ? <User size={16} /> : seg.author === 'system' ? <Settings size={16} /> : <Sparkles size={16} />}
                                </div>

                                {/* Content */}
                                <div className="space-y-2">
                                    {seg.imageUrl && (
                                        <img src={seg.imageUrl} alt="Context" className="w-48 h-auto rounded-lg border border-slate-200 dark:border-slate-700 mb-2" />
                                    )}
                                    <div className={`p-5 rounded-2xl leading-relaxed text-sm shadow-sm ${
                                        seg.author === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : seg.author === 'system'
                                            ? 'bg-red-50 text-red-800 border-red-100 border'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                    }`}>
                                        <div dangerouslySetInnerHTML={{ __html: seg.content.replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isGeneratingAI && (
                         <div className="flex justify-start">
                             <div className="flex gap-4 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                                    <Sparkles size={16} />
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                                </div>
                             </div>
                         </div>
                    )}
                    
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-3xl mx-auto flex flex-col gap-3">
                    {selectedImage && (
                        <div className="relative w-fit">
                            <img src={selectedImage} alt="Preview" className="h-16 rounded-lg border border-slate-200" />
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                        />
                        
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder={isGeneratingAI ? "AI is writing..." : "Type your action or dialogue..."}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                            disabled={isGeneratingAI}
                        />
                        <Button 
                            onClick={handleSend}
                            disabled={ (!inputText.trim() && !selectedImage) || isGeneratingAI }
                            className="rounded-xl w-12 h-12 p-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                        >
                            <Send size={20} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryEditor;
