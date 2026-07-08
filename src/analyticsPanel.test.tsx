import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AnalyticsPanel from './components/AnalyticsPanel';
import { StadiumState } from './types';

// Mock Recharts to avoid SVG size rendering issues in test environment
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
    Area: () => <div data-testid="area" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Cell: () => <div data-testid="cell" />,
  };
});

describe('AnalyticsPanel Component Suite', () => {
  const mockState: StadiumState = {
    gamePhase: 'pre-match',
    matchDetails: {
      teams: 'Mexico vs Argentina',
      score: '0 - 0',
      timeElapsed: 'Gates Open',
      stadiumName: 'Estadio Azteca',
      attendance: '83,412',
      capacity: '87,523',
    },
    sectors: [
      { id: 'gate-a', name: 'Gate A (North VIP)', currentDensity: 15, flowRate: 20, queueTimeMin: 5, status: 'normal', concessionsWaitMin: 4, restroomsWaitMin: 3, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
      { id: 'gate-b', name: 'Gate B (East Metro)', currentDensity: 45, flowRate: 85, queueTimeMin: 18, status: 'normal', concessionsWaitMin: 12, restroomsWaitMin: 8, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    ],
    incidents: [
      { id: 'inc-1', sectorId: 'gate-b', type: 'Turnstile jam', description: 'Reader failed', timestamp: '', severity: 'medium', recommendations: '', dispatchSms: '', resolved: false, paAnnouncementDrafts: { en: '', es: '', fr: '', ar: '' } },
    ],
    activeDispatches: [],
    parkingSpots: [],
    networkState: { packetLoss: 0, latencyMs: 5, resilienceModeActive: false, meshRelayQuality: 100, syntheticCorruptionActive: false },
    blockchainReceipts: [],
    announcements: [],
    concessionOrders: [],
    fanCamPhotos: [],
  };

  test('Renders panel headings, match details, and metrics correctly', () => {
    const onPhaseChangeMock = vi.fn();
    const onTriggerChaosMock = vi.fn();

    render(
      <AnalyticsPanel
        stadiumState={mockState}
        onPhaseChange={onPhaseChangeMock}
        onTriggerChaos={onTriggerChaosMock}
        theme="dark"
        language="en"
      />
    );

    expect(screen.getByText(/Gameday Phase Controller/i)).toBeTruthy();
    expect(screen.getByText(/Mexico vs Argentina/i)).toBeTruthy();
    expect(screen.getByText(/83,412/i)).toBeTruthy();
    expect(screen.getByText(/1 Unresolved/i)).toBeTruthy();
  });

  test('Triggers phase change callback when clicking a phase button', () => {
    const onPhaseChangeMock = vi.fn();
    const { container } = render(
      <AnalyticsPanel
        stadiumState={mockState}
        onPhaseChange={onPhaseChangeMock}
        theme="dark"
        language="en"
      />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const halftimeButton = buttons.find(b => b.textContent?.includes('Halftime'));
    expect(halftimeButton).toBeTruthy();

    fireEvent.click(halftimeButton!);
    expect(onPhaseChangeMock).toHaveBeenCalledWith('halftime');
  });

  test('Triggers chaos simulation callback when clicking trigger chaos button', () => {
    const onTriggerChaosMock = vi.fn();
    const { container } = render(
      <AnalyticsPanel
        stadiumState={mockState}
        onPhaseChange={vi.fn()}
        onTriggerChaos={onTriggerChaosMock}
        theme="dark"
        language="en"
      />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const chaosBtn = buttons.find(b => b.textContent?.includes('Trigger Chaos'));
    expect(chaosBtn).toBeTruthy();

    fireEvent.click(chaosBtn!);
    expect(onTriggerChaosMock).toHaveBeenCalled();
  });

  test('Updates network profile degradation mode successfully', () => {
    const { container } = render(
      <AnalyticsPanel
        stadiumState={mockState}
        onPhaseChange={vi.fn()}
        theme="dark"
        language="en"
      />
    );

    // Default profile is 5G Broadband, select LoRA Failover
    const buttons = Array.from(container.querySelectorAll('button'));
    const loraBtn = buttons.find(b => b.textContent?.includes('LoRA Failover'));
    expect(loraBtn).toBeTruthy();

    fireEvent.click(loraBtn!);

    // Expecting LoRA warnings to render
    expect(screen.getByText(/LoRA TEXT-ONLY EMERGENCY OVERRIDE ACTIVE/i)).toBeTruthy();
    expect(screen.getByText(/LOW-BANDWIDTH TELEMETRY PACKET DISPATCHER/i)).toBeTruthy();
  });

  test('Virtual bot generator slider updates bot target count', () => {
    render(
      <AnalyticsPanel
        stadiumState={mockState}
        onPhaseChange={vi.fn()}
        theme="dark"
        language="en"
      />
    );

    const slider = screen.getByLabelText(/Target Virtual Fans Load:/i);
    expect(slider).toBeTruthy();

    fireEvent.change(slider, { target: { value: '50000' } });
    expect(screen.getByText(/50,000 Fans/i)).toBeTruthy();
  });

  test('Runs load test and increases metrics', () => {
    vi.useFakeTimers();
    const { container } = render(
      <AnalyticsPanel
        stadiumState={mockState}
        onPhaseChange={vi.fn()}
        theme="dark"
        language="en"
      />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const launchBtn = buttons.find(b => b.textContent?.includes('Launch'));
    expect(launchBtn).toBeTruthy();

    fireEvent.click(launchBtn!);

    // Check loading state shows up
    expect(screen.getByText(/Flooding Server with Virtual Bots/i)).toBeTruthy();

    // Advance timers to trigger progress increases
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Clean up mock timers
    vi.useRealTimers();
  });
});
