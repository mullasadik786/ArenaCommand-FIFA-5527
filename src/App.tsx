import React, { useState, useEffect } from 'react';
import { StadiumState } from './types';
import StadiumMap from './components/StadiumMap';
import CommandCenter from './components/CommandCenter';
import FanCompanion from './components/FanCompanion';
import AnalyticsPanel from './components/AnalyticsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { INDIAN_LANGUAGES, TRANSLATIONS } from './languages';
import {
  ShieldAlert, Sliders, Smartphone, Clock, Volume2,
  Tv, AlertCircle, RefreshCw, Layers, Sun, Moon, Globe
} from 'lucide-react';

export default function App() {
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Language state: defaults to 'en' (English), can be any of 22 Indian languages
  const [language, setLanguage] = useState<string>('en');

  // Active translation dictionary
  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  // Stadium state
  const [stadiumState, setStadiumState] = useState<StadiumState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state: 'control' | 'fan' | 'analytics'
  const [activeTab, setActiveTab] = useState<'control' | 'fan' | 'analytics'>('control');

  // Selected sector ID
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>('gate-b');

  // Step-Free Accessibility Routing State
  const [stepFreeRouting, setStepFreeRouting] = useState(false);

  // Decision directive states
  const [directiveResult, setDirectiveResult] = useState<string | null>(null);
  const [isGeneratingDirective, setIsGeneratingDirective] = useState(false);

  // Loading indicator for incident form
  const [isLoggingIncident, setIsLoggingIncident] = useState(false);

  // Real-time local clock
  const [currentTime, setCurrentTime] = useState<string>('');

  // Fetch initial stadium state
  const fetchStadiumState = async () => {
    try {
      const response = await fetch('/api/stadium/state');
      if (!response.ok) throw new Error('Failed to fetch stadium state');
      const data = await response.json();
      setStadiumState(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching stadium state:', err);
      setError('Connection offline. Make sure the server is booted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStadiumState();

    // Update digital clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handler: Simulation match phase change
  const handlePhaseChange = async (phase: StadiumState['gamePhase']) => {
    try {
      const response = await fetch('/api/stadium/phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase })
      });
      if (!response.ok) throw new Error('Failed to change simulation phase');
      const data = await response.json();
      setStadiumState(data);
    } catch (err: any) {
      console.error('Error changing match phase:', err);
      setError('Failed to change simulation phase. Fallback state preserved.');
    }
  };

  // Handler: Log new incident
  const handleLogIncident = async (
    sectorId: string,
    type: string,
    description: string,
    photoUrl?: string,
    lightweightMetadata?: string,
    photoAnalysis?: string,
    photoBase64?: string
  ) => {
    setIsLoggingIncident(true);
    try {
      const response = await fetch('/api/stadium/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorId, type, description, photoUrl, lightweightMetadata, photoAnalysis, photoBase64 })
      });
      if (!response.ok) throw new Error('Failed to log incident');
      const data = await response.json();
      setStadiumState(prevState => ({
        ...prevState!,
        incidents: data.incidents,
        announcements: data.announcements,
        blockchainReceipts: data.blockchainReceipts || prevState?.blockchainReceipts,
        sectors: data.sectors || prevState?.sectors
      }));
    } catch (err: any) {
      console.error('Error logging incident:', err);
      setError('Failed to log new incident. Fallback: Local state preserved.');
    } finally {
      setIsLoggingIncident(false);
    }
  };

  // Handler: Resolve existing incident
  const handleResolveIncident = async (id: string) => {
    try {
      const response = await fetch('/api/stadium/resolve-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!response.ok) throw new Error('Failed to resolve incident');
      const data = await response.json();
      setStadiumState(prevState => ({
        ...prevState!,
        incidents: data.incidents,
        announcements: data.announcements,
        blockchainReceipts: data.blockchainReceipts || prevState?.blockchainReceipts
      }));
    } catch (err: any) {
      console.error('Error resolving incident:', err);
      setError('Failed to resolve incident. Fallback: Local state preserved.');
    }
  };

  // Handler: Run directive sandbox scenario via Gemini
  const handleRunDirective = async (directive: string) => {
    setIsGeneratingDirective(true);
    setDirectiveResult(null);
    try {
      const response = await fetch('/api/stadium/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive })
      });
      if (!response.ok) throw new Error('Failed to analyze directive');
      const data = await response.json();
      setDirectiveResult(data.result);
    } catch (err) {
      console.error(err);
      setDirectiveResult('Failed to contact Gemini API. Please make sure GEMINI_API_KEY is configured in Secrets.');
    } finally {
      setIsGeneratingDirective(false);
    }
  };

  // Handler: Ask Fan companion question
  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      const response = await fetch('/api/fan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      if (!response.ok) throw new Error('Failed to get answer');
      const data = await response.json();
      return data.answer;
    } catch (err: any) {
      console.error('Error asking companion question:', err);
      return "I'm having a connection issue checking with the Azteca Operations Hub. Please try asking again.";
    }
  };

  // Handler: Trigger Staff Dispatch
  const handleTriggerDispatch = async (sectorId: string, type: string) => {
    try {
      const response = await fetch('/api/stadium/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectorId, type })
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(prevState => ({
          ...prevState!,
          activeDispatches: data.activeDispatches
        }));
      }
    } catch (err: any) {
      console.error('Error triggering staff dispatch:', err);
      setError('Failed to dispatch staff. Fallback: Local state preserved.');
    }
  };

  // Handler: Resolve Staff Dispatch
  const handleResolveDispatch = async (id: string) => {
    try {
      const response = await fetch('/api/stadium/dispatch/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(prevState => ({
          ...prevState!,
          activeDispatches: data.activeDispatches
        }));
      }
    } catch (err: any) {
      console.error('Error resolving staff dispatch:', err);
      setError('Failed to resolve staff dispatch. Fallback: Local state preserved.');
    }
  };

  // Handler: Trigger Chaos Simulation (Automated Triple Disaster & LoRA Failover)
  const handleTriggerChaos = async () => {
    try {
      const response = await fetch('/api/stadium/chaos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-chaos-token': 'fifa-arena-opsai-chaos-token-2026'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(data);
      }
    } catch (err: any) {
      console.error('Error triggering automated chaos mode:', err);
      setError('Failed to trigger Automated Chaos Simulation. Fallback state preserved.');
    }
  };

  // Handler: Place Fan Concession Order
  const handlePlaceOrder = async (items: Array<{ name: string; quantity: number }>, seatInfo: { sectorId: string; rowSeat: string }, deliveryType: 'seat' | 'pickup', totalPrice: number) => {
    try {
      const response = await fetch('/api/stadium/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, seatInfo, deliveryType, totalPrice })
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(prevState => ({
          ...prevState!,
          concessionOrders: data.concessionOrders
        }));
      }
    } catch (err: any) {
      console.error('Error placing concession order:', err);
      setError('Concession order submission failed. Fallback: Please try placing the order again.');
    }
  };

  // Handler: Upload Fan Cam Photo
  const handleUploadPhoto = async (username: string, caption: string, url?: string) => {
    try {
      const response = await fetch('/api/stadium/fancam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, caption, url })
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(prevState => ({
          ...prevState!,
          fanCamPhotos: data.fanCamPhotos
        }));
      }
    } catch (err: any) {
      console.error('Error uploading fan photo:', err);
      setError('Fan Photo upload failed. Fallback: Please try uploading again.');
    }
  };

  // Handler: Like Fan Cam Photo
  const handleLikePhoto = async (id: string) => {
    try {
      const response = await fetch('/api/stadium/fancam/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(prevState => ({
          ...prevState!,
          fanCamPhotos: data.fanCamPhotos
        }));
      }
    } catch (err: any) {
      console.error('Error liking fan photo:', err);
      setError('Failed to like fan photo. Fallback state preserved.');
    }
  };

  // Handler: Feature Fan Cam Photo on Jumbotron
  const handleFeaturePhoto = async (id: string) => {
    try {
      const response = await fetch('/api/stadium/fancam/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        const data = await response.json();
        setStadiumState(prevState => ({
          ...prevState!,
          fanCamPhotos: data.fanCamPhotos,
          announcements: data.announcements
        }));
      }
    } catch (err: any) {
      console.error('Error featuring fan photo:', err);
      setError('Failed to feature photo on Jumbotron. Fallback state preserved.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center text-slate-800">
        <RefreshCw className="w-10 h-10 text-blue-900 animate-spin mb-4" />
        <h2 className="text-xl font-bold font-display tracking-wide animate-pulse text-blue-900">Initializing Estadio Azteca Command...</h2>
        <p className="text-xs text-slate-500 mt-1">Booting full-stack stadium operations model for FIFA World Cup...</p>
      </div>
    );
  }

  if (error || !stadiumState) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center text-slate-800 p-6">
        <AlertCircle className="w-14 h-14 text-red-600 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold font-display text-red-600">Hub Server Disconnected</h2>
        <p className="text-sm text-slate-500 mt-2 text-center max-w-md">
          {error || 'The backend container failed to bind properly. Restart the development server to retry.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-white border border-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Hub
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 selection:bg-blue-200 selection:text-blue-900 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>

      {/* HEADER SECTION */}
      <header className={`border-b transition-colors duration-300 py-4 px-6 relative z-10 shadow-lg ${
        theme === 'dark' ? 'bg-slate-900 text-white border-slate-950 shadow-slate-950/20' : 'bg-blue-900 text-white border-blue-950'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-4">

          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded flex items-center justify-center shadow-md transition-colors duration-300 ${
              theme === 'dark' ? 'bg-slate-800 text-blue-400' : 'bg-white text-blue-900'
            }`}>
              <span className={`font-black text-xl font-display ${theme === 'dark' ? 'text-blue-400' : 'text-blue-900'}`}>26</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-display uppercase">{t.commandTitle}</h1>
                <span className="bg-blue-850 text-blue-200 border border-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Operational Intel
                </span>
              </div>
              <p className="text-xs text-blue-200">FIFA World Cup 2026 • World-Class Stadium & Crowd Intelligence</p>
            </div>
          </div>

          {/* Stadium Status Banner & Theme/Language Controls */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-mono">
            {/* Live game metadata banner */}
            <div className="bg-blue-950/80 border border-blue-800 rounded-xl px-3.5 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse block"></span>
              <span className="text-blue-200 uppercase font-bold text-[10px] tracking-wider">{t.liveBroadcast}:</span>
              <span className="text-white font-sans font-medium">{stadiumState.matchDetails.teams} ({stadiumState.matchDetails.score})</span>
              <span className="text-blue-400 font-bold">•</span>
              <span className="text-amber-400 font-bold">{stadiumState.matchDetails.timeElapsed}</span>
            </div>

            {/* Time / Clock */}
            <div className="bg-blue-950/80 border border-blue-800 rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">UTC:</span>
              <span className="text-white font-mono font-bold">{currentTime || '00:00:00'}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="bg-blue-950/80 hover:bg-blue-950/90 border border-blue-800 hover:border-blue-700 rounded-xl p-2 flex items-center justify-center text-white transition-all cursor-pointer hover:scale-[1.05]"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <Sun className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              )}
            </button>

            {/* Indian 22 Languages Dropdown */}
            <div className="relative flex items-center bg-blue-950/80 border border-blue-800 rounded-xl px-2.5 py-1.5 gap-1.5 text-white hover:border-blue-700 transition-all">
              <Globe className="w-4 h-4 text-blue-300 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-white border-none outline-none text-xs font-bold font-mono cursor-pointer pr-1"
              >
                {INDIAN_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-white font-sans font-bold">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* CORE WORKSPACE / CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* TAB NAVIGATION ROW */}
        <div className={`flex flex-col sm:flex-row justify-between items-center border-b pb-4 gap-4 transition-colors duration-300 ${
          theme === 'dark' ? 'border-slate-850' : 'border-slate-200'
        }`}>
          <div
            role="tablist"
            aria-label="Stadium Workspace Options"
            className={`flex p-1 rounded-xl w-full sm:w-auto transition-colors duration-300 ${
              theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100 border border-slate-200'
            }`}
          >

            <button
              role="tab"
              aria-selected={activeTab === 'control'}
              aria-label="Arena Control Center view"
              onClick={() => setActiveTab('control')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'control'
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-blue-400 border border-slate-700 shadow-md font-bold'
                    : 'bg-white text-blue-900 shadow-sm border border-slate-200 font-bold'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-blue-700" />
              {t.arenaControl}
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'fan'}
              aria-label="Fan Companion app simulation"
              onClick={() => setActiveTab('fan')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fan'
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-blue-400 border border-slate-700 shadow-md font-bold'
                    : 'bg-white text-blue-900 shadow-sm border border-slate-200 font-bold'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-700" />
              {t.fanCompanion}
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'analytics'}
              aria-label="Overview and operations analytics charts"
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-blue-400 border border-slate-700 shadow-md font-bold'
                    : 'bg-white text-blue-900 shadow-sm border border-slate-200 font-bold'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tv className="w-4 h-4 text-blue-700" />
              {t.analytics}
            </button>

          </div>

          <div className={`flex items-center gap-2 text-xs font-mono p-2 rounded-lg border shadow-sm transition-colors duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <span className="text-slate-400 uppercase font-bold text-[10px]">{t.gamedayMode}:</span>
            <span className={`font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
              {stadiumState.gamePhase.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* INTERACTIVE ROW: Grid layout showing Map in Left and CommandCenter/Details in Right (only for Control Center & Analytics) */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

            {/* Map Column (4 Cols) */}
            <div className="xl:col-span-4 space-y-6">
              <ErrorBoundary>
                <StadiumMap
                  sectors={stadiumState.sectors}
                  selectedSectorId={selectedSectorId}
                  onSelectSector={setSelectedSectorId}
                  stepFreeRouting={stepFreeRouting}
                  theme={theme}
                  language={language}
                />
              </ErrorBoundary>

              {/* Short notification feed box */}
              <div className={`border rounded-2xl p-5 shadow-sm space-y-3 transition-colors duration-300 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    <Volume2 className="w-4 h-4 text-blue-600" /> {t.recentIntercom}
                  </span>
                  <span className={`text-[9px] font-mono font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-slate-400'}`}>LIVE FEED</span>
                </div>
                <div
                  className="space-y-2 max-h-[160px] overflow-y-auto"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions text"
                  aria-atomic="false"
                  aria-label="Automated emergency broadcasts and live intercom feed"
                >
                  {stadiumState.announcements.slice(0, 3).map((ann, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border text-[11px] leading-relaxed shadow-sm transition-colors duration-300 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      {ann.text}
                      <span className="block text-[9px] text-slate-400 mt-1 font-mono font-semibold">
                        {new Date(ann.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CommandCenter Panels (8 Cols) */}
            <div className="xl:col-span-8">
              <ErrorBoundary>
                <CommandCenter
                  stadiumState={stadiumState}
                  onUpdateStadiumState={setStadiumState}
                  sectors={stadiumState.sectors}
                  incidents={stadiumState.incidents}
                  blockchainReceipts={stadiumState.blockchainReceipts}
                  selectedSectorId={selectedSectorId}
                  onSelectSector={setSelectedSectorId}
                  onLogIncident={handleLogIncident}
                  onResolveIncident={handleResolveIncident}
                  onRunDirective={handleRunDirective}
                  directiveResult={directiveResult}
                  isGeneratingDirective={isGeneratingDirective}
                  isLoggingIncident={isLoggingIncident}
                  activeDispatches={stadiumState.activeDispatches}
                  onTriggerDispatch={handleTriggerDispatch}
                  onResolveDispatch={handleResolveDispatch}
                  gamePhase={stadiumState.gamePhase}
                  onPhaseChange={handlePhaseChange}
                  onTriggerChaos={handleTriggerChaos}
                  theme={theme}
                  language={language}
                />
              </ErrorBoundary>
            </div>

          </div>
        )}

        {/* Tab content: Fan Companion */}
        {activeTab === 'fan' && (
          <div className={`p-4 sm:p-6 border rounded-2xl shadow-sm transition-colors duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <ErrorBoundary>
              <FanCompanion
                announcements={stadiumState.announcements}
                onAskQuestion={handleAskQuestion}
                concessionOrders={stadiumState.concessionOrders}
                onPlaceOrder={handlePlaceOrder}
                fanCamPhotos={stadiumState.fanCamPhotos}
                onUploadPhoto={handleUploadPhoto}
                onLikePhoto={handleLikePhoto}
                parkingSpots={stadiumState.parkingSpots}
                stepFreeRouting={stepFreeRouting}
                onSetStepFreeRouting={setStepFreeRouting}
                sectors={stadiumState.sectors}
                gamePhase={stadiumState.gamePhase}
                theme={theme}
                language={language}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Tab content: Analytics Panel & Timeline Sandbox */}
        {activeTab === 'analytics' && (
          <div className={`p-4 sm:p-6 border rounded-2xl shadow-sm transition-colors duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
          }`}>
            <ErrorBoundary>
              <AnalyticsPanel
                stadiumState={stadiumState}
                onPhaseChange={handlePhaseChange}
                onTriggerChaos={handleTriggerChaos}
                theme={theme}
                language={language}
              />
            </ErrorBoundary>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className={`mt-auto border-t py-4 px-6 text-[10px] font-bold uppercase tracking-widest z-10 shadow-sm transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-950 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{t.activeFans}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{t.staffMesh}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026 FIFA World Cup™ • Estadio Azteca</span>
            <span className={theme === 'dark' ? 'text-slate-800' : 'text-slate-200'}>|</span>
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}>Solar Battery: 94%</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
