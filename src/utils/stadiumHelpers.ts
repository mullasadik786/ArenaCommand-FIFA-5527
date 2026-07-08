/**
 * Strict FIFA 2026 Congestion Analyzer.
 * Separates concerns by decoupling mathematical congestion thresholds
 * from the React UI rendering loops.
 */
export const analyzeDensitySeverity = (density: number): 'CRITICAL' | 'CONGESTED' | 'MODERATE' | 'NORMAL' => {
  if (density > 85) {
    return 'CRITICAL';
  }
  if (density > 60) {
    return 'CONGESTED';
  }
  if (density > 30) {
    return 'MODERATE';
  }
  return 'NORMAL';
};

export interface SafePADraft {
  EN: string;
  ES: string;
  [key: string]: string;
}

/**
 * Safe Multilingual PA Announcement Generator.
 * decoupled helper function.
 *
 * @param gateId Name or identifier of the sector/gate.
 * @param status Status of operations.
 */
export const generateSafePADraft = (gateId: string = 'GATE-B', status: string = 'NORMAL'): SafePADraft => {
  const gate = String(gateId || 'GATE-B').toUpperCase();
  const cleanStatus = String(status || 'NORMAL').toUpperCase();

  return {
    EN: `Attention fans near ${gate}: Operations status is currently ${cleanStatus}.`,
    ES: `Atención aficionados cerca de la ${gate}: El estado de las operaciones es ${cleanStatus}.`
  };
};
