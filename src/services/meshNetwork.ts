/**
 * Robust Mesh Network Telemetry Fetch Service.
 * Implements global try-catch exception handling and default standby fallback payloads
 * to guarantee that client-side components do not crash during mesh network outages.
 *
 * ఏపిఐ లేదా నెట్వర్క్ ఫెచ్ సర్వీస్ లో ఎలాంటి నెట్వర్క్ బ్రేక్ డౌన్ జరిగినా యాప్ క్రాష్ అవ్వకుండా try-catch మరియు డెఫాల్ట్ ఫాల్బ్యాక్ డేటా.
 */

export interface MeshTelemetryPayload {
  activeNodes: number;
  relayQuality: number;
  status: string;
  [key: string]: any;
}

export interface MeshTelemetryResponse {
  success: boolean;
  payload: MeshTelemetryPayload;
  error?: string;
}

export async function fetchMeshTelemetry(): Promise<MeshTelemetryResponse> {
  try {
    const response = await fetch('/api/v1/mesh');
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, payload: data };
  } catch (error: any) {
    // English & Telugu logging for high-visibility debugging:
    console.error("[Fail-Safe Recovery] Network fault intercepted / నెట్వర్క్ లోపం గుర్తించబడింది:", error?.message || error);

    // Graceful degradation: return default standby operational data instead of throwing a crash-inducing error
    return {
      success: false,
      payload: {
        activeNodes: 1204,
        relayQuality: 98.4,
        status: "STANDBY"
      },
      error: error?.message || String(error)
    };
  }
}

/**
 * Safer evacuation POST trigger with robust try-catch error boundaries.
 */
export async function triggerEvacuationAPI(sectorId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`/api/evacuate/${sectorId}`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Fetch failed with status: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("[Fail-Safe Recovery] Critical API Error Bound intercepted:", error?.message || error);
    return { success: false, error: error?.message || String(error) }; // Prevent app crash
  }
}
