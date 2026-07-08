import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import crypto from 'crypto';
import { StadiumState, StadiumSector, Incident, Announcement, StaffDispatch, BlockchainReceipt } from './src/types';
import { classifyIncident, formatRecommendations, generateMultilingualPADrafts } from './src/utils/incidentClassifier';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable strict security headers, configuring Content Security Policy (CSP) to deny
// unauthorized script injections (preventing XSS) while allowing smooth Vite development rendering
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(express.json({ limit: '50kb' })); // Limit body payload size to prevent DoS

// Custom resilient in-memory rate limiting map with automatic periodic pruning to prevent memory exhaustion
const ipRequestCounts = new Map<string, { count: number; firstRequestTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 150; // 150 requests/minute

// Periodic pruning interval (runs every 5 minutes) to securely garbage collect inactive IPs
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestCounts.entries()) {
    if (now - record.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
      ipRequestCounts.delete(ip);
    }
  }
}, 300000).unref();

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  const now = Date.now();

  const record = ipRequestCounts.get(ip);
  if (!record) {
    ipRequestCounts.set(ip, { count: 1, firstRequestTime: now });
    next();
  } else {
    if (now - record.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
      // Reset window
      ipRequestCounts.set(ip, { count: 1, firstRequestTime: now });
      next();
    } else {
      record.count += 1;
      if (record.count > MAX_REQUESTS_PER_WINDOW) {
        res.status(429).json({ error: 'Too many requests from this client. Please retry in 1 minute.' });
      } else {
        next();
      }
    }
  }
};

// Apply custom rate limiter to all API routes
app.use('/api/', rateLimiter);

// In-Memory Stadium State
let stadiumState: StadiumState = {
  gamePhase: 'pre-match',
  matchDetails: {
    teams: 'Mexico vs France',
    score: '0 - 0',
    timeElapsed: 'Gates Open',
    stadiumName: 'Estadio Azteca, Mexico City',
    attendance: '83,412',
    capacity: '87,523',
  },
  sectors: [
    { id: 'gate-a', name: 'Gate A (North VIP & Accessibility)', currentDensity: 15, flowRate: 20, queueTimeMin: 5, status: 'normal', concessionsWaitMin: 4, restroomsWaitMin: 3, accessibilityFeatures: ['ADA Ramps', 'Low-sensory Lane', 'Concourse Elevators'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_A' },
    { id: 'gate-b', name: 'Gate B (East Metro Transit Hub)', currentDensity: 40, flowRate: 85, queueTimeMin: 18, status: 'normal', concessionsWaitMin: 12, restroomsWaitMin: 8, accessibilityFeatures: ['Metro Hub Elevators'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_B' },
    { id: 'gate-c', name: 'Gate C (South Plaza & Fan Zone)', currentDensity: 30, flowRate: 50, queueTimeMin: 10, status: 'normal', concessionsWaitMin: 15, restroomsWaitMin: 6, accessibilityFeatures: ['Stroller Valet', 'Level Access'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_C' },
    { id: 'gate-d', name: 'Gate D (West Rideshare Plaza)', currentDensity: 20, flowRate: 35, queueTimeMin: 8, status: 'normal', concessionsWaitMin: 8, restroomsWaitMin: 5, accessibilityFeatures: ['Rideshare ADA ramp'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_D' },
    { id: 'stand-north', name: 'North Stand Concourse', currentDensity: 25, flowRate: 15, queueTimeMin: 0, status: 'normal', concessionsWaitMin: 10, restroomsWaitMin: 12, accessibilityFeatures: ['Level 100 ADA Seating'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_N' },
    { id: 'stand-east', name: 'East Stand Concourse', currentDensity: 35, flowRate: 20, queueTimeMin: 0, status: 'normal', concessionsWaitMin: 14, restroomsWaitMin: 15, accessibilityFeatures: ['Level 200 Companion seats'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_E' },
    { id: 'stand-south', name: 'South Stand Concourse', currentDensity: 28, flowRate: 18, queueTimeMin: 0, status: 'normal', concessionsWaitMin: 18, restroomsWaitMin: 10, accessibilityFeatures: ['Level 100 ADA Seating'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_S' },
    { id: 'stand-west', name: 'West Stand Concourse', currentDensity: 22, flowRate: 12, queueTimeMin: 0, status: 'normal', concessionsWaitMin: 8, restroomsWaitMin: 8, accessibilityFeatures: ['Concourse Elevator Access'], activeSignageMessage: 'WELCOME TO ESTADIO AZTECA. Have a safe match.', signageCommandSent: 'PUSH_API_SUCCESS: SENT TO SIGN_NODE_W' },
  ],
  incidents: [
    {
      id: 'inc-1',
      sectorId: 'gate-b',
      type: 'Turnstile Congestion',
      description: 'Turnstile #4 scanner is intermittently failing, creating a line backlog near the Metro connection.',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      severity: 'medium',
      recommendations: 'Deploy secondary manual scanner volunteers to Turnstile 4. Display mobile ticketing reminder on queue monitors. Redirect general ticket holders to Gate B Auxiliary Lanes 7 & 8.',
      dispatchSms: 'INFO: Backlog at Gate B Turnstile 4. Manual scanners dispatched. Reroute backup to lanes 7-8. Confirm status on arrival.',
      paAnnouncementDrafts: {
        en: 'Attention fans entering through Gate B: Please have your digital ticket barcode open and screen brightness set to high. For faster entry, lanes 7 and 8 are now available.',
        es: 'Atención aficionados en la Puerta B: Por favor, tengan listo el código de barras de su boleto digital con el brillo de pantalla al máximo. Para un acceso más rápido, las filas 7 y 8 ya están abiertas.',
        fr: 'Attention aux supporters entrant par la Porte B: Veuillez ouvrir votre code-barres de billet numérique et régler la luminosité au maximum. Les couloirs 7 et 8 sont ouverts pour un accès plus rapide.',
        ar: 'انتباه للجماهير الذين يدخلون من البوابة B: يرجى فتح الرمز الشريطي لتذكرتك الرقمية وضبط سطوع الشاشة على أعلى مستوى. للدخول الأسرع، الممرات 7 و 8 متاحة الآن.'
      },
      resolved: false
    },
    {
      id: 'inc-2',
      sectorId: 'stand-east',
      type: 'Spill Hazard',
      description: 'Soda and beer spill near food stall #12 in East Stand concourse causing slipping hazard.',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      severity: 'low',
      recommendations: 'Dispatch janitorial team to East Stand Concourse near Food Stall 12 with spill kit and "Caution: Wet Floor" signs. Notify food stall supervisor to use cardboard liners.',
      dispatchSms: 'CLEAN: Spill reported near East Stand Food Stall 12. Dispatch cleanup crew with signs immediately.',
      paAnnouncementDrafts: {
        en: 'Please exercise caution when walking through the East Stand Concourse near Food Stall 12. Cleaning staff are on site.',
        es: 'Por favor, camine con precaución en el pasillo de la Grada Este cerca del puesto de comida 12. El personal de limpieza ya está trabajando.',
        fr: 'Veuillez faire attention en marchant dans le hall de la tribune Est, près du stand de nourriture 12. L\'équipe de nettoyage est sur place.',
        ar: 'يرجى توخي الحذر عند المشي في ممر المدرج الشرقي بالقرب من كشك الطعام 12. طاقم التنظيف متواجد في الموقع.'
      },
      resolved: false
    }
  ],
  announcements: [
    { id: 'ann-1', text: 'Welcome to Estadio Azteca! Gates are now open. Kickoff is scheduled in 3 hours. Enjoy the pre-match Fan Festival at the South Plaza!', timestamp: new Date(Date.now() - 40 * 60000).toISOString() },
    { id: 'ann-2', text: 'Reminder: The FIFA World Cup 2026 operates under a strict clear bag policy. Bags larger than 12x6x12 inches are not permitted inside the venue.', timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
  ],
  concessionOrders: [],
  fanCamPhotos: [
    {
      id: 'cam-1',
      url: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&w=600&q=80',
      username: '@Charly_Azt',
      caption: 'Estadio Azteca is absolutely electric! Vamos Mexico! 🇲🇽⚽',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      likes: 242,
      jumbotronFeatured: true
    },
    {
      id: 'cam-2',
      url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      username: '@Fleur_Mondial',
      caption: 'Allez les Bleus! 🇫🇷 What an amazing stadium!',
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
      likes: 115,
      jumbotronFeatured: false
    }
  ],
  activeDispatches: [
    {
      id: 'disp-1',
      sectorId: 'gate-b',
      type: 'Turnstile Congestion Assist',
      stewards: ['Stew-412', 'Stew-221', 'Stew-089'],
      gpsCoordinates: { lat: 19.3029, lng: -99.1505 },
      status: 'dispatched',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString()
    }
  ],
  parkingSpots: [
    { id: 'lot-4', name: 'Lot 4 (North Bus & Shuttle Terminal)', totalSpots: 1500, availableSpots: 1042 },
    { id: 'lot-7', name: 'Lot 7 (West Rideshare Hub & Taxi Plaza)', totalSpots: 600, availableSpots: 112 }
  ],
  networkState: {
    packetLoss: 0,
    latencyMs: 24,
    resilienceModeActive: false,
    meshRelayQuality: 100,
    syntheticCorruptionActive: false
  },
  blockchainReceipts: [
    {
      hash: '6a4220b22a0df8d1c97a5b3a886f4a7c0627d353683a48ff0073bc289b5c301a',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      action: 'GENESIS_BLOCK',
      details: 'ArenaCommand FIFA 2026 Decentralized Ledger initialized. Root validation peer: github://stadium-operations/framework-main',
      blockNumber: 0
    },
    {
      hash: '8f276632c02059a43a0d33e9b106299b6422d0b27e8a93cb02a0a389fbc0015b',
      prevHash: '6a4220b22a0df8d1c97a5b3a886f4a7c0627d353683a48ff0073bc289b5c301a',
      timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
      action: 'SYSTEM_BOOT',
      details: 'Gameday Security and Crowd Flow monitoring modules deployed. Verifier active on 1,204 Edge LoRA mesh peers.',
      blockNumber: 1
    }
  ]
};

// Static Stadium Reference Guide for Gemini Grounding
const STADIUM_GUIDE = `
ESTADIO AZTECA FIFA 2026 STADIUM OPERATIONS GUIDE & FAQ

1. GATE & ACCESS SPECIFICATIONS:
   - Gate A (North): Dedicated for VIP, Premium hospitality, accredited media, and Accessibility (ADA). Ramps, Low-sensory express lanes, and dual escalators are fully functional here.
   - Gate B (East Transit Hub): Primary pedestrian entrance connected directly to the Azteca Metro/Light Rail Station. Highest peak density. Equipped with express lanes for fans without bags.
   - Gate C (South Plaza): Main family-friendly entry adjacent to the Fan Festival and official Merchandise Superstore. Excellent stroller valet services and face-painting booths.
   - Gate D (West Plaza): Best entry for rideshare dropoffs (Uber/Didi), taxis, and stadium charter buses. Has ADA wheelchair loan desks.

2. STADIUM RULES, SAFETY & BAG POLICY:
   - Bag Policy: Strictly Clear Bag Policy. Bags must be transparent plastic, vinyl, or PVC, and not exceed 12x6x12 inches (30x15x30 cm). Small clutch bags (maximum 4.5x6.5 inches) are allowed.
   - Water & Hydration: Free chilled drinking water refill stations are located in every concourse block (Concourse 102, 115, 204, 222). Fans can bring empty clear reusable plastic water bottles (up to 750ml). No metal or glass.
   - Prohibited Items: Umbrellas (ponchos are recommended), professional cameras (lenses > 3 inches), glass bottles, metal flasks, flares, whistles, vapes, outside food.
   - Strollers: Not permitted in the seats. Must be checked in at the stroller valets located at Gate C or Gate A Guest Services.

3. ACCESSIBILITY & SENSORY INCLUSION:
   - Calm Room: Located in Suite 204 (West Stand Level 2). A sound-dampened space for children or adults experiencing sensory overload. Sensory bags containing noise-canceling headphones, fidget tools, and visual schedule cards can be checked out free of charge at any Guest Services booth (Concourse 105, 212).
   - Audio Descriptive Commentary (ADC): Available on FM frequency 88.3 MHz for visually impaired fans. Recieving devices can be borrowed at Guest Services 105.
   - ADA Elevators: Located at Gate A (North), Gate B (East), and Concourse 112 (South), Concourse 134 (West).

4. CONCESSIONS & SUSTAINABILITY:
   - Concessions: "Azteca Flavors" serves tacos, quesadillas, and chips with halal and vegetarian/vegan choices. "Global Bites" serves burgers, fries, vegan hotdogs, and kosher chicken.
   - Cup Policy: Stadium operates a zero-single-use-plastic program. Drinks are served in reusable souvenir cups (50 MXN deposit). Return cups to any booth to get your refund, or take it home as a keepsake!
   - Sustainability: All waste must be sorted into Organic, Recyclable, and General bins. Azteca is powered by a 100% solar microgrid.

5. TRANSPORTATION & RETURNING HOME:
   - Metro/Light Rail: Direct bridge from Gate B to Azteca Station. Heavy pre/post-match rush. Trains run until 2:00 AM on game days.
   - Rideshare Zone: Lot 7 (outside Gate D). High post-match surge pricing. Fans are advised to wait in the South Fan Plaza until 45 minutes after final whistle to avoid gridlock.
   - Shuttle Bus: Free express shuttles from Lot 4 to Central City Hubs (Centro Histórico, Reforma, and Condesa).
`;

// Lazy Gemini Client Initialization
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Running in mock/fallback AI mode.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Cryptographic blockchain logger for post-incident insurance, safety auditing, and investigations
function addBlockchainReceipt(action: string, details: string) {
  const receipts = stadiumState.blockchainReceipts || [];
  const blockNumber = receipts.length;
  const prevHash = receipts.length > 0 ? receipts[0].hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const timestamp = new Date().toISOString();

  const hash = crypto.createHash('sha256')
    .update(`${blockNumber}-${prevHash}-${timestamp}-${action}-${details}`)
    .digest('hex');

  const newBlock: BlockchainReceipt = {
    hash,
    prevHash,
    timestamp,
    action,
    details,
    blockNumber
  };

  receipts.unshift(newBlock);
  stadiumState.blockchainReceipts = receipts;
}

// Mutate sectors based on game phase to simulate crowd flow
function applySimulationState(phase: StadiumState['gamePhase']) {
  stadiumState.gamePhase = phase;

  const sectors = stadiumState.sectors;
  const match = stadiumState.matchDetails;

  if (phase === 'pre-match') {
    match.timeElapsed = 'Gates Open';
    match.score = '0 - 0';

    // Gates are heavily loaded, seats are mostly empty
    sectors[0].currentDensity = 25; sectors[0].queueTimeMin = 8; sectors[0].flowRate = 35; sectors[0].status = 'normal';
    sectors[1].currentDensity = 78; sectors[1].queueTimeMin = 28; sectors[1].flowRate = 120; sectors[1].status = 'congested'; // Metro hub
    sectors[2].currentDensity = 62; sectors[2].queueTimeMin = 18; sectors[2].flowRate = 90; sectors[2].status = 'congested'; // Plaza
    sectors[3].currentDensity = 45; sectors[3].queueTimeMin = 12; sectors[3].flowRate = 55; sectors[3].status = 'normal';

    // Stands
    sectors[4].currentDensity = 15; sectors[4].flowRate = 10; sectors[4].concessionsWaitMin = 4; sectors[4].restroomsWaitMin = 3; sectors[4].status = 'normal';
    sectors[5].currentDensity = 20; sectors[5].flowRate = 12; sectors[5].concessionsWaitMin = 5; sectors[5].restroomsWaitMin = 4; sectors[5].status = 'normal';
    sectors[6].currentDensity = 18; sectors[6].flowRate = 8; sectors[6].concessionsWaitMin = 6; sectors[6].restroomsWaitMin = 3; sectors[6].status = 'normal';
    sectors[7].currentDensity = 14; sectors[7].flowRate = 5; sectors[7].concessionsWaitMin = 4; sectors[7].restroomsWaitMin = 3; sectors[7].status = 'normal';

  } else if (phase === 'first-half') {
    match.timeElapsed = '32\' (1st Half)';
    match.score = '1 - 0';

    // Gates are now clear, everyone is inside
    sectors[0].currentDensity = 8; sectors[0].queueTimeMin = 2; sectors[0].flowRate = 4; sectors[0].status = 'normal';
    sectors[1].currentDensity = 12; sectors[1].queueTimeMin = 3; sectors[1].flowRate = 8; sectors[1].status = 'normal';
    sectors[2].currentDensity = 10; sectors[2].queueTimeMin = 2; sectors[2].flowRate = 5; sectors[2].status = 'normal';
    sectors[3].currentDensity = 8; sectors[3].queueTimeMin = 2; sectors[3].flowRate = 4; sectors[3].status = 'normal';

    // Stands are active, concessions have small lines
    sectors[4].currentDensity = 82; sectors[4].flowRate = 5; sectors[4].concessionsWaitMin = 10; sectors[4].restroomsWaitMin = 8; sectors[4].status = 'normal';
    sectors[5].currentDensity = 85; sectors[5].flowRate = 6; sectors[5].concessionsWaitMin = 12; sectors[5].restroomsWaitMin = 10; sectors[5].status = 'normal';
    sectors[6].currentDensity = 80; sectors[6].flowRate = 5; sectors[6].concessionsWaitMin = 9; sectors[6].restroomsWaitMin = 7; sectors[6].status = 'normal';
    sectors[7].currentDensity = 84; sectors[7].flowRate = 4; sectors[7].concessionsWaitMin = 11; sectors[7].restroomsWaitMin = 9; sectors[7].status = 'normal';

  } else if (phase === 'halftime') {
    match.timeElapsed = 'Halftime';
    match.score = '1 - 0';

    // Gates empty
    sectors[0].currentDensity = 5; sectors[0].queueTimeMin = 1; sectors[0].flowRate = 2; sectors[0].status = 'normal';
    sectors[1].currentDensity = 8; sectors[1].queueTimeMin = 1; sectors[1].flowRate = 3; sectors[1].status = 'normal';
    sectors[2].currentDensity = 15; sectors[2].queueTimeMin = 2; sectors[2].flowRate = 10; sectors[2].status = 'normal';
    sectors[3].currentDensity = 6; sectors[3].queueTimeMin = 1; sectors[3].flowRate = 2; sectors[3].status = 'normal';

    // Stands concourse are CRITICALLY congested with halftime food/restroom rush!
    sectors[4].currentDensity = 92; sectors[4].flowRate = 85; sectors[4].concessionsWaitMin = 26; sectors[4].restroomsWaitMin = 22; sectors[4].status = 'critical';
    sectors[5].currentDensity = 95; sectors[5].flowRate = 92; sectors[5].concessionsWaitMin = 29; sectors[5].restroomsWaitMin = 25; sectors[5].status = 'critical';
    sectors[6].currentDensity = 88; sectors[6].flowRate = 78; sectors[6].concessionsWaitMin = 22; sectors[6].restroomsWaitMin = 18; sectors[6].status = 'congested';
    sectors[7].currentDensity = 90; sectors[7].flowRate = 80; sectors[7].concessionsWaitMin = 24; sectors[7].restroomsWaitMin = 20; sectors[7].status = 'congested';

  } else if (phase === 'second-half') {
    match.timeElapsed = '76\' (2nd Half)';
    match.score = '1 - 1';

    // Gates quiet
    sectors[0].currentDensity = 6; sectors[0].queueTimeMin = 1; sectors[0].flowRate = 3; sectors[0].status = 'normal';
    sectors[1].currentDensity = 15; sectors[1].queueTimeMin = 4; sectors[1].flowRate = 15; sectors[1].status = 'normal'; // early leavers
    sectors[2].currentDensity = 12; sectors[2].queueTimeMin = 3; sectors[2].flowRate = 10; sectors[2].status = 'normal';
    sectors[3].currentDensity = 10; sectors[3].queueTimeMin = 2; sectors[3].flowRate = 8; sectors[3].status = 'normal';

    // Stands
    sectors[4].currentDensity = 82; sectors[4].flowRate = 3; sectors[4].concessionsWaitMin = 8; sectors[4].restroomsWaitMin = 7; sectors[4].status = 'normal';
    sectors[5].currentDensity = 85; sectors[5].flowRate = 4; sectors[5].concessionsWaitMin = 9; sectors[5].restroomsWaitMin = 8; sectors[5].status = 'normal';
    sectors[6].currentDensity = 80; sectors[6].flowRate = 3; sectors[6].concessionsWaitMin = 7; sectors[6].restroomsWaitMin = 6; sectors[6].status = 'normal';
    sectors[7].currentDensity = 84; sectors[7].flowRate = 3; sectors[7].concessionsWaitMin = 8; sectors[7].restroomsWaitMin = 8; sectors[7].status = 'normal';

  } else if (phase === 'post-match') {
    match.timeElapsed = 'Full Time';
    match.score = '2 - 1';

    // Fans leaving! Stands emptying, Gates extremely crowded!
    sectors[0].currentDensity = 45; sectors[0].queueTimeMin = 10; sectors[0].flowRate = 80; sectors[0].status = 'normal';
    sectors[1].currentDensity = 96; sectors[1].queueTimeMin = 45; sectors[1].flowRate = 220; sectors[1].status = 'critical'; // Metro bottleneck
    sectors[2].currentDensity = 72; sectors[2].queueTimeMin = 20; sectors[2].flowRate = 140; sectors[2].status = 'congested'; // South plaza
    sectors[3].currentDensity = 84; sectors[3].queueTimeMin = 32; sectors[3].flowRate = 160; sectors[3].status = 'congested'; // Rideshare

    // Stands
    sectors[4].currentDensity = 45; sectors[4].flowRate = 110; sectors[4].concessionsWaitMin = 3; sectors[4].restroomsWaitMin = 5; sectors[4].status = 'normal';
    sectors[5].currentDensity = 50; sectors[5].flowRate = 130; sectors[5].concessionsWaitMin = 4; sectors[5].restroomsWaitMin = 6; sectors[5].status = 'normal';
    sectors[6].currentDensity = 42; sectors[6].flowRate = 100; sectors[6].concessionsWaitMin = 3; sectors[6].restroomsWaitMin = 4; sectors[6].status = 'normal';
    sectors[7].currentDensity = 48; sectors[7].flowRate = 120; sectors[7].concessionsWaitMin = 3; sectors[7].restroomsWaitMin = 5; sectors[7].status = 'normal';

  } else if (phase === 'dispersal') {
    match.timeElapsed = 'Dispersal Phase';
    match.score = '2 - 1';

    // Gates settling
    sectors[0].currentDensity = 15; sectors[0].queueTimeMin = 3; sectors[0].flowRate = 20; sectors[0].status = 'normal';
    sectors[1].currentDensity = 45; sectors[1].queueTimeMin = 12; sectors[1].flowRate = 60; sectors[1].status = 'normal';
    sectors[2].currentDensity = 30; sectors[2].queueTimeMin = 8; sectors[2].flowRate = 40; sectors[2].status = 'normal';
    sectors[3].currentDensity = 35; sectors[3].queueTimeMin = 10; sectors[3].flowRate = 45; sectors[3].status = 'normal';

    // Stands empty
    sectors[4].currentDensity = 5; sectors[4].flowRate = 5; sectors[4].concessionsWaitMin = 0; sectors[4].restroomsWaitMin = 0; sectors[4].status = 'normal';
    sectors[5].currentDensity = 6; sectors[5].flowRate = 6; sectors[5].concessionsWaitMin = 0; sectors[5].restroomsWaitMin = 0; sectors[5].status = 'normal';
    sectors[6].currentDensity = 4; sectors[6].flowRate = 4; sectors[6].concessionsWaitMin = 0; sectors[6].restroomsWaitMin = 0; sectors[6].status = 'normal';
    sectors[7].currentDensity = 5; sectors[7].flowRate = 5; sectors[7].concessionsWaitMin = 0; sectors[7].restroomsWaitMin = 0; sectors[7].status = 'normal';

  } else if (phase === 'emergency') {
    match.timeElapsed = 'EVACUATION!';
    match.score = 'ALERTS';

    // Red heatmaps everywhere, extreme flows
    for (let s of sectors) {
      s.currentDensity = 88;
      s.flowRate = 150;
      s.queueTimeMin = 0; // Evacuation, no queuing at gates, just outward flow
      s.status = 'critical';
      s.concessionsWaitMin = 0;
      s.restroomsWaitMin = 0;
    }
  }
  updateDigitalSignageForSectors();
}

function updateDigitalSignageForSectors() {
  const phase = stadiumState.gamePhase;
  stadiumState.sectors.forEach(s => {
    if (phase === 'emergency') {
      s.activeSignageMessage = "🚨 EVACUATION ACTIVE: Proceed to nearest exit Gate in an orderly fashion! Follow ground stewards.";
      s.signageCommandSent = `PUSH_API_SUCCESS: SENT TO SIGN_NODE_${s.id.toUpperCase().replace('-', '_')} (SECURE_CHANNEL)`;
    } else if (s.currentDensity > 85) {
      s.activeSignageMessage = `⚠️ DENSITY ALERT (${s.currentDensity}%): Turnstiles Congested. Seek Alternate Gate. Redirecting to adjacent sectors.`;
      s.signageCommandSent = `PUSH_API_SUCCESS: SENT TO SIGN_NODE_${s.id.toUpperCase().replace('-', '_')} (REDIRECT_TRIGGERED)`;
    } else if (s.currentDensity > 60) {
      s.activeSignageMessage = `⚠️ HEAVY FLOW (${s.currentDensity}%): Please proceed slowly and have ticket barcodes ready at turnstile scanners.`;
      s.signageCommandSent = `PUSH_API_SUCCESS: SENT TO SIGN_NODE_${s.id.toUpperCase().replace('-', '_')} (FLOW_WARNING)`;
    } else {
      s.activeSignageMessage = "WELCOME TO ESTADIO AZTECA. Have a safe match. Enjoy food delivery directly to your seat!";
      s.signageCommandSent = `PUSH_API_SUCCESS: SENT TO SIGN_NODE_${s.id.toUpperCase().replace('-', '_')} (STANDARD)`;
    }
  });
}

// REST APIs
app.get('/api/stadium/state', (req, res) => {
  res.json(stadiumState);
});

app.post('/api/stadium/phase', (req, res) => {
  const { phase } = req.body;
  const VALID_PHASES = ['pre-match', 'first-half', 'halftime', 'second-half', 'post-match', 'dispersal', 'emergency'];

  if (!phase || typeof phase !== 'string' || !VALID_PHASES.includes(phase)) {
    return res.status(400).json({ error: 'Valid phase is required: ' + VALID_PHASES.join(', ') });
  }
  applySimulationState(phase as any);

  // Log to decentralized blockchain ledger
  addBlockchainReceipt('PHASE_CHANGE', `Stadium operations transitioned to phase [${phase.toUpperCase()}]. Active attendance verified at 83,412.`);

  // Add a simulation log announcement
  const text = `SYSTEM ALERT: Stadium operations entered [${phase.toUpperCase()}] mode. Automated flow guidance and heatmap diagnostics updated.`;
  stadiumState.announcements.unshift({
    id: `ann-${Date.now()}`,
    text,
    timestamp: new Date().toISOString()
  });

  res.json(stadiumState);
});

// Broadcast custom announcement
app.post('/api/stadium/broadcast-announcement', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0 || text.length > 500) {
    return res.status(400).json({ error: 'Text must be a non-empty string under 500 characters' });
  }

  const announcement: Announcement = {
    id: `ann-${Date.now()}`,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };

  stadiumState.announcements.unshift(announcement);
  res.json({ success: true, announcement, announcements: stadiumState.announcements });
});

// Resolve an incident
app.post('/api/stadium/resolve-incident', (req, res) => {
  const { id } = req.body;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid incident ID is required' });
  }

  const incidentIndex = stadiumState.incidents.findIndex(i => i.id === id);
  if (incidentIndex === -1) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  stadiumState.incidents[incidentIndex].resolved = true;

  // Log resolution to blockchain ledger
  addBlockchainReceipt(
    'INCIDENT_RESOLVED',
    `Incident [${stadiumState.incidents[incidentIndex].type}] in sector [${stadiumState.incidents[incidentIndex].sectorId.toUpperCase()}] marked as RESOLVED by field coordinators.`
  );

  // Add announcement of resolution
  const text = `NOTICE RESOLVED: The incident [${stadiumState.incidents[incidentIndex].type}] in sector [${stadiumState.incidents[incidentIndex].sectorId.toUpperCase()}] has been successfully resolved by field staff. Thank you for your cooperation.`;
  stadiumState.announcements.unshift({
    id: `ann-${Date.now()}`,
    text,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, incidents: stadiumState.incidents, announcements: stadiumState.announcements, blockchainReceipts: stadiumState.blockchainReceipts });
});

// Security: High-privilege API authorization validator to eliminate vulnerabilities
const validateHighPrivilegeAction = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const securityHeader = req.headers['x-chaos-token'];
  const expectedToken = process.env.CHAOS_SECURITY_TOKEN || 'fifa-arena-opsai-chaos-token-2026';

  if (!securityHeader || securityHeader !== expectedToken) {
    return res.status(403).json({
      error: 'Access Denied: High-privilege action requires cryptographic validation header (x-chaos-token)',
      vulnerabilityStatus: 'BLOCKED'
    });
  }
  next();
};

// POST - Trigger Chaos Simulation (Gate B Metro Collapse, Stand East Power Outage, Heavy Rainstorm)
app.post('/api/stadium/chaos', validateHighPrivilegeAction, (req, res) => {
  stadiumState.gamePhase = 'emergency';
  stadiumState.matchDetails.timeElapsed = 'CHAOS MODE ACTIVE';
  stadiumState.matchDetails.score = 'ALERTS';

  // Mutate Sectors to reflect chaos
  stadiumState.sectors.forEach(s => {
    if (s.id === 'gate-b') {
      s.currentDensity = 98;
      s.queueTimeMin = 65;
      s.flowRate = 240;
      s.status = 'critical';
    } else if (s.id === 'stand-east') {
      s.currentDensity = 95;
      s.concessionsWaitMin = 45;
      s.restroomsWaitMin = 40;
      s.status = 'critical';
    } else {
      s.currentDensity = Math.min(90, s.currentDensity + 25);
      s.status = s.currentDensity > 80 ? 'critical' : s.currentDensity > 60 ? 'congested' : 'normal';
    }
  });

  // Remove previous unresolved duplicate chaos incidents to avoid cluttering
  stadiumState.incidents = stadiumState.incidents.filter(i =>
    i.resolved || (!i.type.includes('Transit Failure') && !i.type.includes('Grid Blackout') && !i.type.includes('Storm Cloudburst'))
  );

  // Generate three simultaneous incidents
  const timestamp = new Date().toISOString();

  const incident1: Incident = {
    id: `chaos-metro-${Date.now()}`,
    sectorId: 'gate-b',
    type: 'Gate B Metro Transit Failure',
    description: 'AZTECA STATION TEMPORARILY CLOSED. Severe mechanical track failure halts all incoming & outgoing subway service. Rapid density buildup at East concourse connection gates.',
    timestamp,
    severity: 'critical',
    recommendations: 'Immediately halt subway turnstile flow. Reroute departing passenger lines to Gate A (VIP) and Gate D Rideshare. Deploy auxiliary bus shuttles to West Plaza.',
    dispatchSms: 'CHAOS_LORA_MSG_01: Gate B Metro shut down. Reroute pedestrian streams north to Gate A, west to Gate D. Deploy shuttle lines.',
    paAnnouncementDrafts: {
      en: 'Urgent notice for fans at Gate B: Azteca Metro Station is temporarily closed due to transit line failure. Please proceed in an orderly fashion to Gate A or Gate D for alternative transportation options.',
      es: 'Aviso urgente para los aficionados de la Puerta B: La estación de Metro Azteca está cerrada temporalmente debido a una falla en la línea de tránsito. Diríjase de manera ordenada a la Puerta A o la Puerta D para opciones de transporte alternativo.',
      fr: 'Avis urgent pour les supporters de la Porte B: La station de métro Azteca est temporairement fermée. Veuillez vous diriger calmement vers la Porte A ou la Porte D.',
      ar: 'تنبيه عاجل للجماهير في البوابة B: محطة مترو أزتيكا مغلقة مؤقتًا. يرجى التوجه بنظام إلى البوابة A أو البوابة D للمواصلات البديلة.'
    },
    resolved: false
  };

  const incident2: Incident = {
    id: `chaos-power-${Date.now()}`,
    sectorId: 'stand-east',
    type: 'East Stand Power Grid Blackout',
    description: 'Substation #3 blowout. 100% loss of utility power grid in Stand-East concourse. Concessions, escalators, and local high-frequency cell repeaters are totally offline.',
    timestamp,
    severity: 'critical',
    recommendations: 'Engage solar microgrid localized battery backup. Deploy emergency handheld flashlights. Switch communication to 433MHz peer-to-peer LoRA Mesh Network.',
    dispatchSms: 'CHAOS_LORA_MSG_02: East Stand power down. Utility grid offline. Local cellular is down. Transitioning all local radios to LoRA Mesh Net Node 12.',
    paAnnouncementDrafts: {
      en: 'Notice for Stand-East concourse: A localized power outage is being resolved. Emergency backup lighting is active. Please remain in your seats. Concessions are temporarily cash-only.',
      es: 'Aviso para la Grada Este: Se está resolviendo un corte de energía localizado. La iluminación de emergencia está activa. Por favor, permanezca en su asiento.',
      fr: 'Avis pour la tribune Est: Une panne de courant locale est en cours de résolution. L\'éclairage de secours est activé. Veuillez rester assis.',
      ar: 'تنبيه للمدرج الشرقي: انقطاع كهربائي محلي يجري حله. إضاءة الطوارئ البديلة نشطة. يرجى البقاء في المقاعد.'
    },
    resolved: false
  };

  const incident3: Incident = {
    id: `chaos-rain-${Date.now()}`,
    sectorId: 'gate-c',
    type: 'Severe Storm Cloudburst',
    description: 'Torrential convective rainfall exceeding 80mm/hour hits South Plaza. Heavy lightning warnings active. High wind gusts causing canopy vibration.',
    timestamp,
    severity: 'critical',
    recommendations: 'Halt all outdoor activities in South Fan Zone. Clear South Plaza. Guide fans into covered dry concourses. Instruct stewards to open inner concourse gates.',
    dispatchSms: 'CHAOS_LORA_MSG_03: Heavy storm cloudburst with lightning in South Plaza. Move fans indoors immediately. Open gate barriers.',
    paAnnouncementDrafts: {
      en: 'Safety alert: A severe convective thunderstorm is passing over the stadium. Outdoor South Fan Zone activities are suspended. Please move into covered concourse areas.',
      es: 'Alerta de seguridad: Una tormenta eléctrica severa pasa sobre el estadio. Actividades de la zona exterior sur suspendidas. Por favor, muévase a las áreas techadas.',
      fr: 'Alerte de sécurité: Un orage violent traverse le stade. Activités extérieures suspendues. Veuillez vous abriter dans les halls couverts.',
      ar: 'تنبيه سلامة: عاصفة رعدية شديدة تمر فوق الاستاد. تم تعليق أنشطة منطقة الجماهير الخارجية الجنوبية. يرجى الانتقال للمناطق المغطاة.'
    },
    resolved: false
  };

  stadiumState.incidents.unshift(incident1, incident2, incident3);

  // Trigger custom LoRA Mesh Net system announcements
  const meshAnn: Announcement = {
    id: `ann-chaos-mesh-${Date.now()}`,
    text: '⚠️ SYSTEM ALARM: Chaos Engineering Mode triggered! Simultaneously: Gate B Metro Collapse, East Stand concourse blackout, and convective storm. Failover LoRA Peer-to-Peer Mesh network has engaged automatically for team coordination.',
    timestamp
  };
  stadiumState.announcements.unshift(meshAnn);

  // Also add some active dispatches for the chaos response
  const disp1: StaffDispatch = {
    id: `disp-chaos-1-${Date.now()}`,
    sectorId: 'gate-b',
    type: 'Metro Crowd Evac Rerouting',
    stewards: ['LORA_STEW_01', 'LORA_STEW_02', 'LORA_STEW_03'],
    gpsCoordinates: { lat: 19.3029, lng: -99.1505 },
    status: 'dispatched',
    timestamp
  };

  const disp2: StaffDispatch = {
    id: `disp-chaos-2-${Date.now()}`,
    sectorId: 'stand-east',
    type: 'Blackout Auxiliary Deployment',
    stewards: ['LORA_STEW_14', 'LORA_STEW_15', 'LORA_STEW_18'],
    gpsCoordinates: { lat: 19.3015, lng: -99.1492 },
    status: 'dispatched',
    timestamp
  };

  stadiumState.activeDispatches.unshift(disp1, disp2);

  // Log emergency event to blockchain ledger
  addBlockchainReceipt('CHAOS_EMERGENCY_TRIGGER', 'SIMULATED CRITICAL DISASTER: Automated triple-incident failure scenario (Gate B Metro collapse, East Stand blackout, convective storm) deployed.');

  res.json(stadiumState);
});

// POST - Log a new incident (Staff & Venue Operators)
// Uses Gemini to automatically evaluate severity, create recommendations, draft dispatches and PA announcements
app.post('/api/stadium/incident', async (req, res) => {
  const { sectorId, type, description, photoUrl, lightweightMetadata, photoAnalysis, photoBase64 } = req.body;

  if (!sectorId || !type || !description ||
      typeof sectorId !== 'string' || typeof type !== 'string' || typeof description !== 'string' ||
      type.trim().length === 0 || description.trim().length === 0) {
    return res.status(400).json({ error: 'Sector ID, type, and description must be valid non-empty strings' });
  }

  const validSectorIds = stadiumState.sectors.map(s => s.id);
  if (!validSectorIds.includes(sectorId)) {
    return res.status(400).json({ error: 'Invalid sectorId. Select a valid gate or stand sector.' });
  }

  const ai = getGeminiClient();
  const incidentId = `inc-${Date.now()}`;
  const timestamp = new Date().toISOString();

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let recommendations = '';
  let dispatchSms = '';
  let paAnnouncementDrafts = { en: '', es: '', fr: '', ar: '' };
  let extractedPhotoAnalysis = photoAnalysis || '';

  if (ai) {
    try {
      const prompt = `
        You are ArenaCommand AI, the elite operations coordinator for Estadio Azteca during the FIFA World Cup 2026.
        An incident has been logged by stadium staff:
        - Sector/Gate: ${sectorId} (Context: ${stadiumState.sectors.find(s => s.id === sectorId)?.name || 'Unknown'})
        - Type of Incident: ${type}
        - Description: ${description}
        ${photoUrl ? `- Photo URL: ${photoUrl}` : ''}
        ${lightweightMetadata ? `- Edge Compressed Photo Layer Metadata: ${lightweightMetadata}` : ''}
        ${photoAnalysis ? `- Field Staff Initial Photo Assessment: ${photoAnalysis}` : ''}
        ${photoBase64 ? '- Note: A live field photo has been uploaded. Analyze the image to identify the hazard, estimate damage, detect blockages, and diagnose severity.' : ''}

        Analyze this incident under World Cup gameday pressure. Determine the appropriate severity level ('low', 'medium', 'high', 'critical').
        Prioritize high-risk issues (such as structural cracks, mechanical collapses, or medical distress) over simple debris blockers.
        Provide:
        1. "severity": Must be exactly one of: 'low', 'medium', 'high', 'critical'.
        2. "recommendations": Clear, professional, actionable, bulleted procedural instructions for venue staff and volunteers to contain/resolve the issue. Use the Stadium Reference Guide if applicable.
        3. "dispatchSms": A concise, radio-style dispatcher SMS message for field volunteers or security teams (maximum 150 characters, capital letter prefixes like "MED:", "SEC:", "CLEAN:").
        4. "paAnnouncementDrafts": A brief, comforting, clear public address announcement draft to guide the fans in English, Spanish, French, and Arabic.
        5. "photoAnalysis": If a field photo is attached, describe exactly what hazard, damage, or issue is visible in the photo. If no photo is attached, output a brief summary of the described scenario.
      `;

      let contents: any = prompt;
      if (photoBase64) {
        let mimeType = 'image/png';
        let base64Data = photoBase64;
        if (photoBase64.startsWith('data:')) {
          const parts = photoBase64.split(';base64,');
          mimeType = parts[0].replace('data:', '');
          base64Data = parts[1];
        }
        const imagePart = {
          inlineData: {
            mimeType,
            data: base64Data
          }
        };
        contents = { parts: [imagePart, { text: prompt }] };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: `You are a real-time Stadium Security and Operations assistant. Ground all recommendations on safety, efficiency, and accessibility. Use JSON output fitting the schema exactly.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: {
                type: Type.STRING,
                description: "Must be exactly one of: 'low', 'medium', 'high', 'critical'.",
              },
              recommendations: {
                type: Type.STRING,
                description: "Detailed actionable instructions for ground staff. Keep it structured and realistic.",
              },
              dispatchSms: {
                type: Type.STRING,
                description: "Radio text dispatch for security/volunteers, under 150 chars. Starts with tag like 'SEC:', 'MED:', or 'CLEAN:'.",
              },
              paAnnouncementDrafts: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  es: { type: Type.STRING },
                  fr: { type: Type.STRING },
                  ar: { type: Type.STRING }
                },
                required: ["en", "es", "fr", "ar"]
              },
              photoAnalysis: {
                type: Type.STRING,
                description: "Description of what is detected in the uploaded photo."
              }
            },
            required: ["severity", "recommendations", "dispatchSms", "paAnnouncementDrafts", "photoAnalysis"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      severity = (['low', 'medium', 'high', 'critical'].includes(data.severity?.toLowerCase()) ? data.severity.toLowerCase() : 'low') as any;
      recommendations = data.recommendations || 'No recommendation generated.';
      dispatchSms = data.dispatchSms || 'SEC: Incident reported. Proceed to investigate.';
      paAnnouncementDrafts = data.paAnnouncementDrafts || { en: '', es: '', fr: '', ar: '' };
      extractedPhotoAnalysis = data.photoAnalysis || photoAnalysis || 'No visual analysis generated.';

    } catch (err) {
      console.error('Error calling Gemini for incident:', err);
      // Fallback on error
      const mockResult = generateFallbackIncident(sectorId, type, description);
      severity = mockResult.severity;
      recommendations = mockResult.recommendations;
      dispatchSms = mockResult.dispatchSms;
      paAnnouncementDrafts = mockResult.paAnnouncementDrafts;
    }
  } else {
    // Local Fallback Mode
    const mockResult = generateFallbackIncident(sectorId, type, description);
    severity = mockResult.severity;
    recommendations = mockResult.recommendations + '\n\n*(Generated in Local Fallback Mode)*';
    dispatchSms = mockResult.dispatchSms;
    paAnnouncementDrafts = mockResult.paAnnouncementDrafts;
  }

  // FIFA-Compliant Incident Classification via SRP helper functions
  const { fifaTag, severity: defaultSeverity } = classifyIncident(type, description, extractedPhotoAnalysis);
  severity = defaultSeverity;

  const combText = `${type} ${description} ${extractedPhotoAnalysis || ''}`.toLowerCase();
  if (combText.includes('debris') || combText.includes('blocker') || combText.includes('trash')) {
    severity = 'low';
  }

  const updatedType = `[${fifaTag}] ${type}`;
  recommendations = formatRecommendations(fifaTag, sectorId, recommendations);

  // Log emergency action as a tamper-proof cryptographic receipt
  addBlockchainReceipt(
    'INCIDENT_LOGGED',
    `Incident [${updatedType}] logged in sector [${sectorId.toUpperCase()}]. Classified under code ${fifaTag} complying with FIFA-SEC-ANNEX-2026.`
  );

  const blockchainHash = stadiumState.blockchainReceipts && stadiumState.blockchainReceipts.length > 0
    ? stadiumState.blockchainReceipts[0].hash
    : 'genesis_failed';

  const newIncident: Incident = {
    id: incidentId,
    sectorId,
    type: updatedType,
    description,
    timestamp,
    severity,
    recommendations,
    dispatchSms,
    paAnnouncementDrafts,
    resolved: false,
    photoUrl,
    lightweightMetadata,
    photoAnalysis: extractedPhotoAnalysis,
    blockchainHash
  };

  stadiumState.incidents.unshift(newIncident);

  // Sector Priority Highlighting on central SVG map
  if (severity === 'high' || severity === 'critical') {
    const sector = stadiumState.sectors.find(s => s.id === sectorId);
    if (sector) {
      sector.status = severity === 'critical' ? 'critical' : 'congested';
      sector.currentDensity = Math.min(99, sector.currentDensity + 30);

      // Log priority mapping event
      addBlockchainReceipt(
        'SECTOR_PRIORITY_HIGHLIGHTED',
        `Sector ${sector.name} mapped to extreme highlighting status [${sector.status.toUpperCase()}] at 100% capacity.`
      );
    }

    stadiumState.announcements.unshift({
      id: `ann-${Date.now()}`,
      text: `CRITICAL ALERT: [${type}] reported in [${stadiumState.sectors.find(s => s.id === sectorId)?.name || sectorId}]. Operations response team dispatched. Fans, please follow directional stewards.`,
      timestamp: new Date().toISOString()
    });
  }

  // Update signage due to state changes
  updateDigitalSignageForSectors();

  res.json({ success: true, incident: newIncident, incidents: stadiumState.incidents, announcements: stadiumState.announcements, blockchainReceipts: stadiumState.blockchainReceipts, sectors: stadiumState.sectors });
});

// POST - Decision Support Sandbox (Organizational/Organizers Directives)
// Feeds the current stadium status and user directive scenario, getting high-level strategical suggestions from Gemini
app.post('/api/stadium/command', async (req, res) => {
  const { directive } = req.body;

  if (!directive || typeof directive !== 'string' || directive.trim().length === 0 || directive.length > 1000) {
    return res.status(400).json({ error: 'Directive scenario must be a valid non-empty string under 1000 characters' });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const activeIncidentsStr = stadiumState.incidents
        .filter(i => !i.resolved)
        .map(i => `- [${i.severity.toUpperCase()}] ${i.type} in ${i.sectorId}: ${i.description}`)
        .join('\n');

      const sectorsStr = stadiumState.sectors
        .map(s => `- Sector ${s.name} (${s.id}): Density ${s.currentDensity}%, queue ${s.queueTimeMin} min, status ${s.status}`)
        .join('\n');

      const prompt = `
        You are the Head of Stadium Operations & Emergency Response at Estadio Azteca for the FIFA World Cup 2026.
        A major command scenario or operational request has been submitted:
        "${directive}"

        CURRENT STADIUM OPERATIONAL STATUS:
        - Match Stage/Phase: ${stadiumState.gamePhase.toUpperCase()}
        - Match Details: ${stadiumState.matchDetails.teams} (${stadiumState.matchDetails.score}, ${stadiumState.matchDetails.timeElapsed})
        - Capacity / Attendance: ${stadiumState.matchDetails.attendance} / ${stadiumState.matchDetails.capacity}
        - Sector/Gate Flow & Densities:
        ${sectorsStr}
        - Unresolved Incidents:
        ${activeIncidentsStr || 'None. Operation is currently green.'}

        Use the official Stadium Operations Guide grounded context:
        ${STADIUM_GUIDE}

        Draft a professional, authoritative, and comprehensive "FIFA World Cup Operations Action Brief".
        Structure your brief clearly using Markdown:
        1. **Situation Assessment**: Evaluate the directive against current sector densities, transit backlogs, and active incidents.
        2. **Immediate Crowd Control & Re-routing Plan**: Bulleted tactical operations for turnstile staff, transit managers, and stewards. Be geographically precise! (e.g. mention Gate B Metro Transit, rideshare zones, accessibility lanes, etc.)
        3. **PA Announcement Broadcasts**: Professional stadium announcement drafts in English and Spanish for fans.
        4. **Staff & Volunteer Deployment**: Explicit instructions for stadium floor stewards and security forces.
        5. **Sustainability & Cleanliness Contingency**: Mention waste recycling, cup deposit refunds, or solar microgrid impacts if relevant.

        Keep the tone highly professional, precise, and crisis-ready. Do not exaggerate, and use Estadio Azteca facts accurately.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (err) {
      console.error('Error in decision support brief:', err);
      res.status(500).json({ error: 'Failed to generate operational brief via Gemini API.' });
    }
  } else {
    // Fallback response for Local Sandbox Mode
    res.json({
      result: `### 📋 Fallback Operations Action Brief

*Note: Set your GEMINI_API_KEY secret to enable live full-scale AI analysis.*

#### 1. Situation Assessment
- **Directive scenario**: "${directive}"
- **Active Phase**: **${stadiumState.gamePhase.toUpperCase()}**
- **Analysis**: Stadium is at high occupancy (${stadiumState.matchDetails.attendance} fans). Any change in weather, transportation bottlenecks, or stadium utilities requires immediate synchronization of Gate B (Transit Link) and Gate D (Rideshare).

#### 2. Immediate Crowd Control & Re-routing Plan
- **Gate B Metro Station Redirect**: Coordinate with Azteca Light Rail authorities to meter inbound platforms. Direct surplus crowds through South Plaza (Gate C) for leisure activities to buffer exit spikes.
- **Rideshare Zone Bypasses**: Advise rideshare drivers to drop off exclusively at Lot 7 near Gate D. Keep the VIP Gate A completely clear for medical vehicles.
- **Accessibility Safeguard**: Ensure elevators in Concourse 112 and 134 have dedicated volunteers to prevent general crowd blockage.

#### 3. Recommended PA Announcements (Broadcasting)
- **English**: *"For your safety and comfort, please use the south plazas for food and merchandise. Rerouted entry routes are currently in operation."*
- **Español**: *"Por su seguridad, utilice las plazas del sur para alimentos y souvenirs. Rutas de acceso alternativas habilitadas."*

#### 4. Staff Deployment
- Mobilize 150 mobile stewards with megaphones to guide fans.
- Equip gate volunteers with manual ticket scanning devices as safety redundancy.
`
    });
  }
});

// POST - Edge AI Automated Slip, Fall & Anomaly Detection
// Simulates computer vision alerts by auto-generating a High-Severity incident evaluated by Gemini
app.post('/api/stadium/edge-ai-anomaly', async (req, res) => {
  const { sectorId, anomalyType } = req.body;

  if (!sectorId || !anomalyType) {
    return res.status(400).json({ error: 'Sector ID and anomalyType must be provided' });
  }

  const validSectorIds = stadiumState.sectors.map(s => s.id);
  if (!validSectorIds.includes(sectorId)) {
    return res.status(400).json({ error: 'Invalid sectorId.' });
  }

  let type = '';
  let description = '';
  if (anomalyType === 'slip_fall') {
    type = 'Edge AI Anomaly: Concourse Slip & Fall';
    description = `Edge AI Computer Vision Tracking has detected an automatic crowd flow velocity vector break: a fan slipped and fell on a concourse ramp in Sector ${sectorId.toUpperCase()}. High probability of injury, potential bottleneck forming.`;
  } else if (anomalyType === 'density_surge') {
    type = 'Edge AI Anomaly: Sudden Gate Crowd Density Surge';
    description = `Edge AI Computer Vision Tracking has flagged a sudden, non-linear density surge and crowd pressure bottleneck at turnstile Gate ${sectorId.toUpperCase()}. Crowding levels exceeding safe boundaries. Velocity vectors show high compression.`;
  } else {
    type = 'Edge AI Anomaly: General Motion Anomaly';
    description = `Edge AI Computer Vision Tracking has flagged a generic crowd flow velocity anomaly in Sector ${sectorId.toUpperCase()} requiring immediate investigation.`;
  }

  const ai = getGeminiClient();
  const incidentId = `inc-edge-${Date.now()}`;
  const timestamp = new Date().toISOString();

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'critical';
  let recommendations = '';
  let dispatchSms = '';
  let paAnnouncementDrafts = { en: '', es: '', fr: '', ar: '' };
  let photoAnalysis = 'Edge AI automated computer vision visual vector velocity mapping indicates high anomaly index.';

  if (ai) {
    try {
      const prompt = `
        You are ArenaCommand AI, the elite operations coordinator for Estadio Azteca during the FIFA World Cup 2026.
        An Edge AI Computer Vision camera tracking system has automatically triggered a High-Severity Anomaly incident:
        - Sector/Gate: ${sectorId} (Context: ${stadiumState.sectors.find(s => s.id === sectorId)?.name || 'Unknown'})
        - Automated Incident Type: ${type}
        - AI Computer Vision Event Log: ${description}

        Determine the appropriate severity level ('low', 'medium', 'high', 'critical') - normally 'high' or 'critical' for automated life-safety alerts.
        Provide:
        1. "severity": Must be exactly one of: 'low', 'medium', 'high', 'critical'.
        2. "recommendations": Professional actionable, bulleted procedural instructions for venue staff and volunteers to respond to this automated camera trigger.
        3. "dispatchSms": A concise radio-style dispatcher SMS message for field volunteers or security teams (maximum 150 characters, capital letter prefixes like "MED:", "SEC:").
        4. "paAnnouncementDrafts": A brief, comforting, clear public address announcement draft to guide the fans in English, Spanish, French, and Arabic.
        5. "photoAnalysis": A detailed professional description of what the camera's spatial analysis and optical flow vectors detected.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are a real-time Stadium Security and Operations assistant. Ground all recommendations on safety, efficiency, and accessibility. Use JSON output fitting the schema exactly.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING },
              recommendations: { type: Type.STRING },
              dispatchSms: { type: Type.STRING },
              paAnnouncementDrafts: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  es: { type: Type.STRING },
                  fr: { type: Type.STRING },
                  ar: { type: Type.STRING }
                },
                required: ["en", "es", "fr", "ar"]
              },
              photoAnalysis: { type: Type.STRING }
            },
            required: ["severity", "recommendations", "dispatchSms", "paAnnouncementDrafts", "photoAnalysis"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      severity = (['low', 'medium', 'high', 'critical'].includes(data.severity?.toLowerCase()) ? data.severity.toLowerCase() : 'high') as any;
      recommendations = data.recommendations || 'Deploy medical/security rapid response immediately.';
      dispatchSms = data.dispatchSms || 'SEC: Edge AI Anomaly alert. Rapid response deployed.';
      paAnnouncementDrafts = data.paAnnouncementDrafts || { en: '', es: '', fr: '', ar: '' };
      photoAnalysis = data.photoAnalysis || photoAnalysis;

    } catch (err) {
      console.error('Error generating Edge AI incident via Gemini:', err);
      const fallback = generateFallbackIncident(sectorId, type, description);
      severity = 'high';
      recommendations = fallback.recommendations;
      dispatchSms = fallback.dispatchSms;
      paAnnouncementDrafts = fallback.paAnnouncementDrafts;
    }
  } else {
    const fallback = generateFallbackIncident(sectorId, type, description);
    severity = 'high';
    recommendations = fallback.recommendations + '\n\n*(Generated in Edge AI Local Fallback Mode)*';
    dispatchSms = fallback.dispatchSms;
    paAnnouncementDrafts = fallback.paAnnouncementDrafts;
  }

  // Force critical severity for high-severity camera logs to match user's requirement
  severity = 'critical';

  // Apply FIFA-Compliant Classification to Edge AI Anomaly
  let edgeFifaTag = "FIFA-SEC-CLASS-101-GEN";
  if (anomalyType === 'slip_fall') {
    edgeFifaTag = "FIFA-SEC-CLASS-104-HAZ";
  } else if (anomalyType === 'density_surge') {
    edgeFifaTag = "FIFA-SEC-CLASS-101-GEN";
  }
  const edgeFifaType = `[${edgeFifaTag}] ${type}`;
  recommendations = `Compliance Reference: [${edgeFifaTag}] under protocol FIFA-SEC-ANNEX-2026.\n\n` + recommendations;

  // Add blockchain receipt
  addBlockchainReceipt(
    'EDGE_AI_ANOMALY_TRIGGER',
    `Automated computer vision tracking detected anomalous crowd velocity vectors in Sector ${sectorId.toUpperCase()}. Logged high-severity incident [${edgeFifaType}] securely under FIFA-SEC-ANNEX-2026.`
  );

  const blockchainHash = stadiumState.blockchainReceipts && stadiumState.blockchainReceipts.length > 0
    ? stadiumState.blockchainReceipts[0].hash
    : 'edge_hash_failed';

  const newIncident: Incident = {
    id: incidentId,
    sectorId,
    type: edgeFifaType,
    description,
    timestamp,
    severity,
    recommendations,
    dispatchSms,
    paAnnouncementDrafts,
    resolved: false,
    photoUrl: '/assets/edge-ai-camera.png',
    lightweightMetadata: JSON.stringify({ velocity_vectors: 'ANOMALOUS_SURGE_9.2', frames_analyzed: 120, edge_device_id: 'CV_NODE_AZTECA_' + sectorId.toUpperCase() }),
    photoAnalysis,
    blockchainHash
  };

  stadiumState.incidents.unshift(newIncident);

  // Mark the sector status
  const sector = stadiumState.sectors.find(s => s.id === sectorId);
  if (sector) {
    sector.status = 'critical';
    sector.currentDensity = Math.min(99, sector.currentDensity + 25);
  }

  stadiumState.announcements.unshift({
    id: `ann-edge-${Date.now()}`,
    text: `⚠️ AUTOMATED EDGE AI ALERT: Anomaly (${type}) detected in Sector [${stadiumState.sectors.find(s => s.id === sectorId)?.name || sectorId}]. Response stewards and medical dispatches have been automatically triggered.`,
    timestamp
  });

  // Update signage
  updateDigitalSignageForSectors();

  res.json({ success: true, incident: newIncident, incidents: stadiumState.incidents, announcements: stadiumState.announcements, blockchainReceipts: stadiumState.blockchainReceipts, sectors: stadiumState.sectors });
});

// POST - Update Network configuration (Throttling / LoRA Packet Corruption Injection)
app.post('/api/stadium/network-config', (req, res) => {
  const { packetLoss, latencyMs, syntheticCorruptionActive, meshRelayQuality } = req.body;

  if (stadiumState.networkState) {
    if (typeof packetLoss === 'number') stadiumState.networkState.packetLoss = packetLoss;
    if (typeof latencyMs === 'number') stadiumState.networkState.latencyMs = latencyMs;
    if (typeof meshRelayQuality === 'number') stadiumState.networkState.meshRelayQuality = meshRelayQuality;
    if (typeof syntheticCorruptionActive === 'boolean') stadiumState.networkState.syntheticCorruptionActive = syntheticCorruptionActive;

    // Auto-calculate resilience mode
    stadiumState.networkState.resilienceModeActive = stadiumState.networkState.packetLoss > 30 || stadiumState.networkState.syntheticCorruptionActive;

    // Log to blockchain if network degradation occurs
    if (stadiumState.networkState.resilienceModeActive) {
      addBlockchainReceipt(
        'NETWORK_RESILIENCE_ENGAGED',
        `Network status degraded (Packet Loss: ${stadiumState.networkState.packetLoss}%, Mesh Quality: ${stadiumState.networkState.meshRelayQuality}%). Low-latency packet compression and asset-stripping triggered automatically.`
      );
    } else {
      addBlockchainReceipt(
        'NETWORK_STATUS_RESTORED',
        `High-bandwidth standard transport protocol restored (Packet Loss: ${stadiumState.networkState.packetLoss}%, Latency: ${stadiumState.networkState.latencyMs}ms).`
      );
    }
  }

  res.json(stadiumState);
});

// POST - Manual digital signage command override
app.post('/api/stadium/signage-command', (req, res) => {
  const { sectorId, activeSignageMessage } = req.body;

  if (!sectorId || !activeSignageMessage) {
    return res.status(400).json({ error: 'Sector ID and signage message are required' });
  }

  const sector = stadiumState.sectors.find(s => s.id === sectorId);
  if (!sector) {
    return res.status(404).json({ error: 'Sector not found' });
  }

  sector.activeSignageMessage = activeSignageMessage;
  sector.signageCommandSent = `PUSH_API_SUCCESS: MANUAL OVERRIDE SENT AT ${new Date().toLocaleTimeString()} (SECURE_LED_IP)`;

  addBlockchainReceipt(
    'SIGNAGE_OVERRIDE_ISSUED',
    `Manual digital signage override pushed to sector [${sector.name}]: "${activeSignageMessage}"`
  );

  res.json(stadiumState);
});

// POST - Fan Companion Q&A Assistant ("Ask ArenaAI")
// Grounded in STADIUM_GUIDE to prevent hallucinations, and is aware of live stadium sector/incident metrics
app.post('/api/fan/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0 || question.length > 1000) {
    return res.status(400).json({ error: 'Question must be a valid non-empty string under 1000 characters' });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      // Create summary of live stadium congestion to give Gemini real-time awareness
      const congestedSectors = stadiumState.sectors
        .filter(s => s.status !== 'normal')
        .map(s => `${s.name}: wait ${s.queueTimeMin} mins, density ${s.currentDensity}%`)
        .join(', ');

      const activeIncidents = stadiumState.incidents
        .filter(i => !i.resolved)
        .map(i => `${i.type} at ${i.sectorId}`)
        .join(', ');

      const prompt = `
        You are ArenaAI, the exceptionally friendly, helpful, and polite virtual guide for fans attending the FIFA World Cup 2026 at Estadio Azteca.
        The fan is asking: "${question}"

        STADIUM REFERENCE GUIDE:
        ${STADIUM_GUIDE}

        REAL-TIME STADIUM UPDATE (AWARENESS):
        - Current Match/Tournament Stage: ${stadiumState.gamePhase}
        - Teams playing: ${stadiumState.matchDetails.teams} (${stadiumState.matchDetails.score})
        - Congested Stadium Areas: ${congestedSectors || 'All gates and stands are normal.'}
        - Current Active Bottlenecks/Incidents: ${activeIncidents || 'None. Operations are moving smoothly.'}

        Your task:
        - Provide an accurate, polite, and reassuring response to the fan's question.
        - Answer in the language the fan asked in (e.g., if they ask in Spanish, answer in elegant Spanish; if English, answer in English, etc.).
        - Base your answers STRICTLY on the Stadium Reference Guide and current live updates. Do NOT invent policies.
        - Be highly descriptive about accessibility routes (ramps, elevators, low-sensory Calm Room in Suite 204), clear bag policy (12x6x12 inches, clear plastic), water fountains, and sustainable cup deposit (50 MXN).
        - Keep answers concise, highly readable with bullet points where appropriate, and formatted in Markdown.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ answer: response.text });
    } catch (err) {
      console.error('Error answering fan question:', err);
      res.status(500).json({ error: 'Failed to generate answer via Gemini' });
    }
  } else {
    // Return friendly local fallback answers
    const answer = handleFallbackFanAsk(question);
    res.json({ answer });
  }
});

// POST - Fan Announcement Translation
app.post('/api/fan/translate-announcement', async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Text and targetLanguage are required' });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `
        Translate the following stadium-wide public address announcement into "${targetLanguage}":
        "${text}"

        Provide only the translated announcement text, maintaining a professional, clear, and reassuring tone suitable for stadium intercom systems. Do not include introductory notes or explanations.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });
      res.json({ translation: response.text?.trim() });
    } catch (err) {
      console.error('Error translating announcement:', err);
      res.json({ translation: `${text} (Translation to ${targetLanguage} failed - showing original)` });
    }
  } else {
    // Simulated translation fallback
    const translations: Record<string, string> = {
      Spanish: 'Atención aficionados: ' + text + ' (Traducido automáticamente en modo de simulación local)',
      French: 'Attention supporters: ' + text + ' (Traduction simulée locale)',
      Arabic: 'انتباه للجماهير: ' + text + ' (ترجمة محاكاة محلية)',
      German: 'Achtung Fans: ' + text + ' (Lokale simulierte Übersetzung)',
    };
    res.json({ translation: translations[targetLanguage] || `${text} (Simulated translation to ${targetLanguage})` });
  }
});

// POST - Place Concession Order
app.post('/api/stadium/order', (req, res) => {
  const { items, seatInfo, deliveryType, totalPrice } = req.body;
  if (!items || !seatInfo || !deliveryType) {
    return res.status(400).json({ error: 'Missing order details' });
  }

  const newOrder = {
    id: `ord-${Date.now()}`,
    items,
    seatInfo,
    deliveryType,
    totalPrice,
    status: 'received' as const,
    timestamp: new Date().toISOString()
  };

  stadiumState.concessionOrders.unshift(newOrder);

  // Status progression timer simulation
  setTimeout(() => {
    const ord = stadiumState.concessionOrders.find(o => o.id === newOrder.id);
    if (ord) ord.status = 'preparing';
  }, 8000);

  setTimeout(() => {
    const ord = stadiumState.concessionOrders.find(o => o.id === newOrder.id);
    if (ord) ord.status = 'ready';
  }, 20000);

  if (deliveryType === 'seat') {
    setTimeout(() => {
      const ord = stadiumState.concessionOrders.find(o => o.id === newOrder.id);
      if (ord) ord.status = 'delivered';
    }, 35000);
  }

  res.json({ success: true, order: newOrder, concessionOrders: stadiumState.concessionOrders });
});

// POST - Upload Fan Cam Photo
app.post('/api/stadium/fancam', (req, res) => {
  const { username, caption, url } = req.body;
  const newPhoto = {
    id: `cam-${Date.now()}`,
    url: url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80',
    username: username || '@AztecaFan',
    caption: caption || 'Estadio Azteca is amazing!',
    timestamp: new Date().toISOString(),
    likes: 0,
    jumbotronFeatured: false
  };

  stadiumState.fanCamPhotos.unshift(newPhoto);
  res.json({ success: true, photo: newPhoto, fanCamPhotos: stadiumState.fanCamPhotos });
});

// POST - Like a Fan Cam Photo
app.post('/api/stadium/fancam/like', (req, res) => {
  const { id } = req.body;
  const photo = stadiumState.fanCamPhotos.find(p => p.id === id);
  if (photo) {
    photo.likes += 1;
  }
  res.json({ success: true, fanCamPhotos: stadiumState.fanCamPhotos });
});

// POST - Feature Fan Cam Photo on Jumbotron
app.post('/api/stadium/fancam/feature', (req, res) => {
  const { id } = req.body;
  const photo = stadiumState.fanCamPhotos.find(p => p.id === id);
  if (photo) {
    photo.jumbotronFeatured = !photo.jumbotronFeatured;

    if (photo.jumbotronFeatured) {
      stadiumState.announcements.unshift({
        id: `ann-${Date.now()}`,
        text: `🎥 JUMBOTRON SHOWCASE: Fan photo by ${photo.username} ("${photo.caption}") is now featured on the Estadio Azteca screens!`,
        timestamp: new Date().toISOString()
      });
    }
  }
  res.json({ success: true, fanCamPhotos: stadiumState.fanCamPhotos, announcements: stadiumState.announcements });
});

// POST - Dispatch Staff to a Sector
app.post('/api/stadium/dispatch', (req, res) => {
  const { sectorId, type, stewards } = req.body;
  if (!sectorId || !type) {
    return res.status(400).json({ error: 'sectorId and type are required' });
  }

  const coordinates: Record<string, { lat: number; lng: number }> = {
    'gate-a': { lat: 19.3039, lng: -99.1510 },
    'gate-b': { lat: 19.3029, lng: -99.1500 },
    'gate-c': { lat: 19.3019, lng: -99.1510 },
    'gate-d': { lat: 19.3029, lng: -99.1520 },
    'stand-north': { lat: 19.3035, lng: -99.1510 },
    'stand-east': { lat: 19.3029, lng: -99.1505 },
    'stand-south': { lat: 19.3023, lng: -99.1510 },
    'stand-west': { lat: 19.3029, lng: -99.1515 },
  };

  const gps = coordinates[sectorId] || { lat: 19.3029, lng: -99.1510 };

  const newDispatch = {
    id: `disp-${Date.now()}`,
    sectorId,
    type,
    stewards: stewards || [`Stew-${Math.floor(100 + Math.random() * 899)}`, `Stew-${Math.floor(100 + Math.random() * 899)}`],
    gpsCoordinates: gps,
    status: 'dispatched' as const,
    timestamp: new Date().toISOString()
  };

  stadiumState.activeDispatches.unshift(newDispatch);

  // Progress dispatch status after 8 seconds to 'on-scene'
  setTimeout(() => {
    const disp = stadiumState.activeDispatches.find(d => d.id === newDispatch.id);
    if (disp) disp.status = 'on-scene';
  }, 8000);

  res.json({ success: true, dispatch: newDispatch, activeDispatches: stadiumState.activeDispatches });
});

// POST - Resolve Staff Dispatch
app.post('/api/stadium/dispatch/resolve', (req, res) => {
  const { id } = req.body;
  const dispIndex = stadiumState.activeDispatches.findIndex(d => d.id === id);
  if (dispIndex !== -1) {
    stadiumState.activeDispatches[dispIndex].status = 'resolved';
  }
  res.json({ success: true, activeDispatches: stadiumState.activeDispatches });
});

// Start-up triggers
applySimulationState('pre-match');

// Janitor fallback generator for incident logging
function generateFallbackIncident(sectorId: string, type: string, description: string) {
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let recommendations = '';
  let dispatchSms = '';
  let paAnnouncementDrafts = { en: '', es: '', fr: '', ar: '' };

  const lowerDesc = description.toLowerCase();
  const lowerType = type.toLowerCase();

  if (lowerDesc.includes('medical') || lowerDesc.includes('injur') || lowerDesc.includes('faint') || lowerType.includes('medical')) {
    severity = 'high';
    recommendations = `1. Dispatch medical rapid response team to Sector ${sectorId} immediately.\n2. Guide medical personnel through the nearest elevators (ADA lanes).\n3. Keep adjacent walkways clear and have guest services reassure onlookers.`;
    dispatchSms = `MED: Medical emergency in Sector ${sectorId}. Rapid response team dispatched with stretcher. Secure path.`;
    paAnnouncementDrafts = {
      en: 'Medical assistance has been dispatched to Sector ' + sectorId.toUpperCase() + '. Please keep walkways clear for emergency personnel.',
      es: 'La asistencia médica ha sido enviada al Sector ' + sectorId.toUpperCase() + '. Por favor, mantenga los pasillos despejados.',
      fr: 'Une assistance médicale a été envoyée au secteur ' + sectorId.toUpperCase() + '. Veuillez laisser les passages libres.',
      ar: 'تم إرسال المساعدة الطبية إلى القطاع ' + sectorId.toUpperCase() + '. يرجى الحفاظ على الممرات خالية.'
    };
  } else if (lowerDesc.includes('fight') || lowerDesc.includes('security') || lowerDesc.includes('crowd') || lowerDesc.includes('lock') || lowerDesc.includes('stuck')) {
    severity = 'high';
    recommendations = `1. Deploy response stewards to Sector ${sectorId} to check crowd flow barrier.\n2. Open safety gates or auxiliary exit lanes if backing up.\n3. Request on-site supervisors to meter entrance flow.`;
    dispatchSms = `SEC: Crowd pressure/barrier issue in Sector ${sectorId}. Dispatch security stewards to assist with queue flow control.`;
    paAnnouncementDrafts = {
      en: 'Attention fans near Sector ' + sectorId.toUpperCase() + ': Please proceed slowly and follow stadium stewards directions. Thank you.',
      es: 'Atención aficionados cerca del Sector ' + sectorId.toUpperCase() + ': Por favor, avancen despacio y sigan las indicaciones del personal.',
      fr: 'Attention aux supporters près du secteur ' + sectorId.toUpperCase() + ': Veuillez avancer lentement et suivre les instructions des stadiers.',
      ar: 'انتباه للجماهير بالقرب من القطاع ' + sectorId.toUpperCase() + ': يرجى التقدم ببطء واتباع توجيهات مشرفي الملعب.'
    };
  } else if (lowerDesc.includes('spill') || lowerDesc.includes('water') || lowerDesc.includes('slip') || lowerDesc.includes('leak')) {
    severity = 'low';
    recommendations = `1. Dispatch janitorial staff to Sector ${sectorId} with hazard cleanup kit.\n2. Place wet floor warning signs on both sides of the concourse.\n3. Wipe down surfaces and dry area completely.`;
    dispatchSms = `CLEAN: Spill hazard reported in Sector ${sectorId}. Janitor dispatched with spill signs.`;
    paAnnouncementDrafts = {
      en: 'Please proceed with caution in Sector ' + sectorId.toUpperCase() + ' due to a temporary clean-up operation.',
      es: 'Por favor, transite con precaución en el Sector ' + sectorId.toUpperCase() + ' debido a labores de limpieza.',
      fr: 'Veuillez marcher prudemment dans le secteur ' + sectorId.toUpperCase() + ' en raison d\'une opération de nettoyage temporaire.',
      ar: 'يرجى توخي الحذر في القطاع ' + sectorId.toUpperCase() + ' بسبب عملية تنظيف مؤقتة.'
    };
  } else {
    severity = 'medium';
    recommendations = `1. Dispatch nearest supervisor to investigate reported incident in Sector ${sectorId}.\n2. Inform the Operations Hub of status updates within 5 minutes.\n3. Deploy visual crowd guides if needed.`;
    dispatchSms = `OPS: Incident reported in Sector ${sectorId} (${type}). Supervisor dispatched to evaluate.`;
    paAnnouncementDrafts = {
      en: 'Stadium stewards are currently resolving a minor operational notice in Sector ' + sectorId.toUpperCase() + '. We appreciate your patience.',
      es: 'El personal está resolviendo un aviso operativo menor en el Sector ' + sectorId.toUpperCase() + '. Agradecemos su paciencia.',
      fr: 'Le personnel du stade résout actuellement un incident opérationnel mineur dans le secteur ' + sectorId.toUpperCase() + '. Merci pour votre patience.',
      ar: 'يقوم مشرفو الملعب حالياً بحل مشكلة تشغيلية بسيطة في القطاع ' + sectorId.toUpperCase() + '. نحن نقدر صبركم.'
    };
  }

  return { severity, recommendations, dispatchSms, paAnnouncementDrafts };
}

// Fallback fan answers
function handleFallbackFanAsk(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('bag') || q.includes('policy') || q.includes('bring') || q.includes('backpack')) {
    return `### 🎒 Clear Bag Policy
Estadio Azteca operates a strict **Clear Bag Policy** for FIFA World Cup 2026:
- Bags must be **clear plastic, vinyl, or PVC** and not exceed **12" x 6" x 12"** (30x15x30 cm).
- Small clutch bags (with or without strap) no larger than **4.5" x 6.5"** are permitted.
- Backpacks, large purses, and opaque drawstring bags are strictly **prohibited**.
- *Tip*: Strollers are not allowed inside seating areas but can be checked in at Gate C or Gate A valets.`;
  }

  if (q.includes('water') || q.includes('drink') || q.includes('bottle') || q.includes('hydrate')) {
    return `### 💧 Water & Hydration
- **Free Chilled Water stations** are located at Concourses **102, 115, 204, and 222**.
- You can bring empty, clear, reusable plastic water bottles up to **750ml** to stay hydrated.
- Aluminum flasks, glass bottles, and outside beverages are **prohibited**.`;
  }

  if (q.includes('accessibility') || q.includes('wheelchair') || q.includes('disabled') || q.includes('ada') || q.includes('elevator')) {
    return `### ♿ Accessibility & Inclusion Services
We are committed to a world-class, fully accessible World Cup:
- **Dedicated Access**: **Gate A (North Entrance)** is the primary ADA entry point with direct elevators and zero-step ramp lanes.
- **ADA Elevators** are located at Gate A, Gate B, and Concourse **112** and **134**.
- **Calm Room**: A sensory-safe, sound-dampened Calm Room is available in **Suite 204 (West Stand, Level 2)** for anyone needing sensory decompression. Noise-canceling headphones are also rentable at Guest Services booths (105, 212).
- **ADC Commentary**: Borrow devices at Concourse 105 to listen to live audio descriptive commentary on **FM 88.3 MHz**.`;
  }

  if (q.includes('metro') || q.includes('transit') || q.includes('bus') || q.includes('uber') || q.includes('transport') || q.includes('get to') || q.includes('taxi')) {
    return `### 🚇 Transportation Guide
- **Azteca Metro Station** is located right outside **Gate B (East)**. It is the fastest and most sustainable way to return. Trains operate until **2:00 AM** on match nights.
- **Rideshare (Uber/Didi)**: Dropoffs and pickups are restricted to **Lot 7 outside Gate D (West)**. Note that post-match gridlock can cause high fares and long wait times.
- **Express Shuttles**: Free shuttle buses run from **Lot 4** directly to *Centro Histórico, Reforma, and Condesa* central hubs starting at full-time.`;
  }

  if (q.includes('food') || q.includes('eat') || q.includes('concession') || q.includes('vegan') || q.includes('halal') || q.includes('taco')) {
    return `### 🌮 Food & Concessions
- **Azteca Flavors (Zones A & C)**: Traditional Mexican street tacos, quesadillas, and chips. *Vegetarian, vegan, and halal-certified options* are explicitly marked.
- **Global Bites (Zones B & D)**: Premium burgers, chicken tenders, kosher chicken, and vegan hotdogs.
- **Zero-Waste Cup Deposit**: All beverages are served in reusable souvenir cups. A **50 MXN deposit** is charged, which you can claim back at any return counter, or take the cup home as an official World Cup souvenir!`;
  }

  return `### 🏟️ Welcome to Estadio Azteca!
I am **ArenaAI**, your virtual assistant for the FIFA World Cup 2026. 
I can help you with:
1. **Bag and safety guidelines** (clear bag limits, prohibited items)
2. **Accessibility services** (wheelchair paths, sensory Calm Room, elevator spots)
3. **Food menus** (vegan, halal, kosher, and traditional tacos)
4. **Getting home** (Metro train schedules, Lot 7 rideshare, free Lot 4 city shuttles)

*Please ask me specific questions (e.g., "Where is the Calm Room?" or "Can I bring a reusable bottle?") and I will assist you!*`;
}

// Integrated Vite setup
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArenaCommand Full-Stack Server booted successfully on port ${PORT}`);
  });
}

startServer();
