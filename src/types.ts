export interface StadiumSector {
  id: string;
  name: string;
  currentDensity: number; // 0 to 100
  flowRate: number; // people per minute
  queueTimeMin: number; // minutes
  status: 'normal' | 'congested' | 'critical';
  concessionsWaitMin: number;
  restroomsWaitMin: number;
  accessibilityFeatures: string[];
  activeSignageMessage?: string;
  signageCommandSent?: string;
}

export interface Incident {
  id: string;
  sectorId: string;
  type: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string;
  dispatchSms: string;
  paAnnouncementDrafts: {
    en: string;
    es: string;
    fr: string;
    ar: string;
  };
  resolved: boolean;
  photoUrl?: string;
  photoAnalysis?: string;
  lightweightMetadata?: string;
  blockchainHash?: string;
}

export interface Announcement {
  id: string;
  text: string;
  timestamp: string;
}

export interface ConcessionOrder {
  id: string;
  items: { name: string; quantity: number }[];
  seatInfo: { sectorId: string; rowSeat: string } | string;
  deliveryType: 'pickup' | 'seat';
  totalPrice: number;
  status: 'received' | 'preparing' | 'ready' | 'delivered';
  timestamp: string;
}

export interface FanCamPhoto {
  id: string;
  url: string;
  username: string;
  caption: string;
  timestamp: string;
  likes: number;
  jumbotronFeatured: boolean;
}

export interface StaffDispatch {
  id: string;
  sectorId: string;
  type: string;
  stewards: string[];
  gpsCoordinates: { lat: number; lng: number };
  status: 'dispatched' | 'on-scene' | 'resolved';
  timestamp: string;
}

export interface ParkingSpot {
  id: string;
  name: string;
  totalSpots: number;
  availableSpots: number;
}

export interface StadiumState {
  gamePhase: 'pre-match' | 'first-half' | 'halftime' | 'second-half' | 'post-match' | 'dispersal' | 'emergency';
  matchDetails: {
    teams: string;
    score: string;
    timeElapsed: string;
    stadiumName: string;
    attendance: string;
    capacity: string;
  };
  sectors: StadiumSector[];
  incidents: Incident[];
  announcements: Announcement[];
  concessionOrders: ConcessionOrder[];
  fanCamPhotos: FanCamPhoto[];
  activeDispatches: StaffDispatch[];
  parkingSpots: ParkingSpot[];
  networkState?: {
    packetLoss: number;
    latencyMs: number;
    resilienceModeActive: boolean;
    meshRelayQuality: number;
    syntheticCorruptionActive: boolean;
  };
  blockchainReceipts?: BlockchainReceipt[];
}

export interface BlockchainReceipt {
  hash: string;
  prevHash: string;
  timestamp: string;
  action: string;
  details: string;
  blockNumber: number;
}

export interface LoraTelemetryPacket {
  id: string;
  node: string;
  event: string;
  status: 'DELIVERED 100% ACK' | 'RETRY ACTIVE' | 'SLOW HOP' | 'CRC RECOVERED' | 'BATCHED RELAY OK' | 'DROPPED_FRAG';
  time: string;
}

export interface EdgeSensorTelemetry {
  nodeId: string;
  flowRate: number;
  congestionIndex: number;
  meshSignalRssiDbm: number;
  batteryChargePct: number;
  responseLatencyMs: number;
  timestamp: string;
}