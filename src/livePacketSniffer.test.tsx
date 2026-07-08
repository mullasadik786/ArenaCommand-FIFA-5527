import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LivePacketSniffer, { LivePacketLog } from './components/LivePacketSniffer';

describe('LivePacketSniffer Component Suite', () => {
  test('Renders placeholder when there are no logs', () => {
    render(<LivePacketSniffer logs={[]} />);
    expect(screen.getByText(/No packets currently snuffed/i)).toBeTruthy();
  });

  test('Renders and reverses up to 20 logs correctly', () => {
    // Generate 25 mock packet logs
    const mockLogs: LivePacketLog[] = Array.from({ length: 25 }).map((_, idx) => ({
      timestamp: `18:00:${String(idx).padStart(2, '0')}`,
      message: `Telemetry Signal Packet #${idx}`
    }));

    render(<LivePacketSniffer logs={mockLogs} />);

    // Since we slice the last 20 logs and reverse them:
    // Index 24 should be first, index 5 should be last
    const elements = screen.getAllByText(/Telemetry Signal Packet/);
    expect(elements.length).toBe(20);

    // Newest log should be at the top
    expect(elements[0].textContent).toContain('Telemetry Signal Packet #24');
    // Oldest displayed log (from last 20) should be at the bottom
    expect(elements[19].textContent).toContain('Telemetry Signal Packet #5');
  });
});
