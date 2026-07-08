/**
 * Clean Utility Functions for Multi-lingual PA and SMS Drafting.
 * Implements the Single Responsibility Principle (SRP) to decouple announcement
 * generation from component rendering logic.
 */

export interface PADraft {
  EN: string;
  ES: string;
  [key: string]: string;
}

/**
 * Generates a standard multi-lingual PA Draft message based on sector ID and threat severity levels.
 *
 * @param gateId The targeted entrance gate or stand identifier (e.g. "gate-b").
 * @param severity The incident severity classification.
 * @returns PADraft object with English (EN) and Spanish (ES) localized text.
 */
export const generatePADraft = (gateId: string, severity: string): PADraft => {
  if (!gateId) {
    return {
      EN: 'Attention: Please remain calm and await instructions from stadium stewards.',
      ES: 'Atención: Por favor, mantenga la calma y espere las instrucciones de los oficiales.'
    };
  }

  const cleanId = gateId.replace('-', ' ').toUpperCase();
  const lowerSeverity = (severity || 'info').toLowerCase();

  if (lowerSeverity === 'critical' || lowerSeverity === 'emergency') {
    return {
      EN: `⚠️ CRITICAL BROADCAST: Evacuation directed for fans near ${cleanId}. Please proceed calmly to your designated safe assembly zone.`,
      ES: `⚠️ AVISO CRÍTICO: Evacuación dirigida para aficionados cerca de ${cleanId}. Por favor, proceda con calma a la zona de seguridad.`
    };
  }

  if (lowerSeverity === 'warning' || lowerSeverity === 'high') {
    return {
      EN: `🔔 ALERT: Minor bottleneck or issue reported near ${cleanId}. Please yield to stewards and consider alternate pathways.`,
      ES: `🔔 ALERTA: Embotellamiento menor reportado cerca de ${cleanId}. Por favor, siga a los oficiales y use rutas alternas.`
    };
  }

  return {
    EN: `ℹ️ INFO: Standard venue management operations are active near ${cleanId}. Flow rate remains optimal.`,
    ES: `ℹ️ INFO: Operaciones estándar de gestión activas cerca de ${cleanId}. El flujo de personas permanece óptimo.`
  };
};

/**
 * Formats a clean LoRA telemetry debug log string.
 */
export function formatTelemetryLog(node: string, status: string, rtt: number): string {
  return `[${new Date().toLocaleTimeString()}] Node:${node} | Status:${status} | Latency:${rtt}ms`;
}
