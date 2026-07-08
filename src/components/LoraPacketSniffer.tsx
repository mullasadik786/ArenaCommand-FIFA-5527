import React, { useState, useRef, useMemo } from 'react';
import { useLoraPacketStream } from '../hooks/useLoraPacketStream';
import { LoraTelemetryPacket } from '../types';

interface LoraPacketSnifferProps {
  isEmergency: boolean;
  packetLoss: number;
  latencyMs: number;
  syntheticCorruptionActive: boolean;
}

export const LoraPacketSniffer = React.memo(function LoraPacketSniffer({
  isEmergency,
  packetLoss = 0,
  latencyMs = 24,
  syntheticCorruptionActive = false,
}: LoraPacketSnifferProps) {
  // Configurable Debounce delay state: 500ms, 1000ms, 2000ms, 5000ms
  const [bundlingIntervalMs, setBundlingIntervalMs] = useState<number>(2000);
  const { packets } = useLoraPacketStream({
    isEmergency,
    packetLoss,
    latencyMs,
    syntheticCorruptionActive,
    bundlingIntervalMs,
  });

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const itemHeight = 18; // precise pixel height for each log line item
  const containerHeight = 140; // matches max-h-[140px] visible viewport height

  // Virtual Scrolling Calculations:
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(packets.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);

  const visiblePackets = useMemo(() => {
    return packets.slice(startIndex, endIndex);
  }, [packets, startIndex, endIndex]);

  // Pad top and bottom to represent the absolute height of off-screen items, conserving native scrollbar behaviors
  const topPadding = startIndex * itemHeight;
  const bottomPadding = Math.max(0, (packets.length - endIndex) * itemHeight);

  // Focus and handle manual list clear
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('LoRA telemetry feed connected.');

  const handleIntervalChange = (val: number) => {
    setBundlingIntervalMs(val);
    const text = `Telemetry bundling interval set to ${val} milliseconds. Rendering is optimized.`;
    setLastAnnouncement(text);
  };

  return (
    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 shadow-inner flex flex-col gap-2">
      {/* Dynamic ARIA Live Region for accessibility feedback */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lastAnnouncement}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-900 pb-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
            Live LoRA Packet Sniffer (Virtualized)
          </span>
          <span className="text-[8px] text-emerald-500 font-mono font-bold uppercase mt-0.5 animate-pulse">
            1,482 Edge Nodes Listening
          </span>
        </div>

        {/* Debounce Interval Controller to satisfy Efficiency & Accessibility guidelines */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-between sm:justify-start">
          <label htmlFor="debounce-delay-select" className="text-[9px] text-slate-400 font-bold uppercase tracking-wide font-mono">
            Debounce:
          </label>
          <select
            id="debounce-delay-select"
            value={bundlingIntervalMs}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 text-white rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-slate-700 transition-colors"
            aria-label="Set packet sniffer debounce delay in milliseconds to save browser render resources"
          >
            <option value={500}>500ms (Real-time)</option>
            <option value={1000}>1000ms (Performance)</option>
            <option value={2000}>2000ms (Balanced)</option>
            <option value={5000}>5000ms (Extreme Battery Saver)</option>
          </select>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="bg-slate-950 font-mono text-[9.5px] max-h-[140px] overflow-y-auto shadow-inner select-none pr-1 scrollbar-thin"
        tabIndex={0}
        aria-label="Virtualized live LoRA packet log list. Use arrow keys or mouse scroll to inspect events."
      >
        <div style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }} className="space-y-1">
          {visiblePackets.map((p) => {
            let textClass = "text-emerald-400";
            let badgeClass = "text-emerald-500";
            if (p.event.includes('CRC_TIMEOUT_RETRY_FAILED')) {
              textClass = "text-rose-400 font-bold";
              badgeClass = "text-rose-500 font-bold animate-pulse";
            } else if (p.event.includes('LATENCY SPIKE')) {
              textClass = "text-amber-400 font-bold";
              badgeClass = "text-amber-500 font-bold";
            } else if (p.event.includes('CRC CHECKSUM FAILURE')) {
              textClass = "text-cyan-400 font-bold";
              badgeClass = "text-cyan-500 font-bold";
            }
            return (
              <p key={p.id} className={`leading-tight h-[18px] truncate ${textClass}`} style={{ height: `${itemHeight}px` }}>
                <span className="text-slate-500">[{p.time}]</span>{' '}
                <span className="text-blue-400 font-bold">[{p.node}]</span>{' '}
                {p.event}{' '}
                <span className={`${badgeClass} text-[8px]`}>[{p.status}]</span>
              </p>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono font-bold uppercase">
        <span>Transmissions Encrypted</span>
        <span>Render Cycles Buffered</span>
      </div>
    </div>
  );
});

export default LoraPacketSniffer;
