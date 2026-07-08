import { useState, useEffect, useRef } from 'react';
import { LoraTelemetryPacket } from '../types';

interface UseLoraPacketStreamProps {
  isEmergency: boolean;
  packetLoss: number;
  latencyMs: number;
  syntheticCorruptionActive: boolean;
  bundlingIntervalMs: number; // Configurable debounce/throttle interval
}

/**
 * Custom hook to manage and buffer high-frequency LoRA packet streams.
 * Decouples telemetry ingestion logic from presentation rendering cycles.
 */
export function useLoraPacketStream({
  isEmergency,
  packetLoss,
  latencyMs,
  syntheticCorruptionActive,
  bundlingIntervalMs,
}: UseLoraPacketStreamProps) {
  const [packets, setPackets] = useState<LoraTelemetryPacket[]>([
    { id: '1', node: 'NODE-B', event: 'Transit Collapse Alert ➜ Rerouting dispatch...', status: 'DELIVERED 100% ACK', time: '00:01s' },
    { id: '2', node: 'NODE-E', event: 'Stand Blackout Alert ➜ Solar battery engaged...', status: 'DELIVERED 100% ACK', time: '00:12s' },
    { id: '3', node: 'NODE-C', event: 'Storm Warning ➜ South Plaza cleared...', status: 'DELIVERED 100% ACK', time: '00:24s' },
  ]);

  const bufferRef = useRef<LoraTelemetryPacket[]>([]);

  useEffect(() => {
    const isSimulationActive = isEmergency || packetLoss > 0 || latencyMs > 50 || syntheticCorruptionActive;
    if (!isSimulationActive) return;

    // Simulate incoming high-frequency packet transmissions from edge nodes
    const pulseInterval = setInterval(() => {
      const nodes = ['NODE-A', 'NODE-B', 'NODE-C', 'NODE-D', 'NODE-E', 'NODE-F', 'NODE-G', 'NODE-H'];
      const events = [
        'Flow rate heartbeat update: 32 fans/min',
        'Staff locator beacon ping: ACTIVE',
        'Turnstile gate validation check: OK',
        'S-East Sector power draw: 4.2 kW',
        'Concourse congestion index: 1.25 (OPTIMAL)',
        'Mesh peer signal RSSI: -92 dBm',
        'Battery charge state: 98.4%',
        'Gate B ticket scanner response: 12ms',
      ];

      const batchCount = Math.floor(Math.random() * 2) + 2; // 2-3 pings generated
      const tempPackets: LoraTelemetryPacket[] = [];

      // Inject packet loss drops
      if (packetLoss > 15 && Math.random() < 0.45) {
        tempPackets.push({
          id: `loss-${Math.random()}`,
          node: 'MESH-TX',
          event: `⚠️ [DROP RETRY] CRC_TIMEOUT_RETRY_FAILED. Packet loss is high (${packetLoss}%). Retransmitting fragment...`,
          status: 'RETRY ACTIVE',
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }

      // Inject latency warnings
      if (latencyMs > 150 && Math.random() < 0.45) {
        tempPackets.push({
          id: `latency-${Math.random()}`,
          node: 'MESH-DELAY',
          event: `⏱️ [LATENCY SPIKE] Packet transmit latency: ${latencyMs}ms. Routing over multi-hop path.`,
          status: 'SLOW HOP',
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }

      // Inject synthetic corruption alerts
      if (syntheticCorruptionActive && Math.random() < 0.5) {
        tempPackets.push({
          id: `corrupt-${Math.random()}`,
          node: 'LORA-CORRUPT',
          event: `💥 [CRC CHECKSUM FAILURE] Bit-flip detected. Dropped fragment. Triggering error-correction flow... SUCCESS: Fragment recovered.`,
          status: 'CRC RECOVERED',
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }

      for (let i = 0; i < batchCount; i++) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        tempPackets.push({
          id: `norm-${Math.random()}`,
          node: randomNode,
          event: randomEvent,
          status: packetLoss > 30 && Math.random() < 0.3 ? 'DROPPED_FRAG' : 'BATCHED RELAY OK',
          time: timestamp,
        });
      }

      // Push to the intermediate queue buffer
      bufferRef.current.push(...tempPackets);
    }, 400); // High-frequency stream fires every 400ms

    return () => clearInterval(pulseInterval);
  }, [isEmergency, packetLoss, latencyMs, syntheticCorruptionActive]);

  // Telemetry Debouncer/Bundler: periodic flush of buffer to the visible state to reduce browser rendering cycles
  useEffect(() => {
    const bundlingInterval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        setPackets((prev) => {
          const updated = [...bufferRef.current, ...prev];
          return updated.slice(0, 1000); // Retain at most 1000 items
        });
        bufferRef.current = [];
      }
    }, bundlingIntervalMs); // User-configured debounce delay interval

    return () => clearInterval(bundlingInterval);
  }, [bundlingIntervalMs]);

  return { packets };
}
