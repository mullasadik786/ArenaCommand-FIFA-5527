import { Incident } from '../types';

interface IncidentClassification {
  fifaTag: string;
  fifaDesc: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * SRP Core Concern 1 (Calculations & Mapping):
 * Evaluates the incident's textual details and photo analysis to determine
 * the correct FIFA classification tag, official description, and default severity.
 * Evaluates in high-to-low priority order to ensure life-safety and structural alerts take precedence.
 */
export function classifyIncident(
  type: string,
  description: string,
  photoAnalysis?: string
): IncidentClassification {
  const combinedText = `${type} ${description} ${photoAnalysis || ''}`.toLowerCase();

  // Priority 1: Facilities Integrity & Structural Defect
  if (
    combinedText.includes('crack') ||
    combinedText.includes('structural') ||
    combinedText.includes('damage') ||
    combinedText.includes('collapse')
  ) {
    return {
      fifaTag: "FIFA-SEC-CLASS-103-STR",
      fifaDesc: "Facilities Integrity & Structural Defect",
      severity: 'critical'
    };
  }

  // Priority 2: Life-Safety Emergency & First Aid Response
  if (
    combinedText.includes('medical') ||
    combinedText.includes('distress') ||
    combinedText.includes('heart') ||
    combinedText.includes('unconscious') ||
    combinedText.includes('injury') ||
    combinedText.includes('cardiac') ||
    combinedText.includes('chest pain') ||
    combinedText.includes('faint')
  ) {
    return {
      fifaTag: "FIFA-SEC-CLASS-102-MED",
      fifaDesc: "Life-Safety Emergency & First Aid Response",
      severity: 'critical'
    };
  }

  // Priority 3: Access Control & Spectator Conduct Violation
  if (
    combinedText.includes('fight') ||
    combinedText.includes('scuffle') ||
    combinedText.includes('riot') ||
    combinedText.includes('altercation') ||
    combinedText.includes('violence') ||
    combinedText.includes('stewards') ||
    combinedText.includes('security')
  ) {
    return {
      fifaTag: "FIFA-SEC-CLASS-105-VIO",
      fifaDesc: "Access Control & Spectator Conduct Violation",
      severity: 'high'
    };
  }

  // Priority 4: Spectator Safety & Slip/Fall Hazard
  if (
    combinedText.includes('slip') ||
    combinedText.includes('fall') ||
    combinedText.includes('spill') ||
    combinedText.includes('leak') ||
    combinedText.includes('hazard')
  ) {
    return {
      fifaTag: "FIFA-SEC-CLASS-104-HAZ",
      fifaDesc: "Spectator Safety & Slip/Fall Hazard",
      severity: 'low'
    };
  }

  // Priority 5: FIFA Gate Clear Bag Compliance Patrol
  if (
    combinedText.includes('bag') ||
    combinedText.includes('policy') ||
    combinedText.includes('clear bag') ||
    combinedText.includes('size') ||
    combinedText.includes('compliance')
  ) {
    return {
      fifaTag: "FIFA-SEC-CLASS-101-BAG",
      fifaDesc: "FIFA Gate Clear Bag Compliance Patrol",
      severity: 'medium'
    };
  }

  // Priority 6: Standard Venue Operations & Crowd Flow
  return {
    fifaTag: "FIFA-SEC-CLASS-101-GEN",
    fifaDesc: "Standard Venue Operations & Crowd Flow",
    severity: 'medium'
  };
}

/**
 * SRP Core Concern 2 (Formatting):
 * Construct detailed, professional, compliance-validated operational guidelines
 * and recommendations based on the FIFA classification tag and current sector.
 */
export function formatRecommendations(
  fifaTag: string,
  sectorId: string,
  baseRecommendations: string
): string {
  const cleanSector = sectorId.toUpperCase();
  const complianceHeader = `Compliance Reference: [${fifaTag}] under protocol FIFA-SEC-ANNEX-2026.\n\n`;

  if (fifaTag === 'FIFA-SEC-CLASS-103-STR') {
    return `🚨 CRITICAL STRUCTURAL RISK IDENTIFIED VIA LoRA PHOTOMETRIC LAYERS [${fifaTag}]:
- IMMEDIATELY initiate localized evacuation of Sector ${cleanSector}.
- Deploy auxiliary shoring/bracing stewards. Keep lines of communication on failover mesh.
- Barricade the immediate danger radius. Compliance: FIFA-SEC-ANNEX-2026.\n\n${baseRecommendations}`;
  }

  if (fifaTag === 'FIFA-SEC-CLASS-102-MED') {
    return `🚑 MEDICAL EMERGENCY PRIORITIZED (HIGH RISK PATIENT) [${fifaTag}]:
- Dispatch FIFA Red Cross triage squad immediately to Sector ${cleanSector} seating coordinates.
- Bring portable AED.
- Coordinate Gate A (North Access) ambulance transfer pathway. Compliance: FIFA-SEC-ANNEX-2026.\n\n${baseRecommendations}`;
  }

  return complianceHeader + baseRecommendations;
}

/**
 * SRP Core Concern 3 (Localization Formatting):
 * Generates default multi-lingual (English, Spanish, French, Arabic) PA announcement
 * drafts to ensure smooth, calm venue communications during the incident.
 */
export function generateMultilingualPADrafts(
  sectorId: string,
  type: string,
  description: string
): Incident['paAnnouncementDrafts'] {
  const cleanSector = sectorId.toUpperCase();
  const lowerDesc = description.toLowerCase();
  const lowerType = type.toLowerCase();
  const combined = `${lowerType} ${lowerDesc}`;

  if (
    combined.includes('medical') ||
    combined.includes('injur') ||
    combined.includes('faint') ||
    combined.includes('cardiac') ||
    combined.includes('heart') ||
    combined.includes('distress') ||
    combined.includes('pain')
  ) {
    return {
      en: `Medical assistance has been dispatched to Sector ${cleanSector}. Please keep walkways clear for emergency personnel.`,
      es: `La asistencia médica ha sido enviada al Sector ${cleanSector}. Por favor, mantenga los pasillos despejados.`,
      fr: `Une assistance médicale a été envoyée au secteur ${cleanSector}. Veuillez laisser les passages libres.`,
      ar: `تم إرسال المساعدة الطبية إلى القطاع ${cleanSector}. يرجى الحفاظ على الممرات خالية.`
    };
  }

  if (
    combined.includes('fight') ||
    combined.includes('security') ||
    combined.includes('crowd') ||
    combined.includes('lock') ||
    combined.includes('stuck') ||
    combined.includes('surge') ||
    combined.includes('barrier') ||
    combined.includes('pressure')
  ) {
    return {
      en: `Attention fans near Sector ${cleanSector}: Please proceed slowly and follow stadium stewards directions. Thank you.`,
      es: `Atención aficionados cerca del Sector ${cleanSector}: Por favor, avancen despacio y sigan las indicaciones del personal.`,
      fr: `Attention aux supporters près du secteur ${cleanSector}: Veuillez avancer lentement et suivre les instructions des stadiers.`,
      ar: `انتباه للجماهير بالقرب من القطاع ${cleanSector}: يرجى التقدم ببطء واتباع توجيهات مشرفي الملعب.`
    };
  }

  if (
    combined.includes('spill') ||
    combined.includes('water') ||
    combined.includes('slip') ||
    combined.includes('leak')
  ) {
    return {
      en: `Please proceed with caution in Sector ${cleanSector} due to a temporary clean-up operation.`,
      es: `Por favor, transite con precaución en el Sector ${cleanSector} debido a labores de limpieza.`,
      fr: `Veuillez marcher prudemment dans le secteur ${cleanSector} en raison d'une opération de nettoyage temporaire.`,
      ar: `يرجى توخي الحذر في القطاع ${cleanSector} بسبب عملية تنظيف مؤقتة.`
    };
  }

  // Default General Notice
  return {
    en: `Stadium stewards are currently resolving a minor operational notice in Sector ${cleanSector}. We appreciate your patience.`,
    es: `El personal está resolviendo un aviso operativo menor en el Sector ${cleanSector}. Agradecemos su paciencia.`,
    fr: `Le personnel du stade résout actuellement un incident opérationnel mineur dans le secteur ${cleanSector}. Merci pour votre patience.`,
    ar: `يقوم مشرفو الملعب حالياً بحل مشكلة تشغيلية بسيطة في القطاع ${cleanSector}. نحن نقدر صبركم.`
  };
}
