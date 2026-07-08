import React, { useState, useRef, useEffect } from 'react';
import { Announcement, ConcessionOrder, FanCamPhoto, ParkingSpot, StadiumSector, StadiumState } from '../types';
import {
  Send, Bot, User, Volume2, Globe, Sparkles, Check,
  HelpCircle, RefreshCw, Smartphone, Wifi, Battery,
  Clock, MapPin, ShieldAlert, Heart, Flame, Compass, Eye,
  Tag, CreditCard, ShoppingCart, Info, CheckCircle, Navigation,
  Play, Pause, Radio, VolumeX, FlameKindling, Star
} from 'lucide-react';

interface FanCompanionProps {
  announcements: Announcement[];
  onAskQuestion: (question: string) => Promise<string>;
  concessionOrders?: ConcessionOrder[];
  onPlaceOrder?: (items: Array<{ name: string; quantity: number }>, seatInfo: { sectorId: string; rowSeat: string }, deliveryType: 'seat' | 'pickup', totalPrice: number) => Promise<void>;
  fanCamPhotos?: FanCamPhoto[];
  onUploadPhoto?: (username: string, caption: string, url?: string) => Promise<void>;
  onLikePhoto?: (id: string) => Promise<void>;
  parkingSpots?: ParkingSpot[];
  stepFreeRouting?: boolean;
  onSetStepFreeRouting?: (val: boolean) => void;
  sectors?: StadiumSector[];
  gamePhase?: StadiumState['gamePhase'];
  theme?: 'light' | 'dark';
  language?: string;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  isMarkdown?: boolean;
}

const CONCESSIONS_MENU = [
  { id: 'quesadilla', name: 'Hot Azteca Quesadilla', price: 8.50, desc: 'Fresh flour tortilla filled with Oaxacan melted cheese, jalapeño, and hand-shredded beef.', halal: true, vegan: false },
  { id: 'nachos', name: 'Golden Nachos & Cheese', price: 6.00, desc: 'Crispy warm tortilla chips drenched in warm spiced cheddar and sweet salsa.', halal: true, vegan: true },
  { id: 'chicken_wrap', name: 'Halal Spicy Chicken Wrap', price: 11.00, desc: 'Tender fire-roasted breast with cilantro crema, bell peppers, wrapped in wheat.', halal: true, vegan: false },
  { id: 'vegan_dog', name: 'Earth-First Vegan Hotdog', price: 7.50, desc: 'Plant-based sausage in whole grain bun topped with organic mustard relish.', halal: true, vegan: true },
  { id: 'souvenir_cup', name: 'Official Cup Soda Cup', price: 4.50, desc: 'Collectable souvenir cup. Refillable and 100% recyclable!', halal: true, vegan: true }
];

const PRESET_MOMENTS = [
  { url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop', caption: 'Goal Celebration! Viva México! 🇲🇽⚽' },
  { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop', caption: 'Amazing match view under the Azteca roof! 😍' },
  { url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&auto=format&fit=crop', caption: 'Waves across Estadio Azteca! Incredibly loud!' },
  { url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=500&auto=format&fit=crop', caption: 'Post-match Fan Zone party is unreal!' }
];

export default function FanCompanion({
  announcements,
  onAskQuestion,
  concessionOrders = [],
  onPlaceOrder = async () => {},
  fanCamPhotos = [],
  onUploadPhoto = async () => {},
  onLikePhoto = async () => {},
  parkingSpots = [],
  stepFreeRouting = false,
  onSetStepFreeRouting = () => {},
  sectors = [],
  gamePhase = 'pre-match',
  theme = 'dark',
  language = 'en'
}: FanCompanionProps) {

  // Tab within the phone frame: 'chat' | 'concessions' | 'fancam' | 'parking' | 'access'
  const [phoneTab, setPhoneTab] = useState<'chat' | 'concessions' | 'fancam' | 'parking' | 'access'>('chat');

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "### ¡Hola! Bonjour! Welcome!\nI am **ArenaAI**, your multilingual digital stadium ambassador for the FIFA World Cup 2026. 🏆\n\nHow can I help you enjoy your gameday at Estadio Azteca today? Ask me about clear bag policies, halal/vegan food stalls, calm rooms, or transportation back to the city!"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Translation States (for announcements panel on the right)
  const [targetLang, setTargetLang] = useState('Spanish');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslatingId, setIsTranslatingId] = useState<string | null>(null);

  // Concessions ordering states
  const [cart, setCart] = useState<Record<string, number>>({});
  const [seatSectorId, setSeatSectorId] = useState('stand-east');
  const [seatRowSeat, setSeatRowSeat] = useState('');
  const [deliveryType, setDeliveryType] = useState<'seat' | 'pickup'>('seat');
  const [concessionSuccess, setConcessionSuccess] = useState(false);

  // Gamified detour discount states
  const [isDetourDiscountApplied, setIsDetourDiscountApplied] = useState(false);
  const [detourBannerDismissed, setDetourBannerDismissed] = useState(false);

  // FanCam Upload States
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadUsername, setUploadUsername] = useState('');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [photoSuccess, setPhotoSuccess] = useState(false);

  // Parking States
  const [parkedLot, setParkedLot] = useState('lot-7');
  const [parkedSpace, setParkedSpace] = useState('');
  const [carSaved, setCarSaved] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // AR Indoor Wayfinding Hud States
  const [showARCamera, setShowARCamera] = useState(false);
  const [arDestination, setArDestination] = useState<'seat' | 'car'>('seat');

  // Accessibility States
  const [isStreamingADC, setIsStreamingADC] = useState(false);
  const [audioBars, setAudioBars] = useState<number[]>([10, 20, 15, 30, 25, 45, 12, 18, 22, 35, 10]);
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio equalizer simulation for ADC streaming
  useEffect(() => {
    if (!isStreamingADC) return;
    const interval = setInterval(() => {
      setAudioBars(prev => prev.map(() => Math.floor(Math.random() * 40) + 5));
    }, 150);
    return () => clearInterval(interval);
  }, [isStreamingADC]);

  // Handle chat submission
  const handleSend = async (text: string) => {
    if (!text.trim() || isAsking) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputText('');
    setIsAsking(true);

    try {
      const reply = await onAskQuestion(text);
      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I lost my connection to the stadium command. Please try asking again." }]);
    } finally {
      setIsAsking(false);
    }
  };

  // Translate announcements on the right side panel
  const handleTranslateAnnouncement = async (annId: string, text: string) => {
    if (isTranslatingId) return;
    setIsTranslatingId(annId);

    try {
      const response = await fetch('/api/fan/translate-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: targetLang })
      });
      const data = await response.json();
      setTranslations(prev => ({ ...prev, [annId]: data.translation }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslatingId(null);
    }
  };

  // Cart Helpers
  const updateCartQty = (itemId: string, diff: number) => {
    setCart(prev => {
      const cur = prev[itemId] || 0;
      const next = Math.max(0, cur + diff);
      return { ...prev, [itemId]: next };
    });
  };

  const getCartTotal = () => {
    let subtotal = 0;
    (Object.entries(cart) as [string, number][]).forEach(([id, qty]) => {
      const item = CONCESSIONS_MENU.find(m => m.id === id);
      if (item) subtotal += item.price * qty;
    });
    if (subtotal === 0) return 0;
    const baseTotal = subtotal + (deliveryType === 'seat' ? 1.50 : 0);
    if (isDetourDiscountApplied) {
      return baseTotal * 0.5;
    }
    return baseTotal;
  };

  // Submit Concession Order
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = getCartTotal();
    if (total === 0 || !seatRowSeat) return;

    const itemsOrdered = (Object.entries(cart) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const m = CONCESSIONS_MENU.find(x => x.id === id)!;
        return { name: m.name, quantity: qty };
      });

    await onPlaceOrder(
      itemsOrdered,
      { sectorId: seatSectorId, rowSeat: seatRowSeat },
      deliveryType,
      total
    );

    setCart({});
    setConcessionSuccess(true);
    setTimeout(() => setConcessionSuccess(false), 5000);
  };

  // Submit FanCam Photo
  const handlePhotoPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = uploadUsername.trim() ? `@${uploadUsername.replace('@', '')}` : '@WorldCupFan';
    const captionText = uploadCaption.trim() ? uploadCaption.trim() : PRESET_MOMENTS[selectedPresetIdx].caption;

    await onUploadPhoto(
      handle,
      captionText,
      PRESET_MOMENTS[selectedPresetIdx].url
    );

    setUploadCaption('');
    setUploadUsername('');
    setPhotoSuccess(true);
    setTimeout(() => setPhotoSuccess(false), 4000);
  };

  // Simulate haptic buzz
  const handleHapticTest = () => {
    if (!hapticsEnabled) return;
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 800);
  };

  const SUGGESTED_QUESTIONS = [
    { label: "🎒 Bag policy?", q: "What is the stadium bag policy and can I bring backpacks?" },
    { label: "♿ Wheelchair access?", q: "What accessibility features are available for wheelchairs and are there ramps?" },
    { label: "🌮 Food concessions?", q: "What food concessions are available? Do you have halal or vegan food?" },
    { label: "🚇 Getting home?", q: "How do I get back to Mexico City center using the Metro or rideshares?" },
    { label: "🍼 Infant rules?", q: "Can I bring baby formula or strollers inside?" }
  ];

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-all duration-300 ${isShaking ? 'animate-bounce' : ''}`}>

      {/* LEFT COLUMN: Phone Frame App Simulation (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <span className="text-xs text-slate-500 mb-2 font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold select-none">
          <Smartphone className="w-4 h-4 text-blue-600" />
          Interactive Fan App Simulator
        </span>

        {/* Smartphone Bezel Wrapper */}
        <div className="w-full max-w-[420px] bg-slate-900 border-[10px] border-slate-950 rounded-[42px] overflow-hidden shadow-2xl relative aspect-[9/18] flex flex-col">

          {/* Phone Top Notch / Speaker & Camera */}
          <div className="absolute top-0 inset-x-0 h-6 bg-slate-950 flex justify-center items-center z-40">
            <div className="w-20 h-3.5 bg-slate-900 rounded-full flex justify-around items-center px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-850 block"></span>
              <span className="w-8 h-1 bg-slate-850 rounded-full block"></span>
            </div>
          </div>

          {/* Phone Status Bar */}
          <div className="h-10 bg-slate-900 pt-6 px-6 flex justify-between items-center text-[10px] font-mono text-slate-400 select-none z-30">
            <span>Estadio Azteca</span>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-slate-400" />
              <span>5G</span>
              <Battery className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* App Header */}
          <div className="bg-blue-900 p-4 border-b border-blue-950 flex items-center gap-3 shrink-0 z-30">
            <div className="w-10 h-10 rounded-full bg-blue-800 border border-blue-700 flex items-center justify-center text-white shadow-sm shrink-0">
              <Bot className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-display uppercase tracking-tight">Azteca Gameday Hub</h4>
              <p className="text-[10px] text-blue-200 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                FIFA Official Virtual Service
              </p>
            </div>
          </div>

          {/* Sub-App Navigation Tab Selector */}
          <div className="bg-blue-950 border-b border-blue-900 flex justify-between text-white text-[9px] font-bold uppercase tracking-wider select-none shrink-0 overflow-x-auto whitespace-nowrap py-1 scrollbar-none z-30">
            <button
              onClick={() => setPhoneTab('chat')}
              className={`flex-1 text-center py-2 transition-colors cursor-pointer ${phoneTab === 'chat' ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-slate-300 hover:text-white'}`}
            >
              💬 AI Guide
            </button>
            <button
              onClick={() => setPhoneTab('concessions')}
              className={`flex-1 text-center py-2 transition-colors cursor-pointer ${phoneTab === 'concessions' ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-slate-300 hover:text-white'}`}
            >
              🍔 Concessions
            </button>
            <button
              onClick={() => setPhoneTab('fancam')}
              className={`flex-1 text-center py-2 transition-colors cursor-pointer ${phoneTab === 'fancam' ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-slate-300 hover:text-white'}`}
            >
              📸 FanCam
            </button>
            <button
              onClick={() => setPhoneTab('parking')}
              className={`flex-1 text-center py-2 transition-colors cursor-pointer ${phoneTab === 'parking' ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-slate-300 hover:text-white'}`}
            >
              🚗 Parking
            </button>
            <button
              onClick={() => setPhoneTab('access')}
              className={`flex-1 text-center py-2 transition-colors cursor-pointer ${phoneTab === 'access' ? 'text-amber-400 border-b-2 border-amber-400 font-black' : 'text-slate-300 hover:text-white'}`}
            >
              ♿ Access
            </button>
          </div>

          {/* EMERGENCY ALARM OVERLAY IN MOBILE */}
          {gamePhase === 'emergency' && (
            <div className="absolute inset-0 bg-red-950/95 z-40 p-6 flex flex-col justify-center items-center text-center text-white space-y-4 animate-in fade-in duration-300">
              <div className="p-4 bg-red-900 border border-red-700 rounded-full animate-bounce">
                <ShieldAlert className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-black tracking-wider uppercase font-display animate-pulse text-red-500">
                CRITICAL EVACUATION ALARM
              </h3>
              <p className="text-xs text-red-100 leading-relaxed font-semibold">
                The Estadio Azteca venue operations team has initiated a safety evacuation.
              </p>
              <div className="bg-red-900/50 border border-red-700/50 p-4 rounded-xl space-y-2 text-left w-full">
                <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest block">Safe Exit Routing (Step-Free):</span>
                <p className="text-[11px] text-white font-medium">
                  • Remain calm. Follow steward instructions.<br />
                  • All exit gates are fully open.<br />
                  • Ramps at Gates A and C are recommended for step-free outbound travel.
                </p>
              </div>
              <div className="text-[10px] text-red-400 font-mono flex items-center gap-1.5 justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                VIBRATION ALARM BROADCAST ACTIVE
              </div>
            </div>
          )}

          {/* AR CAMERA HUD OVERLAY */}
          {showARCamera && (
            <div className="absolute inset-0 bg-slate-950 z-40 flex flex-col justify-between animate-in fade-in duration-300">
              {/* Simulated camera stream overlay */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80')] bg-cover bg-center opacity-30"></div>

              {/* Scanline grid */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_black_90%)] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-25"></div>

              {/* Floating Neon Blue Pathway SVG */}
              <div className="absolute inset-x-0 top-1/4 bottom-1/4 pointer-events-none flex flex-col items-center justify-center">
                <svg className="w-full h-full max-h-[160px] text-blue-400 opacity-90 animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M 50,100 Q 40,60 60,40 T 50,0" fill="none" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="2,2" />
                  <path d="M 46,65 L 50,61 L 54,65" fill="none" stroke="#00f0ff" strokeWidth="1.5" />
                  <path d="M 47,45 L 50,41 L 53,45" fill="none" stroke="#00f0ff" strokeWidth="1.5" />
                </svg>
                <span className="text-[8px] font-mono font-black text-blue-400 bg-blue-950/90 px-2 py-0.5 rounded border border-blue-500/40 shadow-md backdrop-blur-xs uppercase tracking-widest animate-bounce -mt-4">
                  ▲ follow ar route
                </span>
              </div>

              {/* Header HUD bar */}
              <div className="p-3 pt-8 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-blue-400 font-mono font-black uppercase tracking-widest block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    AR WAYFINDING ACTIVE
                  </span>
                  <span className="text-[7.5px] text-slate-400 font-bold font-mono">STADIUM LIDAR BEACON INDOOR_D12</span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => setArDestination('seat')}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${arDestination === 'seat' ? 'bg-blue-600 text-white border border-blue-400 font-bold shadow-md' : 'bg-black/60 text-slate-400 border border-transparent'}`}
                  >
                    My Seat
                  </button>
                  <button
                    onClick={() => setArDestination('car')}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${arDestination === 'car' ? 'bg-blue-600 text-white border border-blue-400 font-bold shadow-md' : 'bg-black/60 text-slate-400 border border-transparent'}`}
                  >
                    My Car
                  </button>
                </div>
              </div>

              {/* Bottom Instruction Sheet */}
              <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-xs space-y-3 z-10 rounded-t-2xl shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <div>
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block">Target Destination:</span>
                    <p className="text-xs font-black text-white uppercase tracking-tight">
                      {arDestination === 'seat' ? '♿ Sector 114 (Premium Stands)' : '📍 Parking Lot 7 Spot'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider block">Distance / ETA:</span>
                    <p className="text-xs font-mono font-black text-blue-400">
                      {arDestination === 'seat' ? '45m • 1.5 mins' : '120m • 4 mins'}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                  {arDestination === 'seat' ? (
                    <>• Proceed forward. Turn left at Concourse 112. Elevators are step-free. Stewards deployed.</>
                  ) : (
                    <>• Proceed to exit Gate D ramp. Follow step-free accessibility crosswalk directly into Lot 7.</>
                  )}
                </p>

                <button
                  onClick={() => setShowARCamera(false)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-1.5 rounded-xl text-[10px] uppercase tracking-wider cursor-pointer transition-colors shadow-lg"
                >
                  Close AR Wayfinder
                </button>
              </div>
            </div>
          )}

          {/* TAB CONTENT PANEL AREA */}
          <div className="flex-grow overflow-y-auto bg-slate-50 relative flex flex-col scrollbar-thin">

            {/* Smart Geo-Fenced Crowd Dispersion Banner */}
            {(() => {
              const congestedSector = sectors.find(s => s.status === 'congested' || s.status === 'critical' || s.currentDensity > 70);
              if (!congestedSector || detourBannerDismissed) return null;

              return (
                <div className="bg-amber-500 text-slate-950 p-3 shrink-0 border-b border-amber-600 shadow-sm animate-in slide-in-from-top duration-300">
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Tag className="w-3 h-3 text-slate-950" />
                    </div>
                    <div className="flex-grow space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider block">🎁 Smart Detour Offer (Geo-Fenced)</span>
                      <p className="text-[10px] leading-tight font-bold">
                        {congestedSector.name} is hitting critical flow peak ({congestedSector.currentDensity}% capacity). Bypass the bottleneck by exiting via <strong className="font-extrabold uppercase">{congestedSector.id === 'gate-b' ? 'Gate C / South Plaza' : 'Gate A / North Plaza'}</strong> and instantly claim a <span className="underline font-black text-blue-900">50% DISCOUNT</span> on your concessions order!
                      </p>

                      <div className="flex gap-1.5 pt-1.5">
                        {!isDetourDiscountApplied ? (
                          <button
                            onClick={() => {
                              setIsDetourDiscountApplied(true);
                              setPhoneTab('concessions');
                            }}
                            className="bg-slate-950 text-white hover:bg-slate-900 font-extrabold text-[8px] px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
                          >
                            Accept & Apply 50% Off
                          </button>
                        ) : (
                          <span className="bg-emerald-950 text-emerald-300 font-extrabold text-[8px] px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                            <Check className="w-2.5 h-2.5 animate-bounce" /> 50% Applied
                          </span>
                        )}
                        <button
                          onClick={() => setDetourBannerDismissed(true)}
                          className="bg-transparent hover:bg-slate-950/10 text-slate-800 hover:text-slate-950 font-bold text-[8px] px-2 py-1 rounded-md uppercase tracking-wider shrink-0 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 1. CHAT SUB-APP */}
            {phoneTab === 'chat' && (
              <>
                <div className="flex-grow p-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-blue-900 border-blue-800 text-white'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}>
                        {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-blue-900 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                      }`}>
                        <div className="whitespace-pre-line prose-invert">
                          {msg.text.split('\n\n').map((paragraph, pIdx) => {
                            if (paragraph.startsWith('###')) {
                              return <h5 key={pIdx} className="font-bold font-display text-blue-900 mt-1 mb-1.5 text-sm">{paragraph.replace('###', '').trim()}</h5>;
                            }
                            if (paragraph.startsWith('-')) {
                              return (
                                <ul key={pIdx} className="list-disc pl-4 space-y-1.5 my-1.5 font-semibold text-slate-700">
                                  {paragraph.split('\n').map((li, lIdx) => (
                                    <li key={lIdx}>{li.replace('-', '').trim()}</li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={pIdx} className="mb-1.5 font-semibold text-slate-700 leading-relaxed">{paragraph}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isAsking && (
                    <div className="flex gap-2.5 max-w-[80%] items-center text-slate-500">
                      <div className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center animate-pulse">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 shadow-sm font-semibold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
                        ArenaAI is typing...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Questions Quick Launcher */}
                <div className="bg-slate-100 border-t border-slate-200 p-2.5 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none shrink-0">
                  {SUGGESTED_QUESTIONS.map((sq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(sq.q)}
                      className="bg-white text-slate-600 hover:text-blue-900 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer shrink-0"
                    >
                      <HelpCircle className="w-3 h-3 text-blue-600" /> {sq.label}
                    </button>
                  ))}
                </div>

                {/* Form Input Bar */}
                <div className="bg-white p-3 border-t border-slate-200 flex gap-2 items-center shrink-0">
                  <label htmlFor="fan-ask-input" className="sr-only">Ask ArenaAI a question</label>
                  <input
                    id="fan-ask-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(inputText); }}
                    placeholder="Ask ArenaAI a question..."
                    className="bg-slate-50 text-slate-800 placeholder-slate-400 border border-slate-200 rounded-full px-4 py-2 text-xs flex-grow focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                  <button
                    onClick={() => handleSend(inputText)}
                    disabled={!inputText.trim() || isAsking}
                    className="bg-blue-900 hover:bg-blue-800 disabled:bg-blue-200 text-white font-bold p-2 rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* 2. EXPRESS CONCESSIONS */}
            {phoneTab === 'concessions' && (
              <div className="p-4 space-y-4 flex-grow flex flex-col justify-between">
                <div>
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4 text-center">
                    <span className="text-[10px] font-black text-blue-950 uppercase tracking-widest block mb-0.5">⚡ In-Seat Concession Delivery</span>
                    <p className="text-[9px] text-blue-700 font-semibold leading-relaxed">
                      Zero long queues. Order food directly to your sector seat, or pre-pay for express skip-line pickup!
                    </p>
                  </div>

                  {/* Menu List */}
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Flame className="w-4 h-4 text-amber-500" /> Azteca Gameday Specialties:
                  </h5>

                  <div className="space-y-3">
                    {CONCESSIONS_MENU.map(item => (
                      <div key={item.id} className="bg-white border border-slate-150 p-3 rounded-xl shadow-xs flex justify-between items-start gap-3">
                        <div className="space-y-1 flex-grow">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-800 leading-tight">{item.name}</span>
                            {item.halal && <span className="text-[7px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded-sm uppercase font-bold">Halal</span>}
                            {item.vegan && <span className="text-[7px] bg-green-50 text-green-700 border border-green-200 px-1 rounded-sm uppercase font-bold">Vegan</span>}
                          </div>
                          <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">{item.desc}</p>
                          <span className="text-xs font-black text-slate-900 font-mono">${item.price.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-0.5 shrink-0 bg-slate-50">
                          <button
                            onClick={() => updateCartQty(item.id, -1)}
                            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-white rounded cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-black text-slate-850">{cart[item.id] || 0}</span>
                          <button
                            onClick={() => updateCartQty(item.id, 1)}
                            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-white rounded cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout & History Panel */}
                <div className="space-y-4 mt-6">
                  {getCartTotal() > 0 && (
                    <form onSubmit={handleCheckout} className="bg-white border-2 border-blue-900 rounded-xl p-3.5 space-y-3 shadow-md">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest block border-b border-slate-100 pb-1">Review Mobile Order</span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="fan-delivery-select" className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Delivery Type</label>
                          <select
                            id="fan-delivery-select"
                            value={deliveryType}
                            onChange={(e) => setDeliveryType(e.target.value as any)}
                            className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1 rounded font-semibold text-slate-850"
                          >
                            <option value="seat">Seat Delivery (+$1.50)</option>
                            <option value="pickup">Express Skip-Line Pickup</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="fan-sector-select" className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Sector Location</label>
                          <select
                            id="fan-sector-select"
                            value={seatSectorId}
                            onChange={(e) => setSeatSectorId(e.target.value)}
                            className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1 rounded font-semibold text-slate-850"
                          >
                            {sectors.map(s => (
                              <option key={s.id} value={s.id}>{s.name.substring(0, 16)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-grow">
                          <label htmlFor="fan-seat-input" className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Row & Seat Number</label>
                          <input
                            id="fan-seat-input"
                            required
                            type="text"
                            value={seatRowSeat}
                            onChange={(e) => setSeatRowSeat(e.target.value)}
                            placeholder="e.g. Row H, Seat 12"
                            className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1 rounded font-semibold text-slate-850"
                          />
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Total Price</span>
                          {isDetourDiscountApplied && (
                            <span className="text-[7.5px] text-emerald-600 font-extrabold block -mt-0.5 animate-pulse">🏷️ 50% OFF Applied</span>
                          )}
                          <span className="text-sm font-black text-slate-900 font-mono">${getCartTotal().toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!seatRowSeat}
                        className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-extrabold py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay with World Cup Wallet
                      </button>
                    </form>
                  )}

                  {concessionSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-center text-[11px] font-bold animate-pulse">
                      ✓ Order Placed! Live prep status synced below.
                    </div>
                  )}

                  {/* Active Orders Tracker */}
                  <div className="bg-slate-100 border border-slate-250 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Active Order Progress Tracker
                    </span>

                    <div className="space-y-2.5 max-h-[150px] overflow-y-auto">
                      {concessionOrders.map((ord) => (
                        <div key={ord.id} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-bold text-slate-700">ORD: {ord.id.toUpperCase().substring(4, 9)}</span>
                            <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[8px] ${
                              ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              ord.status === 'ready' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                              'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                            }`}>
                              {ord.status}
                            </span>
                          </div>

                          <p className="text-[10px] font-semibold text-slate-800 leading-relaxed">
                            {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>

                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase">
                            <span>
                              Loc: {typeof ord.seatInfo === 'object' && ord.seatInfo !== null
                                ? `${ord.seatInfo.sectorId.toUpperCase()} • ${ord.seatInfo.rowSeat}`
                                : String(ord.seatInfo)}
                            </span>
                            <span className="text-slate-600">${ord.totalPrice.toFixed(2)}</span>
                          </div>

                          {ord.status !== 'delivered' && (
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-900 transition-all duration-1000"
                                style={{
                                  width: ord.status === 'received' ? '25%' :
                                         ord.status === 'preparing' ? '60%' :
                                         '90%'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {concessionOrders.length === 0 && (
                        <p className="text-center text-[10px] text-slate-400 py-3 font-semibold">No active concessions orders placed yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. FAN CAM SNAPSHOTS */}
            {phoneTab === 'fancam' && (
              <div className="p-4 space-y-4 flex-grow flex flex-col justify-between">
                <div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-3 rounded-xl mb-4 text-center">
                    <span className="text-[10px] font-black text-amber-950 uppercase tracking-widest block mb-0.5">📸 Live Fan Cam & Jumbotron Link</span>
                    <p className="text-[9px] text-amber-800 font-semibold leading-relaxed">
                      Snap your stadium smile! Approved photos instantly get broadcast on the Estadio Azteca megascreens!
                    </p>
                  </div>

                  {/* Create post form */}
                  <form onSubmit={handlePhotoPost} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-1">Post a Gameday Moment</span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="fan-handle-input" className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Fan Handle</label>
                        <input
                          id="fan-handle-input"
                          type="text"
                          required
                          value={uploadUsername}
                          onChange={(e) => setUploadUsername(e.target.value)}
                          placeholder="e.g. @Charly_Azteca"
                          className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1.5 rounded font-semibold text-slate-850 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="fan-preset-photo-select" className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Select Preset Photo</label>
                        <select
                          id="fan-preset-photo-select"
                          value={selectedPresetIdx}
                          onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                          className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1.5 rounded font-semibold text-slate-850 focus:outline-none"
                        >
                          {PRESET_MOMENTS.map((moment, idx) => (
                            <option key={idx} value={idx}>Scene #{idx+1} ({moment.caption.substring(0, 15)}...)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="fan-caption-input" className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Caption</label>
                      <input
                        id="fan-caption-input"
                        type="text"
                        value={uploadCaption}
                        onChange={(e) => setUploadCaption(e.target.value)}
                        placeholder={`e.g. ${PRESET_MOMENTS[selectedPresetIdx].caption}`}
                        className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1.5 rounded font-semibold text-slate-850 focus:outline-none"
                      />
                    </div>

                    {/* Preset Preview Box */}
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-100">
                      <img
                        src={PRESET_MOMENTS[selectedPresetIdx].url}
                        alt="Moment Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white px-2 py-0.5 rounded text-[8px] font-mono">PREVIEW</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      🚀 Share to Estadio Azteca Feed
                    </button>
                  </form>

                  {photoSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-center text-[10px] font-bold mt-2 animate-bounce">
                      ✓ Uploaded! Your photo is now listed in the stadium feed.
                    </div>
                  )}
                </div>

                {/* Photo Feed List */}
                <div className="space-y-3 mt-6">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1 border-b border-slate-200 pb-1">
                    <Star className="w-4 h-4 text-amber-500 animate-pulse" /> Live Gameday Photo Stream:
                  </h5>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {fanCamPhotos.map((photo) => (
                      <div key={photo.id} className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-xs relative">

                        {/* Jumbotron Featured Tag overlay */}
                        {photo.jumbotronFeatured && (
                          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white border border-amber-600 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full z-10 shadow-md animate-pulse flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-white" /> JUMBOTRON FEATURED
                          </div>
                        )}

                        <div className="aspect-video relative">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-800">{photo.username}</span>
                            <button
                              onClick={() => onLikePhoto(photo.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <Heart className="w-3 h-3 text-rose-500 shrink-0 fill-rose-500" /> {photo.likes} Likes
                            </button>
                          </div>

                          <p className="text-xs text-slate-600 font-semibold leading-relaxed">&ldquo;{photo.caption}&rdquo;</p>
                          <span className="text-[8px] text-slate-400 font-mono font-bold block">{new Date(photo.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. SMART PARKING */}
            {phoneTab === 'parking' && (
              <div className="p-4 space-y-4 flex-grow flex flex-col justify-between">
                <div>
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4 text-center">
                    <span className="text-[10px] font-black text-blue-950 uppercase tracking-widest block mb-0.5">🚗 Smart Parking & Car Finder</span>
                    <p className="text-[9px] text-blue-700 font-semibold leading-relaxed">
                      Drop a digital pin when you park, and find your vehicle instantly with post-match step-free routing!
                    </p>
                  </div>

                  {/* Drop Parking Pin Form */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3.5 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-1">Set Parking Location Pin</span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Select Lot</label>
                        <select
                          value={parkedLot}
                          onChange={(e) => setParkedLot(e.target.value)}
                          className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1.5 rounded font-semibold text-slate-850 focus:outline-none"
                        >
                          <option value="lot-7">Lot 7 (Rideshare / Taxi Plaza)</option>
                          <option value="lot-4">Lot 4 (North Bus Express Terminal)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">Space / Row ID</label>
                        <input
                          type="text"
                          required
                          value={parkedSpace}
                          onChange={(e) => setParkedSpace(e.target.value)}
                          placeholder="e.g. Row G, #41"
                          className="w-full bg-slate-50 text-[10px] border border-slate-200 p-1.5 rounded font-semibold text-slate-850 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!parkedSpace) return;
                        setCarSaved(true);
                        setIsNavigatingBack(false);
                      }}
                      className="w-full bg-blue-900 hover:bg-blue-800 text-white font-extrabold py-1.5 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      📍 Save Parking Location Pin
                    </button>
                  </div>

                  {/* Saved Spot Badge */}
                  {carSaved && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl mt-4 space-y-2">
                      <div className="flex gap-2 items-center text-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-xs font-black uppercase font-display block">Car Pin Saved Securely</span>
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            Lot: <span className="font-bold">{parkedLot === 'lot-7' ? 'Lot 7 (West)' : 'Lot 4 (North)'}</span> • Row/Space: <span className="font-bold">{parkedSpace}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsNavigatingBack(!isNavigatingBack)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 rounded text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {isNavigatingBack ? '❌ Close Navigation Walk' : '🧭 Navigate Me Back to Car'}
                      </button>

                      {/* AR Wayfinder launch inside Parking */}
                      <button
                        onClick={() => {
                          setArDestination('car');
                          setShowARCamera(true);
                        }}
                        className="w-full mt-1.5 font-black uppercase text-[9px] py-1 rounded bg-blue-900 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        📷 Open Live AR Wayfinding HUD
                      </button>
                    </div>
                  )}

                  {/* Wayfinding blue-line guidance */}
                  {isNavigatingBack && (
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl mt-4 text-white space-y-2 animate-in slide-in-from-bottom duration-200">
                      <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest block">🧭 Blue-Line Wayfinding Route:</span>
                      <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                        • Exit through <span className="text-white font-bold">Gate D</span>.<br />
                        • Turn right along the level accessibility ramp concourse corridor.<br />
                        • Cross transit shuttle lane using the marked step-free crossing.<br />
                        • <span className="text-blue-400 font-bold">Your car is 120m straight ahead</span> in Lot {parkedLot === 'lot-7' ? '7' : '4'}.
                      </p>
                      <div className="h-1 bg-blue-950 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-pulse" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Lots Availability Tracker */}
                <div className="bg-slate-100 border border-slate-250 rounded-xl p-3.5 space-y-2.5 mt-6">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">📊 Live Azteca Parking Lots occupancy</span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {parkingSpots.map((spot) => (
                      <div key={spot.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">{spot.name.split(' (')[0]}</span>
                        <p className="text-xs font-black text-slate-800 font-mono mt-0.5">
                          {spot.availableSpots} <span className="text-[10px] text-slate-400 font-sans font-normal">/ {spot.totalSpots}</span>
                        </p>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full ${spot.availableSpots > 200 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}
                            style={{ width: `${(spot.availableSpots / spot.totalSpots) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. INCLUSIVITY & ACCESS */}
            {phoneTab === 'access' && (
              <div className="p-4 space-y-4 flex-grow flex flex-col justify-between">
                <div>
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl mb-4 text-center">
                    <span className="text-[10px] font-black text-emerald-950 uppercase tracking-widest block mb-0.5">♿ Azteca Universal Access Panel</span>
                    <p className="text-[9px] text-emerald-700 font-semibold leading-relaxed">
                      Custom tools designed for fans with visual, hearing, or mobility impairments to navigate Azteca beautifully.
                    </p>
                  </div>

                  {/* 1. FM AUDIO DESCRIPTIVE COMMENTARY */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3.5 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Live FM Audio Commentary (ADC)
                      </span>
                      <span className="text-[8px] bg-blue-50 text-blue-700 font-black font-mono px-1.5 rounded">FM 88.3</span>
                    </div>

                    <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                      Visually impaired fans can stream our live, high-detail audio play-by-play commentary narrated in real-time.
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsStreamingADC(!isStreamingADC)}
                        className={`font-black uppercase tracking-wider text-[9px] px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          isStreamingADC
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-blue-900 text-white hover:bg-blue-800'
                        }`}
                      >
                        {isStreamingADC ? (
                          <>
                            <Pause className="w-3 h-3 text-white fill-white" /> Stop Commentary
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 text-white fill-white animate-ping" /> Stream Live ADC
                          </>
                        )}
                      </button>

                      {/* Animated Audio Equalizer Bars */}
                      {isStreamingADC ? (
                        <div className="flex items-end gap-0.5 h-8 px-2 flex-grow justify-around border-b border-slate-100">
                          {audioBars.map((bar, i) => (
                            <div
                              key={i}
                              className="w-1 bg-emerald-500 rounded-t transition-all duration-150"
                              style={{ height: `${bar}%` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-mono italic">Radio receiver offline...</span>
                      )}
                    </div>
                  </div>

                  {/* 2. STEP-FREE NAVIGATION TOGGLE */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 mt-4 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block flex items-center gap-1 border-b border-slate-100 pb-1.5">
                      ♿ Step-Free Route Planner
                    </span>
                    <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                      Re-draws all 2D wayfinding and navigation corridors on the main stadium map to bypass stairwells, targeting elevators and low-sensory lanes.
                    </p>

                    <button
                      onClick={() => onSetStepFreeRouting(!stepFreeRouting)}
                      className={`w-full font-black uppercase text-[9px] py-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        stepFreeRouting
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-inner'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                      }`}
                    >
                      {stepFreeRouting ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" /> Step-Free Routing Active
                        </>
                      ) : (
                        <>
                          ♿ Enable Step-Free Map Rerouting
                        </>
                      )}
                    </button>

                    {/* AR Wayfinder launch inside Access */}
                    <button
                      onClick={() => {
                        setArDestination('seat');
                        setShowARCamera(true);
                      }}
                      className="w-full mt-2 font-black uppercase text-[9px] py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      🧭 Launch AR Camera Wayfinder
                    </button>
                  </div>

                  {/* 3. HAPTICS VIBRATION TESTING */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 mt-4 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                      📳 Haptic Emergency Alarms
                    </span>
                    <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                      Turn on tactile emergency notifications. Your phone will physically vibrate in patterns corresponding to specific arena warning dispatches.
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-600 font-extrabold uppercase">Tactile Haptics Engine:</span>
                      <button
                        onClick={() => {
                          setHapticsEnabled(!hapticsEnabled);
                          if (!hapticsEnabled) {
                            setTimeout(() => {
                              setIsShaking(true);
                              setTimeout(() => setIsShaking(false), 500);
                            }, 300);
                          }
                        }}
                        className={`text-[9px] font-black px-3 py-1 rounded border uppercase transition-all cursor-pointer ${
                          hapticsEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {hapticsEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>

                    {hapticsEnabled && (
                      <button
                        onClick={handleHapticTest}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-1.5 rounded-lg text-[9px] uppercase tracking-wider cursor-pointer transition-colors mt-2"
                      >
                        📳 Pulse Test Haptic Buzz Pattern
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Live Announcement Intercom Translator (5 Cols) */}
      <div className="lg:col-span-5 space-y-6">

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Multilingual Announcement Intercom
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate overhead public broadcasts, instantly translated to any fan's native tongue.
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-inner">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-700 font-bold">Your Native Language:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-white text-slate-800 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="Spanish">Español (Spanish)</option>
              <option value="French">Français (French)</option>
              <option value="Arabic">العربية (Arabic)</option>
              <option value="German">Deutsch (German)</option>
              <option value="Japanese">日本語 (Japanese)</option>
              <option value="Portuguese">Português (Portuguese)</option>
              <option value="Korean">한국어 (Korean)</option>
              <option value="Italian">Italiano (Italian)</option>
              <option value="Dutch">Nederlands (Dutch)</option>
            </select>
          </div>

          {/* Announcements Feed */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-[10px] text-blue-700 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" /> Overhead PA Broadcast
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono font-bold">
                    {new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-semibold italic">
                  &ldquo;{ann.text}&rdquo;
                </p>

                {/* Translation Actions */}
                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                  {translations[ann.id] ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                      <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">
                        Translated to {targetLang}:
                      </span>
                      <p className="text-xs text-emerald-800 leading-relaxed font-semibold italic">
                        &ldquo;{translations[ann.id]}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTranslateAnnouncement(ann.id, ann.text)}
                      disabled={isTranslatingId !== null}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 self-start transition-all shadow-sm cursor-pointer"
                    >
                      {isTranslatingId === ann.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-700" />
                          Translating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                          Translate to {targetLang}
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
