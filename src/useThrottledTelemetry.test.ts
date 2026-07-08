import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottledTelemetry } from './hooks/useThrottledTelemetry';

describe('useThrottledTelemetry Hook Suite', () => {
  test('buffers and throttles high-frequency packets successfully', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ stream }) => useThrottledTelemetry(stream),
      { initialProps: { stream: 'packet-1' } }
    );

    // Initial state should be empty because throttling interval hasn't fired
    expect(result.current).toEqual([]);

    // Push high-frequency packet 2
    rerender({ stream: 'packet-2' });

    // Advance timer by 2 seconds to trigger bundling interval
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Both packets should be batched and returned
    expect(result.current).toEqual(['packet-1', 'packet-2']);

    // Push packet 3
    rerender({ stream: 'packet-3' });

    // Advance by another 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current).toEqual(['packet-1', 'packet-2', 'packet-3']);

    vi.useRealTimers();
  });

  test('retains at most 30 packets in memory', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ stream }) => useThrottledTelemetry(stream),
      { initialProps: { stream: 'initial' } }
    );

    // Render 40 packets in sequence
    for (let i = 1; i <= 40; i++) {
      rerender({ stream: `packet-${i}` });
    }

    // Trigger bundling
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should slice and keep at most the last 30 packets in the array
    expect(result.current.length).toBe(30);
    expect(result.current[0]).toBe('packet-11'); // 40 - 30 + 1 = 11
    expect(result.current[29]).toBe('packet-40');

    vi.useRealTimers();
  });
});
