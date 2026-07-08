import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StadiumMap from './components/StadiumMap';
import { StadiumSector } from './types';

describe('StadiumMap Component Suite', () => {
  const mockSectors: StadiumSector[] = [
    { id: 'gate-a', name: 'Gate A (North VIP)', currentDensity: 15, flowRate: 20, queueTimeMin: 5, status: 'normal', concessionsWaitMin: 4, restroomsWaitMin: 3, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'gate-b', name: 'Gate B (East Metro)', currentDensity: 45, flowRate: 85, queueTimeMin: 18, status: 'normal', concessionsWaitMin: 12, restroomsWaitMin: 8, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'gate-c', name: 'Gate C (South Plaza)', currentDensity: 75, flowRate: 110, queueTimeMin: 25, status: 'congested', concessionsWaitMin: 18, restroomsWaitMin: 12, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'gate-d', name: 'Gate D (West Rideshare)', currentDensity: 90, flowRate: 150, queueTimeMin: 40, status: 'critical', concessionsWaitMin: 22, restroomsWaitMin: 15, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'stand-north', name: 'North Stand', currentDensity: 10, flowRate: 5, queueTimeMin: 0, status: 'normal', concessionsWaitMin: 2, restroomsWaitMin: 2, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'stand-east', name: 'East Stand', currentDensity: 35, flowRate: 15, queueTimeMin: 0, status: 'normal', concessionsWaitMin: 5, restroomsWaitMin: 5, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'stand-south', name: 'South Stand', currentDensity: 65, flowRate: 40, queueTimeMin: 0, status: 'congested', concessionsWaitMin: 10, restroomsWaitMin: 10, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
    { id: 'stand-west', name: 'West Stand', currentDensity: 95, flowRate: 95, queueTimeMin: 0, status: 'critical', concessionsWaitMin: 15, restroomsWaitMin: 15, accessibilityFeatures: [], activeSignageMessage: '', signageCommandSent: '' },
  ];

  test('Renders StadiumMap title and default legend correctly', () => {
    const onSelectSectorMock = vi.fn();
    render(
      <StadiumMap
        sectors={mockSectors}
        selectedSectorId="gate-b"
        onSelectSector={onSelectSectorMock}
        stepFreeRouting={false}
        theme="dark"
        language="en"
      />
    );

    expect(screen.getByText(/Live Arena Heatmap/i)).toBeTruthy();
    expect(screen.getByText(/Estadio Azteca — High-fidelity SVG Flow Grid/i)).toBeTruthy();
    expect(screen.getByText(/PITCH/i)).toBeTruthy();
  });

  test('Renders in Hindi (hi) correctly', () => {
    const onSelectSectorMock = vi.fn();
    render(
      <StadiumMap
        sectors={mockSectors}
        selectedSectorId="gate-b"
        onSelectSector={onSelectSectorMock}
        stepFreeRouting={false}
        theme="dark"
        language="hi"
      />
    );

    expect(screen.getByText(/लाइव एरिना हीटमैप/i)).toBeTruthy();
    expect(screen.getByText(/मैदान/i)).toBeTruthy();
  });

  test('Renders in Telugu (te) correctly', () => {
    const onSelectSectorMock = vi.fn();
    render(
      <StadiumMap
        sectors={mockSectors}
        selectedSectorId="gate-b"
        onSelectSector={onSelectSectorMock}
        stepFreeRouting={false}
        theme="dark"
        language="te"
      />
    );

    expect(screen.getByText(/లైవ్ అరేనా హీట్‌మ్యాప్/i)).toBeTruthy();
  });

  test('Triggers onSelectSector when a sector is clicked', () => {
    const onSelectSectorMock = vi.fn();
    const { container } = render(
      <StadiumMap
        sectors={mockSectors}
        selectedSectorId={null}
        onSelectSector={onSelectSectorMock}
        stepFreeRouting={false}
        theme="dark"
        language="en"
      />
    );

    // Locate the Sector path elements using container query selector
    const gateAPath = container.querySelector('path[aria-label*="Gate A"]');
    expect(gateAPath).toBeTruthy();

    fireEvent.click(gateAPath!);
    expect(onSelectSectorMock).toHaveBeenCalledWith('gate-a');
  });

  test('Displays Step-free routing banner when active', () => {
    const onSelectSectorMock = vi.fn();
    render(
      <StadiumMap
        sectors={mockSectors}
        selectedSectorId="gate-b"
        onSelectSector={onSelectSectorMock}
        stepFreeRouting={true}
        theme="light"
        language="en"
      />
    );

    expect(screen.getByText(/Step-free routing active/i)).toBeTruthy();
  });
});
