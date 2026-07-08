import React, { useState, useEffect } from 'react';
import { StadiumSector, Incident, StadiumState, StaffDispatch, BlockchainReceipt } from '../types';
import { LoraPacketSniffer } from './LoraPacketSniffer';
import {
  AlertTriangle, Users, Clock, Sparkles, Plus, Check, MapPin,
  Volume2, MessageSquare, Send, RefreshCw, Accessibility, ShieldAlert,
  Sliders, ArrowUpRight, Camera, Activity, Gauge, Zap, Tv, Navigation,
  Image, ShieldCheck, Link
} from 'lucide-react';

interface CommandCenterProps {
  stadiumState?: StadiumState;
  onUpdateStadiumState?: (state: StadiumState) => void;
  sectors: StadiumSector[];
  incidents: Incident[];
  blockchainReceipts?: BlockchainReceipt[];
  selectedSectorId: string | null;
  onSelectSector: (sectorId: string) => void;
  onLogIncident: (
    sectorId: string,
    type: string,
    description: string,
    photoUrl?: string,
    lightweightMetadata?: string,
    photoAnalysis?: string,
    photoBase64?: string
  ) => Promise<void>;
  onResolveIncident: (id: string) => Promise<void>;
  onRunDirective: (directive: string) => Promise<void>;
  directiveResult: string | null;
  isGeneratingDirective: boolean;
  isLoggingIncident: boolean;
  activeDispatches?: StaffDispatch[];
  onTriggerDispatch?: (sectorId: string, type: string) => Promise<void>;
  onResolveDispatch?: (id: string) => Promise<void>;
  gamePhase?: StadiumState['gamePhase'];
  onPhaseChange?: (phase: StadiumState['gamePhase']) => Promise<void>;
  onTriggerChaos?: () => Promise<void>;
  theme?: 'light' | 'dark';
  language?: string;
}

export default function CommandCenter({
  stadiumState,
  onUpdateStadiumState = () => {},
  sectors,
  incidents,
  blockchainReceipts = [],
  selectedSectorId,
  onSelectSector,
  onLogIncident,
  onResolveIncident,
  onRunDirective,
  directiveResult,
  isGeneratingDirective,
  isLoggingIncident,
  activeDispatches = [],
  onTriggerDispatch = async () => {},
  onResolveDispatch = async () => {},
  gamePhase = 'pre-match',
  onPhaseChange = async () => {},
  onTriggerChaos = async () => {},
  theme = 'dark',
  language = 'en'
}: CommandCenterProps) {
  // Incident Form State
  const [formSectorId, setFormSectorId] = useState('');
  const [formType, setFormType] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Photo Simulator States
  const [simulatedPhoto, setSimulatedPhoto] = useState<string | null>(null);
  const [simulatedMetadata, setSimulatedMetadata] = useState<string>('');
  const [simulatedAnalysis, setSimulatedAnalysis] = useState<string>('');

  // Command Sandbox Custom Directive State
  const [customDirective, setCustomDirective] = useState('');

  // Tab State inside Right Column ("incidents", "dispatches", "blockchain")
  const [activeTab, setActiveTab] = useState<'incidents' | 'dispatches' | 'blockchain'>('incidents');

  // Manual Dispatch Form States
  const [dispatchSectorId, setDispatchSectorId] = useState('');
  const [dispatchType, setDispatchType] = useState('');

  // FIFA 2026 Clear Bag Compliance Guard checklist state
  const [bagClear, setBagClear] = useState(false);
  const [bagSizeValid, setBagSizeValid] = useState(false);
  const [clutchApproved, setClutchApproved] = useState(false);
  const [prohibitedChecked, setProhibitedChecked] = useState(false);

  // CCTV Scanning overlay state
  const [cctvFrame, setCctvFrame] = useState(0);

  // Evacuation Safeguard dialog state
  const [showEvacModal, setShowEvacModal] = useState(false);

  // Computer Vision filter toggle for Edge AI Live CCTV
  const [cvFilter, setCvFilter] = useState<'all' | 'bbox' | 'heatmap' | 'none'>('all');

  // Selected Sector Details
  const selectedSector = sectors.find(s => s.id === selectedSectorId) || null;

  // Animate CCTV tracking dots
  useEffect(() => {
    const interval = setInterval(() => {
      setCctvFrame(prev => (prev + 1) % 100);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoBase64(base64String);
      setSimulatedPhoto(base64String);
      setSimulatedMetadata(`Layer 1: User Uploaded File [${file.name}]. Layer 2: Size ${(file.size / 1024).toFixed(1)} KB. Layer 3: P2P Multimodal packet ready.`);
      setSimulatedAnalysis('Custom Live Field Image uploaded. Processing full-spectrum multimodal vision analysis on next submit.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoBase64(base64String);
        setSimulatedPhoto(base64String);
        setSimulatedMetadata(`Layer 1: Drag-and-Drop File [${file.name}]. Layer 2: Size ${(file.size / 1024).toFixed(1)} KB. Layer 3: Multi-spectral P2P mesh relay.`);
        setSimulatedAnalysis('Custom Live Field Image uploaded. Processing full-spectrum multimodal vision analysis on next submit.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNetworkUpdate = async (params: { packetLoss?: number; latencyMs?: number; syntheticCorruptionActive?: boolean; meshRelayQuality?: number }) => {
    try {
      const currentNetwork = stadiumState?.networkState || {
        packetLoss: 0,
        latencyMs: 24,
        resilienceModeActive: false,
        meshRelayQuality: 100,
        syntheticCorruptionActive: false
      };

      const payload = {
        packetLoss: params.packetLoss !== undefined ? params.packetLoss : currentNetwork.packetLoss,
        latencyMs: params.latencyMs !== undefined ? params.latencyMs : currentNetwork.latencyMs,
        syntheticCorruptionActive: params.syntheticCorruptionActive !== undefined ? params.syntheticCorruptionActive : currentNetwork.syntheticCorruptionActive,
        meshRelayQuality: params.meshRelayQuality !== undefined ? params.meshRelayQuality : currentNetwork.meshRelayQuality,
      };

      const response = await fetch('/api/stadium/network-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok && onUpdateStadiumState) {
        const data = await response.json();
        onUpdateStadiumState(data);
      }
    } catch (err) {
      console.error('Error updating network configuration:', err);
    }
  };

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSectorId || !formType || !formDescription) return;
    await onLogIncident(
      formSectorId,
      formType,
      formDescription,
      simulatedPhoto || undefined,
      simulatedMetadata || undefined,
      simulatedAnalysis || undefined,
      photoBase64 || undefined
    );
    setFormType('');
    setFormDescription('');
    setSimulatedPhoto(null);
    setPhotoBase64(null);
    setSimulatedMetadata('');
    setSimulatedAnalysis('');
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 4000);
  };

  const PRESET_DIRECTIVES = [
    "Simulate a torrential rainstorm delaying the match. Provide an evacuation plan and direct shelter strategies.",
    "A major Metro train malfunction has occurred at the Gate B East Hub post-match. Propose an emergency crowd dispersion, bypass route, and free Lot 4 city shuttle activation plan.",
    "A foreign state VIP delegation is arriving unexpectedly through Gate A (North). Formulate a security escort protocol that guarantees ADA lanes remain uninterrupted."
  ];

  const getSeverityBadgeClass = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-700 border border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  return (
    <>
      {/* Safeguard Evacuation Modal */}
      {showEvacModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
              <h3 className="text-lg font-bold font-display uppercase tracking-tight">Confirm Master Evacuation?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Warning: This is a stadium-wide master override. This action will:
            </p>
            <ul className="list-disc pl-4 text-xs text-slate-500 space-y-1.5 my-3 font-semibold">
              <li>Set game operational phase to <span className="text-red-600 font-bold">EMERGENCY</span></li>
              <li>Instantly update all fan companion apps with haptic and visual alarms</li>
              <li>Re-route heatmaps for optimal outflow crowd dispersion</li>
              <li>Broadcast multilingual PA voice alerts to all stands</li>
            </ul>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowEvacModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onPhaseChange('emergency');
                  setShowEvacModal(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2 rounded-xl text-xs transition-colors shadow-lg cursor-pointer"
              >
                Confirm Evacuation Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Overwrite Banner */}
      {gamePhase === 'emergency' ? (
        <div className="bg-red-600 border-2 border-red-700 rounded-2xl p-5 text-white mb-6 animate-pulse flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-10 h-10 text-white shrink-0" />
            <div>
              <h3 className="text-base font-extrabold uppercase font-display tracking-wider">CRITICAL STADIUM EVACUATION PROTOCOL ACTIVE</h3>
              <p className="text-xs text-red-100 font-semibold">Estadio Azteca is currently in evacuation protocol. All sector gates set to outbound egress. Volunteers SMS alerts dispatched.</p>
            </div>
          </div>
          <button
            onClick={() => onPhaseChange('pre-match')}
            className="bg-white hover:bg-slate-100 text-red-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg cursor-pointer shrink-0 uppercase tracking-wider"
          >
            Reset to Pre-Match Ops
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-950/50 rounded-lg border border-red-900/30">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">Emergency Operations System (EOS)</h4>
              <p className="text-[10px] text-slate-400 font-medium">Instantly trigger stadium-wide evacuation broadcasts and alert dispatch nets.</p>
            </div>
          </div>
          <button
            onClick={() => setShowEvacModal(true)}
            className="bg-red-700 hover:bg-red-600 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-all duration-200 border border-red-800 shadow-md hover:scale-[1.02] cursor-pointer"
          >
            ⚠️ Initiate Evacuation
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: Diagnostics & Sandbox (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">

        {/* Module 1: Selected Sector Diagnostics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold font-display text-slate-800 mb-3 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            Selected Sector Diagnostics
          </h3>

          {selectedSector ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-md font-bold text-slate-800 font-display">{selectedSector.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase font-mono">ID: {selectedSector.id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedSector.status === 'critical' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                  selectedSector.status === 'congested' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedSector.status.toUpperCase()}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" /> Density
                  </p>
                  <p className="text-xl font-bold text-slate-800">{selectedSector.currentDensity}%</p>
                  <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedSector.currentDensity > 85 ? 'bg-red-500' :
                        selectedSector.currentDensity > 60 ? 'bg-orange-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedSector.currentDensity}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mb-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-orange-600" /> Flow Rate
                  </p>
                  <p className="text-xl font-bold text-slate-800">{selectedSector.flowRate}</p>
                  <p className="text-[10px] text-slate-400">people / min</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Queue Time
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {selectedSector.id.startsWith('gate') ? `${selectedSector.queueTimeMin}m` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-slate-400">turnstile wait</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-purple-600" /> Amenities
                  </p>
                  <p className="text-xs font-bold text-slate-800">Food: {selectedSector.concessionsWaitMin}m</p>
                  <p className="text-[10px] text-slate-400">WC: {selectedSector.restroomsWaitMin}m wait</p>
                </div>
              </div>

              {/* Accessibility */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-2 font-medium">
                  <Accessibility className="w-4 h-4 text-emerald-600" /> Active Inclusion & Accessibility Perks:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSector.accessibilityFeatures.map((feat, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold shadow-sm">
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* CCTV & Drone Stream Integration */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                    <Camera className="w-4 h-4 text-blue-600" /> Live CCTV & Drone Feed (Edge AI):
                  </p>

                  {/* CV Filter Controls */}
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg self-start">
                    <button
                      onClick={() => setCvFilter('all')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${cvFilter === 'all' ? 'bg-blue-900 text-white font-black' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      ALL CV
                    </button>
                    <button
                      onClick={() => setCvFilter('bbox')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${cvFilter === 'bbox' ? 'bg-blue-900 text-white font-black' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      BBOX
                    </button>
                    <button
                      onClick={() => setCvFilter('heatmap')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${cvFilter === 'heatmap' ? 'bg-blue-900 text-white font-black' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      HEATMAP
                    </button>
                    <button
                      onClick={() => setCvFilter('none')}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${cvFilter === 'none' ? 'bg-blue-900 text-white font-black' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      CLEAN
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner group">
                  {/* Video scanline and noise effects */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_black_90%)] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[length:100%_4px,_6px_100%] animate-pulse"></div>

                  {/* Live Feed Identifiers */}
                  <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start z-10 text-[9px] font-mono font-bold text-emerald-400 select-none">
                    <span className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded backdrop-blur-xs border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping shrink-0"></span>
                      CAM {selectedSector.id.toUpperCase()}_0{selectedSector.id.charCodeAt(0) % 9 || 4}
                    </span>
                    <span className="bg-black/50 px-2 py-1 rounded backdrop-blur-xs border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE • EDGE_AI_PROCESSED
                    </span>
                  </div>

                  {/* Simulated Object Tracking Overlay */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
                    {cvFilter !== 'none' && (
                      <>
                        {/* Retro tracking crosshairs */}
                        <div className="w-8 h-8 border border-white/10 rounded-full absolute"></div>
                        <div className="w-14 h-14 border border-dashed border-white/5 rounded-full absolute animate-spin"></div>
                      </>
                    )}

                    {/* People Flow Box */}
                    {(cvFilter === 'all' || cvFilter === 'bbox') && (
                      <div
                        className="absolute border border-emerald-400 bg-emerald-500/10 p-1 flex flex-col gap-0.5 rounded-xs transition-all duration-1000"
                        style={{
                          top: `${25 + Math.sin(cctvFrame * 0.1) * 15}%`,
                          left: `${35 + Math.cos(cctvFrame * 0.15) * 25}%`,
                          width: '65px',
                          height: '45px'
                        }}
                      >
                        <span className="text-[6px] text-emerald-400 font-mono font-extrabold bg-black/60 px-0.5 self-start rounded-2xs">PEOPLE_FLOW</span>
                        <span className="text-[5px] text-emerald-300 font-mono">FLOW: {selectedSector.flowRate} p/m</span>
                      </div>
                    )}

                    {/* Dense Heatmap Box */}
                    {(cvFilter === 'all' || cvFilter === 'heatmap') && (
                      <div
                        className="absolute border border-red-500 bg-red-500/15 p-1 flex flex-col gap-0.5 rounded-xs transition-all duration-1000"
                        style={{
                          bottom: `${15 + Math.cos(cctvFrame * 0.08) * 10}%`,
                          right: `${20 + Math.sin(cctvFrame * 0.12) * 15}%`,
                          width: '60px',
                          height: '40px'
                        }}
                      >
                        <span className="text-[6px] text-red-400 font-mono font-extrabold bg-black/60 px-0.5 self-start rounded-2xs">DENSE_HEAT</span>
                        <span className="text-[5px] text-red-300 font-mono">DENSITY: {selectedSector.currentDensity}%</span>
                      </div>
                    )}
                  </div>

                  {/* Video footer */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center text-[8px] font-mono font-bold text-slate-300">
                    <span>GRID: AZ_SEC_{selectedSector.id.substring(0,2).toUpperCase()}</span>
                    <span className="text-blue-400 uppercase tracking-widest animate-pulse">EDGE COMPUTING INFERENCE: ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Predictive Bottlenecking Analytics */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-blue-600" /> AI 15-Min Crowd Forecasting
                  </span>
                  <span className={`text-[10px] font-mono font-black border px-2 py-0.5 rounded-full ${
                    selectedSector.currentDensity > 80 ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                    selectedSector.currentDensity > 60 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {selectedSector.currentDensity > 80 ? 'CRITICAL BOTTLE_RISK' :
                     selectedSector.currentDensity > 60 ? 'WARNING CONGEST_RISK' :
                     'STABLE OPTIMAL_FLOW'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-150 shadow-inner">
                    <span className="text-[9px] text-slate-400 uppercase font-mono font-black">Est. Halftime Surge</span>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                      {selectedSector.currentDensity > 80 ? '98% (High Bottleneck)' :
                       selectedSector.currentDensity > 60 ? '75% (Moderate Flow)' :
                       '38% (Low Delay)'}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-150 shadow-inner">
                    <span className="text-[9px] text-slate-400 uppercase font-mono font-black">Recommended Alternate Gate</span>
                    <p className="text-xs font-extrabold text-blue-700 mt-0.5">
                      {selectedSector.id.startsWith('gate') ?
                        (selectedSector.id === 'gate-b' ? 'Route to Gate A (ADA)' : 'Route to Gate B (Transit)')
                        : 'Gate A (ADA Express)'}
                    </p>
                  </div>
                </div>

                {/* Forecast Trend Sparklines */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase font-mono font-black block mb-1.5">Density Trend Forecast (Next 30m)</span>
                  <div className="h-10 flex items-end gap-1.5 px-1 pt-1 border-b border-slate-200">
                    {[40, 48, 55, selectedSector.currentDensity, selectedSector.currentDensity * 1.15 > 100 ? 100 : Math.floor(selectedSector.currentDensity * 1.15), selectedSector.currentDensity * 0.95, selectedSector.currentDensity * 0.85].map((val, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all duration-500 ${
                          val > 80 ? 'bg-red-500' : val > 60 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}
                        style={{ height: `${val}%` }}
                        title={`Time +${i*5}m: ${Math.floor(val)}%`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-slate-400 font-bold mt-1.5">
                    <span>Now</span>
                    <span>+10m</span>
                    <span>+20m</span>
                    <span>+30m</span>
                  </div>
                </div>
              </div>

              {/* Edge AI & Digital Signage Sync Section */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                {/* Section header */}
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Edge AI & Signage Control Node
                  </h4>
                  <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded font-mono uppercase">Node Active</span>
                </div>

                {/* FIFA 2026 Clear Bag Compliance Guard */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1">
                      🛡️ FIFA 2026 Clear Bag Compliance Guard
                    </span>
                    <span className="text-[8px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">FIFA-SEC-ANNEX-2026</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    Interactive checklist for Gate security staff to verify fans' clear bags (strictly under 12" x 6" x 12" max size limits).
                  </p>

                  <div className="space-y-2 text-[10px] font-semibold text-slate-600 bg-white p-2.5 rounded-lg border border-slate-150">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bagClear}
                        onChange={(e) => setBagClear(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Is the bag completely transparent/clear plastic, vinyl, or PVC?</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bagSizeValid}
                        onChange={(e) => setBagSizeValid(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Is the bag under the 12" x 6" x 12" limit? (No large backpacks/drawstrings)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={clutchApproved}
                        onChange={(e) => setClutchApproved(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Is non-clear small clutch bag/purse smaller than 4.5" x 6.5" limit?</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prohibitedChecked}
                        onChange={(e) => setProhibitedChecked(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Are all prohibited items cleared? (No glass, metal flasks, flares, vapes)</span>
                    </label>
                  </div>

                  <div className={`p-2.5 rounded-lg text-center font-bold text-[10px] flex items-center justify-center gap-2 transition-all duration-300 ${
                    (bagClear && bagSizeValid && clutchApproved && prohibitedChecked)
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {(bagClear && bagSizeValid && clutchApproved && prohibitedChecked) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-extrabold uppercase tracking-wide">✓ COMPLIANT - PASS GATE ENTRY APPROVED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
                        <span className="font-extrabold uppercase tracking-wide">❌ NON-COMPLIANT - REJECT / MANUAL INSPECTION REQ.</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 1. Edge AI Computer Vision Anomaly Injection */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      🚨 Simulate Computer Vision Anomaly
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono font-bold">EDGE_AI_CV_CORE</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                    Simulate real-time on-camera event flags using local crowd vector processing. Automatically logs High-Severity Incidents:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/stadium/edge-ai-anomaly', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sectorId: selectedSector.id, anomalyType: 'slip_fall' })
                          });
                          if (!res.ok) throw new Error('Anomaly dispatch failed');
                          const data = await res.json();
                          onUpdateStadiumState(data);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-700 font-bold p-2 rounded-xl text-[10px] transition-colors border border-red-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>🤸 Slip, Fall Anomaly</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/stadium/edge-ai-anomaly', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sectorId: selectedSector.id, anomalyType: 'density_surge' })
                          });
                          if (!res.ok) throw new Error('Anomaly dispatch failed');
                          const data = await res.json();
                          onUpdateStadiumState(data);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold p-2 rounded-xl text-[10px] transition-colors border border-amber-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>📈 Turnstile Density Surge</span>
                    </button>
                  </div>
                </div>

                {/* 2. Live Digital Signage Synchronization Status & Overrides */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      📺 Live LED Digital Signage Sync
                    </span>
                    <span className="text-[8px] bg-emerald-100 text-emerald-850 px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">SYNCED</span>
                  </div>

                  {/* Current Board Text display (scrolling/simulated) */}
                  <div className="bg-black text-amber-500 rounded-lg p-3 font-mono border border-slate-800 text-center relative overflow-hidden select-none">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                    <p className="text-[11px] font-black uppercase tracking-wider animate-pulse inline-block whitespace-nowrap">
                      ⚡ [ {selectedSector.activeSignageMessage || 'WELCOME TO ESTADIO AZTECA - COPA MUNDIAL 2026'} ] ⚡
                    </p>
                  </div>

                  {/* Node Status Metadata */}
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 font-bold">
                    <span>NODE: AZ_LED_{selectedSector.id.substring(0,2).toUpperCase()}</span>
                    <span>RECEIPT: {selectedSector.signageCommandSent || 'PUSH_API_STABLE: STANDARD_PHASE'}</span>
                  </div>

                  {/* Manual Signage Override Input */}
                  <div className="flex gap-1.5 border-t border-slate-200/60 pt-2">
                    <input
                      type="text"
                      placeholder="Type custom billboard message..."
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] flex-grow font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value;
                          if (!val) return;
                          try {
                            const res = await fetch('/api/stadium/signage-command', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sectorId: selectedSector.id, activeSignageMessage: val })
                            });
                            if (!res.ok) throw new Error('Signage dispatch failed');
                            const data = await res.json();
                            onUpdateStadiumState(data);
                            (e.target as HTMLInputElement).value = '';
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={async (e) => {
                        const input = e.currentTarget.previousSibling as HTMLInputElement;
                        const val = input.value;
                        if (!val) return;
                        try {
                          const res = await fetch('/api/stadium/signage-command', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sectorId: selectedSector.id, activeSignageMessage: val })
                          });
                          if (!res.ok) throw new Error('Signage dispatch failed');
                          const data = await res.json();
                          onUpdateStadiumState(data);
                          input.value = '';
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-colors cursor-pointer shrink-0"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <p className="text-sm font-medium">No sector selected for diagnostics.</p>
              <p className="text-xs text-slate-400 mt-1">Click on any sector in the live SVG map above to load sensor logs and telemetry.</p>
            </div>
          )}
        </div>

        {/* Module 2: Arena Decision-Support Sandbox */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                OpsAI Decision-Support Sandbox
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Test tactical directives under simulated World Cup stadium states.</p>
            </div>
            {/* Automated Chaos Simulation button in Header */}
            <button
              type="button"
              onClick={onTriggerChaos}
              className="bg-rose-600 hover:bg-rose-700 hover:scale-[1.02] active:scale-95 text-white font-extrabold px-3 py-2 rounded-xl text-[11px] transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Trigger Chaos Mode
            </button>
          </div>

          {/* Detailed Chaos Mode Explanatory Card */}
          <div className="bg-rose-50/70 border border-rose-150 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-rose-800">
              <Zap className="w-4 h-4 text-rose-600 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">Automated Chaos Engineering Simulator</span>
            </div>
            <p className="text-[11px] text-slate-650 leading-relaxed">
              Triggers three simultaneous severe crises: a complete **Gate B Metro rail hub failure**, an **East Stand concourse utility power blackout**, and a **severe convective cloudburst rainstorm**. Demonstrates live how localized **LoRA Peer-to-Peer local Mesh Net routing** dispatches alarms instantly to field stewards under zero cell tower availability.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-700 font-semibold">Choose a Preset Directive or type your own:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PRESET_DIRECTIVES.map((directive, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomDirective(directive);
                    onRunDirective(directive);
                  }}
                  className="bg-slate-50 hover:bg-slate-100 text-left p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 transition-colors hover:border-slate-300 flex flex-col justify-between shadow-sm"
                >
                  <span className="line-clamp-3 leading-relaxed">{directive}</span>
                  <span className="text-amber-600 mt-2 font-bold flex items-center gap-1 text-[10px]">
                    Simulate Scenario <ArrowUpRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <form onSubmit={(e) => { e.preventDefault(); if (customDirective) onRunDirective(customDirective); }} className="flex gap-2">
              <label htmlFor="custom-directive-input" className="sr-only">Custom Operational Directive</label>
              <input
                id="custom-directive-input"
                type="text"
                value={customDirective}
                onChange={(e) => setCustomDirective(e.target.value)}
                placeholder="Type a custom operational directive (e.g. 'A stadium power outage hits Zone A stands...')"
                className="bg-slate-50 text-slate-800 placeholder-slate-400 border border-slate-200 px-3 py-2 rounded-lg text-xs flex-grow focus:outline-none focus:bg-white focus:border-blue-500 transition-all focus:ring-1 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={isGeneratingDirective || !customDirective}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-slate-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isGeneratingDirective ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Execute
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sandbox Result Output */}
          {directiveResult && (
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 max-h-[300px] overflow-y-auto shadow-inner">
              <div className="flex justify-between items-center mb-2 border-b border-amber-200/40 pb-2">
                <span className="text-[10px] uppercase font-mono text-amber-700 font-bold flex items-center gap-1">
                  ⚡ ArenaCommand GenAI Tactical Brief
                </span>
                <button
                  onClick={() => setCustomDirective('')}
                  className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Clear Brief
                </button>
              </div>
              <div className="text-xs text-slate-700 space-y-3 whitespace-pre-line leading-relaxed">
                {directiveResult}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Incidents & Logging Form (5 Cols) */}
      <div className="lg:col-span-5 space-y-6">

        {/* Module: Resilient Staff Mesh Network Status & Interactive Throttling Console */}
        <div className={`border rounded-2xl p-4 text-white space-y-4 shadow-md transition-colors duration-300 ${
          gamePhase === 'emergency' || (stadiumState?.networkState?.resilienceModeActive)
            ? 'bg-rose-950/90 border-rose-800 shadow-rose-950/20'
            : 'bg-slate-900 border-slate-800 shadow-slate-950/20'
        }`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${gamePhase === 'emergency' || (stadiumState?.networkState?.resilienceModeActive) ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-ping'}`}></span>
              📡 staff mesh net (p2p lora protocol)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono font-bold uppercase">
                {gamePhase === 'emergency' ? (
                  <span className="text-rose-400 animate-pulse bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-900/40">CELLULAR COLLAPSE ENGAGED</span>
                ) : (
                  <span className="text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Outage Redundancy Standby</span>
                )}
              </span>
              <span className="text-[9px] bg-blue-950 text-blue-300 font-black font-mono px-2 py-0.5 rounded border border-blue-900">915MHz ISM</span>
            </div>
          </div>

          {/* Current Live Network Telemetry Indicators */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs border-b border-slate-800/60 pb-3">
            <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/40">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Packet Loss</span>
              <p className={`font-mono font-black text-sm mt-0.5 ${(stadiumState?.networkState?.packetLoss ?? 0) > 30 ? 'text-rose-400 animate-pulse' : (stadiumState?.networkState?.packetLoss ?? 0) > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stadiumState?.networkState?.packetLoss ?? 0}%
              </p>
            </div>
            <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/40">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Latency</span>
              <p className={`font-mono font-black text-sm mt-0.5 ${(stadiumState?.networkState?.latencyMs ?? 24) > 300 ? 'text-rose-400' : (stadiumState?.networkState?.latencyMs ?? 24) > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stadiumState?.networkState?.latencyMs ?? 24}ms
              </p>
            </div>
            <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/40">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Relay Quality</span>
              <p className={`font-mono font-black text-sm mt-0.5 ${(stadiumState?.networkState?.meshRelayQuality ?? 100) < 60 ? 'text-rose-400' : (stadiumState?.networkState?.meshRelayQuality ?? 100) < 85 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stadiumState?.networkState?.meshRelayQuality ?? 100}%
              </p>
            </div>
          </div>

          {/* Interactive Network Throttling Controls */}
          <div className="space-y-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                ⚙️ Network Degradation & Resilience Controls
              </span>
              <span className="text-[8px] bg-slate-800 text-slate-350 font-bold px-1.5 py-0.2 rounded">SIMULATOR</span>
            </div>

            {/* Slider 1: Packet Loss */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-350 font-bold">
                <span>Packet Loss Throttling</span>
                <span className={(stadiumState?.networkState?.packetLoss ?? 0) > 30 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                  {stadiumState?.networkState?.packetLoss ?? 0}% (Max 100%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={stadiumState?.networkState?.packetLoss ?? 0}
                onChange={(e) => handleNetworkUpdate({ packetLoss: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Slider 2: Latency */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-350 font-bold">
                <span>Simulated Packet Latency</span>
                <span className={(stadiumState?.networkState?.latencyMs ?? 24) > 150 ? 'text-amber-400 font-black' : 'text-slate-400'}>
                  {stadiumState?.networkState?.latencyMs ?? 24}ms (Max 1000ms)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={stadiumState?.networkState?.latencyMs ?? 24}
                onChange={(e) => handleNetworkUpdate({ latencyMs: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Slider 3: Relay Quality */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-350 font-bold">
                <span>Mesh Relay Quality index</span>
                <span className={(stadiumState?.networkState?.meshRelayQuality ?? 100) < 80 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                  {stadiumState?.networkState?.meshRelayQuality ?? 100}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={stadiumState?.networkState?.meshRelayQuality ?? 100}
                onChange={(e) => handleNetworkUpdate({ meshRelayQuality: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Toggle: Synthetic Packet Corruption Bit-Flip Injector */}
            <div className="flex items-center justify-between border-t border-slate-850 pt-2.5 mt-2.5">
              <div>
                <span className="text-[10px] font-black uppercase font-mono block text-slate-300">
                  Bit-Flip Packet Injection
                </span>
                <p className="text-[8px] text-slate-500 font-medium leading-tight">
                  Simulate background packet bit corruption on peer relays
                </p>
              </div>
              <label htmlFor="synthetic-corruption-toggle" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="synthetic-corruption-toggle"
                  type="checkbox"
                  checked={stadiumState?.networkState?.syntheticCorruptionActive ?? false}
                  onChange={(e) => handleNetworkUpdate({ syntheticCorruptionActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>
          </div>

          {/* Dynamic Resilience Status Warnings */}
          {stadiumState?.networkState?.resilienceModeActive && (
            <div className="bg-rose-950/80 rounded-xl p-3 border border-rose-950 text-rose-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] text-rose-400 font-black font-mono flex items-center gap-1 animate-pulse">
                  🛡️ LOW-LATENCY PACKET RESILIENCY ACTIVE
                </span>
                <span className="text-[8px] bg-rose-900 text-rose-100 font-bold px-1.5 py-0.2 rounded font-mono">AUTOMATED FAILOVER</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">
                Network degradation detected. Local mesh automatically engaged low-latency compression and redundant multi-path mesh hops to preserve critical life-safety channels.
              </p>
            </div>
          )}

          {stadiumState?.networkState?.syntheticCorruptionActive && (
            <div className="bg-cyan-950/85 rounded-xl p-3 border border-cyan-900/50 text-cyan-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] text-cyan-400 font-black font-mono flex items-center gap-1">
                  💥 PACKET INJECTION ACTIVE
                </span>
                <span className="text-[8px] bg-cyan-900 text-cyan-100 font-bold px-1.5 py-0.2 rounded font-mono">BIT-FLIPS RUNNING</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">
                Injecting synthetic bit corruption fragments. CRC checksum analysis is dynamically fixing multi-hop packet fragments to sustain 100% data transmission.
              </p>
            </div>
          )}

          {/* Virtualized Packet Sniffer */}
          <LoraPacketSniffer
            isEmergency={gamePhase === 'emergency'}
            packetLoss={stadiumState?.networkState?.packetLoss ?? 0}
            latencyMs={stadiumState?.networkState?.latencyMs ?? 24}
            syntheticCorruptionActive={stadiumState?.networkState?.syntheticCorruptionActive ?? false}
          />
        </div>

        {/* Form: Report New Incident */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold font-display text-slate-800 mb-1 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-500" />
            Report New Incident
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            GenAI automatically evaluates severity, drafts dispatches, and generates multilingual PA announcements.
          </p>

          <form onSubmit={handleSubmitIncident} className="space-y-3.5">
            <div>
              <label htmlFor="incident-sector-select" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Target Stadium Sector/Gate:</label>
              <select
                id="incident-sector-select"
                required
                value={formSectorId}
                onChange={(e) => setFormSectorId(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              >
                <option value="">-- Choose Affected Sector --</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="incident-type-input" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Incident Type:</label>
              <input
                id="incident-type-input"
                required
                type="text"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                placeholder="e.g. Broken Escalator, Spill Hazard, Lost Item"
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>

            {/* Visual Edge Triage Simulator & Live Upload */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600 animate-pulse" /> Edge Photo & Triage Layers (LoRA / Live Upload)
              </span>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Because cellular towers are down, ground staff upload compressed photometric slices over peer-to-peer LoRA Mesh Net. Select a simulated field photo OR upload/drag a custom photo to trigger multimodal analysis:
              </p>

              {/* Presets Grid */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoBase64(null);
                    setSimulatedPhoto('https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=300&q=80');
                    setSimulatedMetadata('Layer 1: Structural Concrete Edge Outlines [98% MATCH]. Layer 2: Load displacement contour shifts detected at +14.2mm. Layer 3: High-frequency stress frequency peaks.');
                    setSimulatedAnalysis('CRITICAL STRUCTURAL CRACK: Horizontal shear fracture exposing core steel rebar in Gate B pillars. Localized pathway deformation detected.');
                    setFormType('Severe Structural Concrete Crack');
                    setFormDescription('Heavy shearing fracture observed in main support columns under Gate B concourse. Micro-cracking spreading. Exposed rebar. Load shift verified.');
                  }}
                  className={`border p-2 rounded-lg text-left text-[10px] transition-all flex flex-col items-center gap-1.5 font-bold cursor-pointer hover:border-blue-300 ${
                    formType === 'Severe Structural Concrete Crack' && !photoBase64 ? 'bg-blue-50 border-blue-600 text-blue-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <img src="https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=80&q=80" alt="Crack" className="w-10 h-10 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />
                  <span>🏗️ Structural</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoBase64(null);
                    setSimulatedPhoto('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=300&q=80');
                    setSimulatedMetadata('Layer 1: Thermal signature mapping logs extreme cardiovascular elevation. Layer 2: Respiratory expansion rate telemetry. Layer 3: P2P GPS beacon ACTIVE.');
                    setSimulatedAnalysis('CRITICAL MEDICAL EMERGENCY: Adult spectator unresponsive, experiencing sudden syncope and cardiovascular seize distress.');
                    setFormType('Cardiac Medical Emergency');
                    setFormDescription('Spectator collapsed near Section 102 concourse exit. Severe breathing distress, currently unconscious. Bystander CPR initiated.');
                  }}
                  className={`border p-2 rounded-lg text-left text-[10px] transition-all flex flex-col items-center gap-1.5 font-bold cursor-pointer hover:border-blue-300 ${
                    formType === 'Cardiac Medical Emergency' && !photoBase64 ? 'bg-blue-50 border-blue-600 text-blue-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <img src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=80&q=80" alt="Medical" className="w-10 h-10 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />
                  <span>🚑 Medical</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoBase64(null);
                    setSimulatedPhoto('https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=300&q=80');
                    setSimulatedMetadata('Layer 1: Volumetric 3D scanning bounds box at 0.72m³. Layer 2: Thermal map registers ambient temperature (inactive threat).');
                    setSimulatedAnalysis('ROUTINE DISPATCH: Large food box/paper debris clutter. Non-hazardous. Blocking standard footway.');
                    setFormType('Routine Debris Obstruction');
                    setFormDescription('Loose cardboard catering crates and food bins piled on exit steps in east corridor, causing a minor walking bottleneck.');
                  }}
                  className={`border p-2 rounded-lg text-left text-[10px] transition-all flex flex-col items-center gap-1.5 font-bold cursor-pointer hover:border-blue-300 ${
                    formType === 'Routine Debris Obstruction' && !photoBase64 ? 'bg-blue-50 border-blue-600 text-blue-800' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <img src="https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=80&q=80" alt="Debris" className="w-10 h-10 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />
                  <span>🧹 Debris</span>
                </button>
              </div>

              {/* Drag-and-Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer ${
                  dragActive ? 'border-blue-600 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                <input
                  type="file"
                  id="incident-photo-file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="incident-photo-file" className="cursor-pointer block">
                  <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-[10px] font-black text-slate-700 block">
                    {photoBase64 ? '✓ Custom Live Photo Loaded' : 'Drag & Drop field photo or click to browse'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                    Accepts PNG/JPEG. Photo is relayed in real-time over P2P mesh network.
                  </span>
                </label>
              </div>

              {simulatedPhoto && (
                <div className="bg-slate-900 text-slate-200 rounded-xl p-3 border border-slate-800 space-y-2 animate-in fade-in duration-300">
                  <div className="flex gap-2.5 items-start">
                    <img src={simulatedPhoto} alt="Simulated input" className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0" referrerPolicy="no-referrer" />
                    <div className="text-[9px] font-mono leading-relaxed space-y-1">
                      <p className="text-blue-400 font-bold uppercase">⚡ Edge-Compression Layers Applied:</p>
                      <p className="text-slate-300"><span className="text-slate-500 font-semibold">METADATA_ARRAY:</span> {simulatedMetadata}</p>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[9px] text-amber-400">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Central GenAI Inference Filter:</span>
                    {simulatedAnalysis}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="incident-desc-textarea" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Description / Observations:</label>
              <textarea
                id="incident-desc-textarea"
                required
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe exactly what you observe. E.g. Elevator near Gate B is unresponsive, 4 wheelchair users are waiting..."
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIncident || !formSectorId || !formType || !formDescription}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-200 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isLoggingIncident ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Analyzing Incident & Generating Dispatches...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Log Incident to Command Hub
                </>
              )}
            </button>

            {formSuccess && (
              <p className="text-center text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 py-2.5 rounded-lg">
                ✓ Incident logged! AI Dispatch & Multilingual PA sheets ready below.
              </p>
            )}
          </form>
        </div>

        {/* Module: Active Incidents & Staff Dispatches Tabbed Hub */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">

          {/* Tab Selector Header */}
          <div className="flex border-b border-slate-100 pb-1 justify-between items-center">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold font-display transition-all border-b-2 cursor-pointer ${
                  activeTab === 'incidents'
                    ? 'text-blue-900 border-blue-900 font-black'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                Incidents ({incidents.filter(i => !i.resolved).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dispatches')}
                className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold font-display transition-all border-b-2 cursor-pointer ${
                  activeTab === 'dispatches'
                    ? 'text-blue-900 border-blue-900 font-black'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                Staff Dispatches ({activeDispatches.filter(d => d.status !== 'resolved').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('blockchain')}
                className={`pb-2.5 text-xs uppercase tracking-wider font-extrabold font-display transition-all border-b-2 cursor-pointer ${
                  activeTab === 'blockchain'
                    ? 'text-blue-900 border-blue-900 font-black'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                🔗 Blockchain Ledger ({blockchainReceipts.length})
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">LIVE FEED</span>
          </div>

          {/* TAB 1: INCIDENTS GRID */}
          {activeTab === 'incidents' && (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 rounded-xl border transition-all ${
                    incident.resolved
                      ? 'bg-slate-50 border-slate-100 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 font-display">{incident.type}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${getSeverityBadgeClass(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400" /> Sector: {incident.sectorId.toUpperCase()} • {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {!incident.resolved && (
                      <button
                        onClick={() => onResolveIncident(incident.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[10px] transition-colors flex items-center gap-0.5 cursor-pointer shadow-sm"
                      >
                        <Check className="w-3 h-3" /> Resolve
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-150 mb-3 font-medium">
                    {incident.description}
                  </p>

                  {/* Multi-modal compressed Edge Photo & AI Vision overlays */}
                  {incident.photoUrl && (
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 border border-slate-800 space-y-2 mb-3">
                      <div className="flex gap-2.5 items-start">
                        <img src={incident.photoUrl} alt="Incident Site Triage" className="w-16 h-16 object-cover rounded border border-slate-700 shrink-0" referrerPolicy="no-referrer" />
                        <div className="text-[10px] space-y-1">
                          <p className="text-blue-400 font-extrabold uppercase flex items-center gap-1 font-mono">
                            <Camera className="w-3.5 h-3.5" /> Compressed Edge Photo Layers:
                          </p>
                          <p className="text-slate-300 leading-relaxed font-mono text-[9px]">
                            {incident.lightweightMetadata || "Layer 1: Structural concrete contours. Layer 2: Load deviation alerts."}
                          </p>
                        </div>
                      </div>

                      {incident.photoAnalysis && (
                        <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] font-semibold text-amber-400 flex items-start gap-1.5 leading-relaxed">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">Edge AI Vision Translation Layer:</span>
                            {incident.photoAnalysis}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {incident.blockchainHash && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-lg text-[9px] font-mono text-emerald-700 mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-black text-emerald-850">BLOCK VERIFIED:</span> {incident.blockchainHash}
                      </div>
                    </div>
                  )}

                  {/* AI Recommendations accordion/details */}
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Recommended Response
                      </span>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-line bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 font-medium">
                        {incident.recommendations}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Volunteers Dispatch SMS (160 Chars)
                      </span>
                      <p className="text-xs text-slate-700 font-mono mt-1 bg-blue-50/40 p-2 rounded border border-blue-100/50 leading-relaxed">
                        {incident.dispatchSms}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-purple-500" /> Multilingual PA Announcements Drafts
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5 text-[10px] font-medium">
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">EN:</span>
                          <p className="text-slate-600 mt-0.5 line-clamp-3 leading-relaxed">{incident.paAnnouncementDrafts.en}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">ES:</span>
                          <p className="text-slate-600 mt-0.5 line-clamp-3 leading-relaxed">{incident.paAnnouncementDrafts.es}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">FR:</span>
                          <p className="text-slate-600 mt-0.5 line-clamp-3 leading-relaxed">{incident.paAnnouncementDrafts.fr}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">AR:</span>
                          <p className="text-slate-600 mt-0.5 line-clamp-3 leading-relaxed">{incident.paAnnouncementDrafts.ar}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ))}

              {incidents.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">All systems are currently green. No incidents reported.</p>
              )}
            </div>
          )}

          {/* TAB 2: STAFF DISPATCHES */}
          {activeTab === 'dispatches' && (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">

              {/* Manual Dispatch Form Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-inner">
                <span className="text-[10px] font-bold text-blue-950 uppercase tracking-widest block flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-blue-700" /> Deploy Field Response Team
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="dispatch-sector-select" className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Target Sector</label>
                    <select
                      id="dispatch-sector-select"
                      value={dispatchSectorId}
                      onChange={(e) => setDispatchSectorId(e.target.value)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
                    >
                      <option value="">-- Select --</option>
                      {sectors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dispatch-profile-select" className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Task Profile</label>
                    <select
                      id="dispatch-profile-select"
                      value={dispatchType}
                      onChange={(e) => setDispatchType(e.target.value)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
                    >
                      <option value="">-- Profile --</option>
                      <option value="ADA Route Guidance">♿ ADA Route Guidance</option>
                      <option value="Queue Management Assist">🚀 Queue Management Assist</option>
                      <option value="Concourse De-escalation">🛡️ Concourse De-escalation</option>
                      <option value="First Aid Support">🏥 First Aid Support</option>
                    </select>
                  </div>
                </div>

                <button
                  disabled={!dispatchSectorId || !dispatchType}
                  onClick={async () => {
                    await onTriggerDispatch(dispatchSectorId, dispatchType);
                    setDispatchSectorId('');
                    setDispatchType('');
                  }}
                  className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-200 text-white font-extrabold py-1.5 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Deploy Response Stewards
                </button>
              </div>

              {/* Dispatches Feed */}
              <div className="space-y-3">
                {activeDispatches.map((disp) => (
                  <div
                    key={disp.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      disp.status === 'resolved'
                        ? 'bg-slate-50 border-slate-100 opacity-60'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 font-display">{disp.type}</span>
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            disp.status === 'resolved' ? 'bg-slate-100 text-slate-600' :
                            disp.status === 'on-scene' ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          }`}>
                            {disp.status}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Sector: {disp.sectorId.toUpperCase()} • Stews: {disp.stewards.join(', ')}
                        </p>

                        <p className="text-[9px] text-slate-400 font-mono mt-1 font-bold">
                          🗺️ GPS COORDS: {disp.gpsCoordinates.lat.toFixed(5)}, {disp.gpsCoordinates.lng.toFixed(5)}
                        </p>

                        <p className="text-[9px] text-slate-400 mt-0.5 font-bold">
                          ⏱️ DEPLOYED: {new Date(disp.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      {disp.status !== 'resolved' && (
                        <button
                          onClick={() => onResolveDispatch(disp.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[9px] transition-colors flex items-center gap-0.5 cursor-pointer shadow-sm shrink-0"
                        >
                          <Check className="w-3 h-3" /> Close
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {activeDispatches.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-6">No active staff dispatches in progress.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: DECENTRALIZED BLOCKCHAIN AUDIT LEDGER */}
          {activeTab === 'blockchain' && (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 font-mono text-slate-700">
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Decentralized Audit Trails
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold font-sans">
                  This tamper-proof cryptographic ledger operates locally using Linked Hash lists. It guarantees complete event timestamp verification and prevents any administrative alteration of safety dispatch logs.
                </p>
              </div>

              <div className="space-y-3">
                {blockchainReceipts.map((block) => (
                  <div key={block.hash} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-[11px] leading-relaxed text-slate-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-full w-1 bg-emerald-500/80"></div>

                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-emerald-400 border border-slate-800 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                          BLOCK #{block.blockNumber}
                        </span>
                        <span className="text-white font-extrabold uppercase tracking-wide text-[10px]">
                          {block.action}
                        </span>
                      </div>
                      <span className="text-slate-500 font-bold text-[9px]">
                        ⏱️ {new Date(block.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-slate-400 mb-2 text-[10px] font-sans font-semibold leading-relaxed">
                      {block.details}
                    </p>

                    <div className="space-y-1 bg-slate-900/60 p-2 rounded border border-slate-900 text-[9px] text-slate-500">
                      <div className="flex justify-between gap-2.5">
                        <span className="font-bold text-slate-600 uppercase shrink-0">CURRENT HASH:</span>
                        <span className="truncate text-emerald-600 font-bold">{block.hash}</span>
                      </div>
                      <div className="flex justify-between gap-2.5">
                        <span className="font-bold text-slate-600 uppercase shrink-0">PREVIOUS HASH:</span>
                        <span className="truncate text-slate-600 font-bold">{block.prevHash}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {blockchainReceipts.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-6 font-sans">No cryptographic blocks generated yet. Create an incident or toggle Simulation Modes to write blocks.</p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  </>
);
}
