import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to throttle and bundle high-frequency telemetry packet streams.
 * Prevents browser memory leaks and excessive DOM re-renders by batching incoming
 * data stream payloads every 2 seconds.
 *
 * నిరంతరాయంగా వచ్చే లోరా డేటా ప్రవాహం వల్ల మెమరీ లోడ్ పెరగకుండా 2 సెకన్ల కొకసారి బండ్లింగ్ లాజిక్.
 */
export function useThrottledTelemetry<T>(incomingStream: T) {
  const [throttledData, setThrottledData] = useState<T[]>([]);
  const bufferRef = useRef<T[]>([]);

  useEffect(() => {
    if (incomingStream) {
      bufferRef.current.push(incomingStream);
    }
  }, [incomingStream]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        // Retain only the last 30 packets in memory to prevent browser performance degradation
        setThrottledData((prev) => [...prev, ...bufferRef.current].slice(-30));
        bufferRef.current = [];
      }
    }, 2000); // 2-second bundling interval

    return () => clearInterval(interval);
  }, []);

  return throttledData;
}
