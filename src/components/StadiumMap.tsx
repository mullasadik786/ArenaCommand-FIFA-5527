import React from 'react';
import { StadiumSector } from '../types';
import { Activity, ShieldAlert, Users, Clock, HelpCircle } from 'lucide-react';
import { TRANSLATIONS } from '../languages';

interface SectorPathProps {
  id: string;
  d: string;
  currentDensity: number;
  isSelected: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}

const SectorPath = React.memo(function SectorPath({
  id,
  d,
  currentDensity,
  isSelected,
  onClick,
  ariaLabel,
  className
}: SectorPathProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  // Get color for density
  const getDensityColor = (density: number) => {
    if (density < 30) return { fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e' }; // Green
    if (density < 60) return { fill: 'rgba(234, 179, 8, 0.15)', stroke: '#eab308' };  // Yellow
    if (density < 85) return { fill: 'rgba(249, 115, 22, 0.15)', stroke: '#f97316' };  // Orange
    return { fill: 'rgba(239, 68, 68, 0.3)', stroke: '#ef4444' }; // Red
  };

  const colors = getDensityColor(currentDensity);
  const isHighlighted = isSelected || isFocused;

  const style = {
    fill: colors.fill,
    stroke: isHighlighted ? '#2563eb' : colors.stroke,
    strokeWidth: isHighlighted ? 4 : 2,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    strokeDasharray: isFocused && !isSelected ? '4,2' : undefined,
  };

  return (
    <path
      d={d}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const focusables = Array.from(document.querySelectorAll('svg path[role="button"]'));
          const index = focusables.indexOf(e.currentTarget);
          if (index !== -1) {
            const nextIndex = (index + 1) % focusables.length;
            (focusables[nextIndex] as HTMLElement)?.focus();
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const focusables = Array.from(document.querySelectorAll('svg path[role="button"]'));
          const index = focusables.indexOf(e.currentTarget);
          if (index !== -1) {
            const prevIndex = (index - 1 + focusables.length) % focusables.length;
            (focusables[prevIndex] as HTMLElement)?.focus();
          }
        }
      }}
      className={className}
    />
  );
});

interface StadiumMapProps {
  sectors: StadiumSector[];
  selectedSectorId: string | null;
  onSelectSector: (sectorId: string) => void;
  stepFreeRouting?: boolean;
  theme?: 'light' | 'dark';
  language?: string;
}

const StadiumMap = React.memo(function StadiumMap({
  sectors,
  selectedSectorId,
  onSelectSector,
  stepFreeRouting = false,
  theme = 'dark',
  language = 'en'
}: StadiumMapProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  // Localized texts inside Stadium Map
  const mapTexts: Record<string, Record<string, string>> = {
    en: {
      title: "Live Arena Heatmap",
      subtitle: "Estadio Azteca — High-fidelity SVG Flow Grid",
      normal: "Normal (<30%)",
      mod: "Mod (30-60%)",
      congest: "Congest (60-85%)",
      crit: "Crit (>85%)",
      pitch: "PITCH",
      stepActive: "Step-free routing active",
      help: "Interactive Grid: Click any gate or stand sector to inspect sensor logs and live telemetry."
    },
    hi: {
      title: "लाइव एरिना हीटमैप",
      subtitle: "एस्टाडियो एज़्टेका — हाई-फिडेलिटी एसवीजी फ्लो ग्रिड",
      normal: "सामान्य (<30%)",
      mod: "मध्यम (30-60%)",
      congest: "भीड़ (60-85%)",
      crit: "गंभीर (>85%)",
      pitch: "मैदान",
      stepActive: "सुगम मार्ग सक्रिय",
      help: "इंटरैक्टिव ग्रिड: सेंसर लॉग और लाइव टेलीमेट्री देखने के लिए किसी भी गेट या स्टैंड पर क्लिक करें।"
    },
    bn: {
      title: "লাইভ অ্যারেনা হিটম্যাপ",
      subtitle: "এস্তাদিও অ্যাজটেকা — হাই-ফিডেলিটি এসভিজি ফ্লো গ্রিড",
      normal: "স্বাভাবিক (<৩০%)",
      mod: "মাঝারি (৩০-৬০%)",
      congest: "ভিড় (৬০-৮৫%)",
      crit: "গুরুতর (>৮৫%)",
      pitch: "মাঠ",
      stepActive: "ধাপ-মুক্ত পথ সক্রিয়",
      help: "ইন্টারেক্টিভ গ্রিড: সেন্সর লগ এবং লাইভ টেলিমেট্রি পরীক্ষা করতে যেকোনো গেট বা স্ট্যান্ডে ক্লিক করুন।"
    },
    te: {
      title: "లైవ్ అరేనా హీట్‌మ్యాప్",
      subtitle: "ఎస్టాడియో అజ్టెకా — హై-ఫిడిలిటీ SVG ఫ్లో గ్రిడ్",
      normal: "సాధారణం (<30%)",
      mod: "మధ్యస్థం (30-60%)",
      congest: "రద్దీ (60-85%)",
      crit: "తీవ్రం (>85%)",
      pitch: "పిచ్",
      stepActive: "మెట్లు లేని మార్గం క్రియాశీలం",
      help: "ఇంటరాక్టివ్ గ్రిడ్: సెన్సార్ లాగ్‌లు మరియు ప్రత్యక్ష టెలిమెట్రీని తనిఖీ చేయడానికి ఏదైనా గేట్ లేదా స్టాండ్‌పై క్లిక్ చేయండి."
    },
    mr: {
      title: "थेट अरीना हीटमॅप",
      subtitle: "इस्टॅडिओ अझ्टेका — हाय-फिडेलिटी एसव्हीजी फ्लो ग्रिड",
      normal: "सामान्य (<३०%)",
      mod: "मध्यम (३०-६०%)",
      congest: "गजबजलेले (६०-८५%)",
      crit: "गंभीर (>८५%)",
      pitch: "मैदान",
      stepActive: "पायऱ्या विरहीत मार्ग सक्रिय",
      help: "इंटरएक्टिव्ह ग्रिड: सेन्सर लॉग आणि थेट टेलीमेट्री तपासण्यासाठी कोणत्याही गेट किंवा स्टँडवर क्लिक करा."
    },
    ta: {
      title: "நேரடி அரங்க வெப்ப வரைபடம்",
      subtitle: "எஸ்டாடியோ அஸ்டெகா — உயர்-நிலை SVG ஓட்ட வரைபடம்",
      normal: "சாதாரண (<30%)",
      mod: "மிதமான (30-60%)",
      congest: "நெரிசல் (60-85%)",
      crit: "தீவிரம் (>85%)",
      pitch: "மைதானம்",
      stepActive: "படி-இல்லாத வழித்தடம் இயக்கத்தில் உள்ளது",
      help: "ஊடாடும் வரைபடம்: சென்சார் பதிவுகள் மற்றும் நேரடி அளவீடுகளை சரிபார்க்க எந்தவொரு நுழைவாயில் அல்லது இருக்கை பகுதியை கிளிக் செய்யவும்."
    },
    ur: {
      title: "لائیو ارینا ہیٹ میپ",
      subtitle: "ایسٹاڈیو ازٹیکا — ہائی فیڈلٹی SVG فلو گرڈ",
      normal: "عام (<30%)",
      mod: "درمیانہ (30-60%)",
      congest: "رش (60-85%)",
      crit: "شدید (>85%)",
      pitch: "پچ",
      stepActive: "اسٹیپ فری راستہ فعال",
      help: "انٹرایکٹو گرڈ: سینسر لاگز اور لائیو ٹیلی میٹری چیک کرنے کے لئے کسی بھی گیٹ یا اسٹینڈ پر کلک کریں۔"
    }
  };

  const currentMapText = mapTexts[language] || mapTexts['en'];

  // Get color for density
  const getDensityColor = (density: number) => {
    if (density < 30) return { fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e' }; // Green
    if (density < 60) return { fill: 'rgba(234, 179, 8, 0.15)', stroke: '#eab308' };  // Yellow
    if (density < 85) return { fill: 'rgba(249, 115, 22, 0.15)', stroke: '#f97316' };  // Orange
    return { fill: 'rgba(239, 68, 68, 0.3)', stroke: '#ef4444' }; // Red
  };

  const getSectorStyle = (id: string) => {
    const sector = sectors.find(s => s.id === id);
    const colors = sector ? getDensityColor(sector.currentDensity) : { fill: 'rgba(71, 85, 105, 0.1)', stroke: '#475569' };
    const isSelected = selectedSectorId === id;

    return {
      fill: colors.fill,
      stroke: isSelected ? '#3b82f6' : colors.stroke,
      strokeWidth: isSelected ? 4 : 2,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    };
  };

  // Grid line color based on theme
  const gridStroke = theme === 'dark' ? '#334155' : '#cbd5e1';
  const standLabelFill = theme === 'dark' ? '#94a3b8' : '#475569';
  const gateLabelFill = theme === 'dark' ? '#f1f5f9' : '#0f172a';

  // Construct a stable memoization key derived from the densities of each sector
  const sectorsDensityKey = sectors.map(s => `${s.id}-${s.currentDensity}`).join(',');

  // Cache static SVG background elements separately
  const staticMapBackground = React.useMemo(() => {
    return (
      <>
        {/* Defs for grid and shadows */}
        <defs>
          <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
        </defs>

        {/* Grid lines background */}
        <circle cx="200" cy="200" r="195" fill="none" stroke={gridStroke} strokeWidth="1" strokeDasharray="5,5" />
        <circle cx="200" cy="200" r="140" fill="none" stroke={gridStroke} strokeWidth="1" strokeDasharray="5,5" />
        <line x1="200" y1="5" x2="200" y2="395" stroke={gridStroke} strokeWidth="1" strokeDasharray="5,5" />
        <line x1="5" y1="200" x2="395" y2="200" stroke={gridStroke} strokeWidth="1" strokeDasharray="5,5" />

        {/* Central Pitch (Green Field) */}
        <rect x="140" y="120" width="120" height="160" rx="4" fill="url(#fieldGrad)" stroke="#166534" strokeWidth="2" />
        {/* Soccer lines on field */}
        <circle cx="200" cy="200" r="25" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <line x1="140" y1="200" x2="260" y2="200" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <rect x="140" y="120" width="120" height="30" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <rect x="140" y="250" width="120" height="30" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      </>
    );
  }, [gridStroke]);

  // Cache static text labels separately
  const staticMapLabels = React.useMemo(() => {
    return (
      <>
        {/* Labels Overlay */}
        <text x="200" y="50" textAnchor="middle" fill={gateLabelFill} className="font-display font-bold text-[10px]" pointerEvents="none">GATE A</text>
        <text x="350" y="200" textAnchor="middle" fill={gateLabelFill} className="font-display font-bold text-[10px]" pointerEvents="none">GATE B</text>
        <text x="200" y="355" textAnchor="middle" fill={gateLabelFill} className="font-display font-bold text-[10px]" pointerEvents="none">GATE C</text>
        <text x="50" y="200" textAnchor="middle" fill={gateLabelFill} className="font-display font-bold text-[10px]" pointerEvents="none">GATE D</text>

        <text x="200" y="107" textAnchor="middle" fill={standLabelFill} className="font-sans font-medium text-[8px]" pointerEvents="none">STAND N</text>
        <text x="288" y="200" textAnchor="middle" fill={standLabelFill} className="font-sans font-medium text-[8px]" pointerEvents="none">STAND E</text>
        <text x="200" y="297" textAnchor="middle" fill={standLabelFill} className="font-sans font-medium text-[8px]" pointerEvents="none">STAND S</text>
        <text x="112" y="200" textAnchor="middle" fill={standLabelFill} className="font-sans font-medium text-[8px]" pointerEvents="none">STAND W</text>
      </>
    );
  }, [gateLabelFill, standLabelFill]);

  // Specialized state optimization layer: Memoize the high-fidelity SVG flow grid
  // to completely decouple heatmap painting from transient signal/telemetry packet updates.
  const svgMapElement = React.useMemo(() => {
    return (
      <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-lg">
        {/* Static Background Layer */}
        {staticMapBackground}

        {/* ===================== STANDS (Inner Ring) ===================== */}
        {/* North Stand */}
        <SectorPath
          id="stand-north"
          d="M 120,100 A 110,110 0 0,1 280,100 L 260,115 A 80,80 0 0,0 140,115 Z"
          currentDensity={sectors.find(s => s.id === 'stand-north')?.currentDensity || 0}
          isSelected={selectedSectorId === 'stand-north'}
          onClick={() => onSelectSector('stand-north')}
          ariaLabel={`${sectors.find(s => s.id === 'stand-north')?.name || 'North Stand'} concourse heatmap. Current occupancy density: ${sectors.find(s => s.id === 'stand-north')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />
        {/* East Stand */}
        <SectorPath
          id="stand-east"
          d="M 300,120 A 110,110 0 0,1 300,280 L 275,255 A 80,80 0 0,0 275,145 Z"
          currentDensity={sectors.find(s => s.id === 'stand-east')?.currentDensity || 0}
          isSelected={selectedSectorId === 'stand-east'}
          onClick={() => onSelectSector('stand-east')}
          ariaLabel={`${sectors.find(s => s.id === 'stand-east')?.name || 'East Stand'} concourse heatmap. Current occupancy density: ${sectors.find(s => s.id === 'stand-east')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />
        {/* South Stand */}
        <SectorPath
          id="stand-south"
          d="M 280,300 A 110,110 0 0,1 120,300 L 140,285 A 80,80 0 0,0 260,285 Z"
          currentDensity={sectors.find(s => s.id === 'stand-south')?.currentDensity || 0}
          isSelected={selectedSectorId === 'stand-south'}
          onClick={() => onSelectSector('stand-south')}
          ariaLabel={`${sectors.find(s => s.id === 'stand-south')?.name || 'South Stand'} concourse heatmap. Current occupancy density: ${sectors.find(s => s.id === 'stand-south')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />
        {/* West Stand */}
        <SectorPath
          id="stand-west"
          d="M 100,280 A 110,110 0 0,1 100,120 L 125,145 A 80,80 0 0,0 125,255 Z"
          currentDensity={sectors.find(s => s.id === 'stand-west')?.currentDensity || 0}
          isSelected={selectedSectorId === 'stand-west'}
          onClick={() => onSelectSector('stand-west')}
          ariaLabel={`${sectors.find(s => s.id === 'stand-west')?.name || 'West Stand'} concourse heatmap. Current occupancy density: ${sectors.find(s => s.id === 'stand-west')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />

        {/* ===================== GATES (Outer Ring) ===================== */}
        {/* Gate A (North Entrance) */}
        <SectorPath
          id="gate-a"
          d="M 110,70 A 150,150 0 0,1 290,70 L 270,95 A 120,120 0 0,0 130,95 Z"
          currentDensity={sectors.find(s => s.id === 'gate-a')?.currentDensity || 0}
          isSelected={selectedSectorId === 'gate-a'}
          onClick={() => onSelectSector('gate-a')}
          ariaLabel={`${sectors.find(s => s.id === 'gate-a')?.name || 'Gate A'} entrance heatmap. Current occupancy density: ${sectors.find(s => s.id === 'gate-a')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />
        {/* Gate B (East Entrance) */}
        <SectorPath
          id="gate-b"
          d="M 330,110 A 150,150 0 0,1 330,290 L 305,265 A 120,120 0 0,0 305,135 Z"
          currentDensity={sectors.find(s => s.id === 'gate-b')?.currentDensity || 0}
          isSelected={selectedSectorId === 'gate-b'}
          onClick={() => onSelectSector('gate-b')}
          ariaLabel={`${sectors.find(s => s.id === 'gate-b')?.name || 'Gate B'} entrance heatmap. Current occupancy density: ${sectors.find(s => s.id === 'gate-b')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />
        {/* Gate C (South Entrance) */}
        <SectorPath
          id="gate-c"
          d="M 290,330 A 150,150 0 0,1 110,330 L 130,305 A 120,120 0 0,0 270,305 Z"
          currentDensity={sectors.find(s => s.id === 'gate-c')?.currentDensity || 0}
          isSelected={selectedSectorId === 'gate-c'}
          onClick={() => onSelectSector('gate-c')}
          ariaLabel={`${sectors.find(s => s.id === 'gate-c')?.name || 'Gate C'} entrance heatmap. Current occupancy density: ${sectors.find(s => s.id === 'gate-c')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />
        {/* Gate D (West Entrance) */}
        <SectorPath
          id="gate-d"
          d="M 70,290 A 150,150 0 0,1 70,110 L 95,135 A 120,120 0 0,0 95,265 Z"
          currentDensity={sectors.find(s => s.id === 'gate-d')?.currentDensity || 0}
          isSelected={selectedSectorId === 'gate-d'}
          onClick={() => onSelectSector('gate-d')}
          ariaLabel={`${sectors.find(s => s.id === 'gate-d')?.name || 'Gate D'} entrance heatmap. Current occupancy density: ${sectors.find(s => s.id === 'gate-d')?.currentDensity || 0}%`}
          className="focus:outline-none focus:stroke-blue-500 focus:stroke-[4px]"
        />

        {/* ===================== STEP-FREE ACCESSIBILITY CORRIDORS ===================== */}
        {stepFreeRouting && (
          <>
            {/* Circular main accessible belt routing around outer concourse */}
            <circle
              cx="200"
              cy="200"
              r="115"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="8,4"
              className="opacity-90 animate-pulse"
            />

            {/* Path from Gate A down to Concourse Stand North */}
            <path
              d="M 200,80 L 200,107"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="5,3"
              className="animate-pulse"
              fill="none"
            />
            {/* Path from Gate C up to Concourse Stand South */}
            <path
              d="M 200,320 L 200,295"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="5,3"
              className="animate-pulse"
              fill="none"
            />
            {/* Path from Gate D to Concourse Stand West */}
            <path
              d="M 80,200 L 112,200"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="5,3"
              className="animate-pulse"
              fill="none"
            />

            {/* Pulsing beacon corridors */}
            <circle cx="200" cy="95" r="4" fill="#3b82f6" className="animate-ping" />
            <circle cx="200" cy="305" r="4" fill="#3b82f6" className="animate-ping" />
            <circle cx="95" cy="200" r="4" fill="#3b82f6" className="animate-ping" />
          </>
        )}

        {/* Static Labels Layer */}
        {staticMapLabels}
      </svg>
    );
  }, [sectorsDensityKey, selectedSectorId, stepFreeRouting, onSelectSector, staticMapBackground, staticMapLabels, sectors]);

  return (
    <div className={`border rounded-2xl p-6 relative flex flex-col items-center shadow-sm transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-3 mb-4">
        <div>
          <h3 className={`text-lg font-bold font-display flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
            <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            {currentMapText.title}
          </h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{currentMapText.subtitle}</p>
        </div>

        {/* Map Legend */}
        <div className={`flex flex-wrap items-center gap-3 text-[10px] p-2 rounded-xl border font-medium transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>{currentMapText.normal}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block"></span>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>{currentMapText.mod}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block"></span>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>{currentMapText.congest}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 block animate-pulse"></span>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>{currentMapText.crit}</span>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center p-4">
        {svgMapElement}

        {/* Center Field Badge */}
        <div className={`absolute border text-center px-3 py-1 rounded-full shadow-md transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-blue-400' : 'bg-white border-slate-200 text-blue-700'
        }`}>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest">{currentMapText.pitch}</span>
        </div>

        {stepFreeRouting && (
          <div className={`absolute top-4 left-4 border px-3 py-1.5 rounded-xl shadow-sm text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-300 ${
            theme === 'dark' ? 'bg-blue-950/40 border-blue-900/60 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            ♿ {currentMapText.stepActive}
          </div>
        )}
      </div>

      {/* Mini details helper */}
      <div className="w-full mt-4 text-center">
        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          💡 <span className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Interactive Grid:</span> {currentMapText.help}
        </p>
      </div>
    </div>
  );
});

export default StadiumMap;
