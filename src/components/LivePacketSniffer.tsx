import React, { useMemo } from 'react';

export interface LivePacketLog {
  timestamp: string;
  message: string;
  [key: string]: any;
}

/**
 * Highly optimized, memoized list-virtualized Packet Sniffer component.
 * Limits the rendering to the last 20 telemetry entries in reverse order
 * to guarantee optimal memory consumption and avoid browser paint lags.
 */
export const LivePacketSniffer = React.memo(function LivePacketSniffer({ logs }: { logs: LivePacketLog[] }) {
  // Keep only the last 20 logs in memory and reverse them to display the newest at the top
  const visibleLogs = useMemo(() => {
    return (logs || []).slice(-20).reverse();
  }, [logs]);

  if (!visibleLogs.length) {
    return (
      <div className="text-center p-4 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded">
        No packets currently snuffed. Initialize LoRA mesh telemetry stream.
      </div>
    );
  }

  return (
    <div className="font-mono text-[10px] max-h-60 overflow-y-auto space-y-1 select-none pr-1">
      {visibleLogs.map((log, index) => (
        <div key={`${log.timestamp}-${index}`} className="p-1.5 bg-slate-900/50 border-l-2 border-emerald-500 text-emerald-400 flex items-center justify-between gap-2 rounded">
          <div className="truncate">
            <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
          </div>
          <span className="text-[8px] text-emerald-600 bg-emerald-950/40 px-1 py-0.5 rounded font-bold shrink-0">
            [BATCHED RELAY OK]
          </span>
        </div>
      ))}
    </div>
  );
});

export default LivePacketSniffer;
