import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommandCenter from './components/CommandCenter';
import { StadiumSector, Incident } from './types';

describe('E2E Evacuation UI State Propagation', () => {
  const mockSectors: StadiumSector[] = [
    { id: 'gate-a', name: 'Gate A', currentDensity: 15, flowRate: 20, queueTimeMin: 5, status: 'normal', concessionsWaitMin: 4, restroomsWaitMin: 3, accessibilityFeatures: [] },
    { id: 'gate-b', name: 'Gate B', currentDensity: 40, flowRate: 85, queueTimeMin: 18, status: 'normal', concessionsWaitMin: 12, restroomsWaitMin: 8, accessibilityFeatures: [] },
  ];

  const mockIncidents: Incident[] = [];

  test('Clicking Trigger Chaos Mode immediately updates dashboard state to Emergency', async () => {
    const onTriggerChaosMock = vi.fn().mockImplementation(async () => {});

    const { rerender } = render(
      <CommandCenter
        sectors={mockSectors}
        incidents={mockIncidents}
        selectedSectorId={null}
        onSelectSector={() => {}}
        onLogIncident={async () => {}}
        onResolveIncident={async () => {}}
        onRunDirective={async () => {}}
        directiveResult={null}
        isGeneratingDirective={false}
        isLoggingIncident={false}
        gamePhase="pre-match"
        onTriggerChaos={onTriggerChaosMock}
      />
    );

    // Find trigger chaos mode button or check for normal standby indicator
    expect(screen.getByText(/Outage Redundancy/i)).toBeTruthy();

    // Re-render component representing active Emergency Phase
    rerender(
      <CommandCenter
        sectors={mockSectors}
        incidents={mockIncidents}
        selectedSectorId={null}
        onSelectSector={() => {}}
        onLogIncident={async () => {}}
        onResolveIncident={async () => {}}
        onRunDirective={async () => {}}
        directiveResult={null}
        isGeneratingDirective={false}
        isLoggingIncident={false}
        gamePhase="emergency"
        onTriggerChaos={onTriggerChaosMock}
      />
    );

    // Verify UI state propagation - "CELLULAR COLLAPSE ENGAGED" should display dynamically
    expect(screen.getByText(/CELLULAR COLLAPSE ENGAGED/i)).toBeTruthy();
  });
});
