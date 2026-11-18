import { logger } from '../utils/logger';

export interface OSRMWaypoint {
  location: [number, number]; // [lng, lat]
  name?: string;
  waypoint_index: number;
  trips_index: number;
}

export interface OSRMTrip {
  geometry: string; // polyline6
  legs: OSRMLeg[];
  weight: number;
  distance: number;
  duration: number;
}

export interface OSRMLeg {
  via_waypoints: any[];
  admins: any[];
  weight: number;
  distance: number;
  duration: number;
  steps: OSRMStep[];
  summary: string;
}

export interface OSRMStep {
  geometry: string; // polyline6
  distance: number;
  duration: number;
  weight: number;
  name: string;
  ref: string;
  pronunciation: string;
  destinations: string;
  exits: string;
  mode: string;
  maneuver: OSRMManuever;
  intersections: OSRMIntersection[];
  rotary_name: string;
  rotary_pronunciation: string;
}

export interface OSRMManuever {
  type: string;
  instruction: string;
  bearing_before: number;
  bearing_after: number;
  location: [number, number];
  modifier?: string;
  exit?: number;
}

export interface OSRMIntersection {
  location: [number, number];
  bearings: number[];
  entry: boolean[];
  in: number;
  out: number;
  lanes?: OSRMLane[];
}

export interface OSRMLane {
  indications: string[];
  valid: boolean;
}

export interface OSRMTableResult {
  distances: number[][];
  durations: number[][];
  sources: OSRMSource[];
  destinations: OSRMDestination[];
}

export interface OSRMSource {
  location: [number, number];
  name: string;
  hint: string;
}

export interface OSRMDestination {
  location: [number, number];
  name: string;
  hint: string;
}

export class OSRMService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(baseUrl: string = process.env.OSRM_BASE_URL || 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  private getCacheKey(endpoint: string, params: URLSearchParams): string {
    return `${endpoint}?${params.toString()}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async request<T>(endpoint: string, params: URLSearchParams): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}${endpoint}?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EntregaFacil/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OSRM ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.code !== 'Ok') {
        throw new Error(`OSRM error: ${data.message || data.code}`);
      }

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error({ err: error, url }, 'OSRM request failed');
      throw error;
    }
  }

  /**
   * Trip endpoint - resolve TSP (Traveling Salesman Problem) guloso
   * Retorna ordem ótima dos waypoints
   */
  async trip(waypoints: [number, number][], options: {
    source?: 'first' | 'any';
    destination?: 'last' | 'any';
    roundtrip?: boolean;
    steps?: boolean;
    annotations?: 'duration' | 'distance' | 'duration,distance';
    geometries?: 'polyline' | 'polyline6' | 'geojson';
    overview?: 'full' | 'simplified' | 'false';
  } = {}): Promise<{
    waypoints: OSRMWaypoint[];
    trips: OSRMTrip[];
    code: string;
  }> {
    const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const params = new URLSearchParams({
      steps: (options.steps ?? true).toString(),
      source: options.source ?? 'first',
      destination: options.destination ?? 'last',
      roundtrip: (options.roundtrip ?? false).toString(),
      geometries: options.geometries ?? 'polyline6',
      overview: options.overview ?? 'simplified',
      annotations: options.annotations ?? 'duration,distance',
    });

    return this.request(`/trip/v1/driving/${coords}`, params);
  }

  /**
   * Route endpoint - rota ponto a ponto (para recálculo de desvio)
   */
  async route(waypoints: [number, number][], options: {
    steps?: boolean;
    annotations?: 'duration' | 'distance' | 'duration,distance';
    geometries?: 'polyline' | 'polyline6' | 'geojson';
    overview?: 'full' | 'simplified' | 'false';
    alternatives?: boolean;
    continue_straight?: boolean;
  } = {}): Promise<{
    routes: OSRMTrip[];
    waypoints: OSRMWaypoint[];
    code: string;
  }> {
    const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const params = new URLSearchParams({
      steps: (options.steps ?? true).toString(),
      geometries: options.geometries ?? 'polyline6',
      overview: options.overview ?? 'simplified',
      annotations: options.annotations ?? 'duration,distance',
      alternatives: (options.alternatives ?? false).toString(),
      continue_straight: (options.continue_straight ?? true).toString(),
    });

    return this.request(`/route/v1/driving/${coords}`, params);
  }

  /**
   * Table endpoint - matriz de distâncias/durações
   */
  async table(sources: [number, number][], destinations?: [number, number][], options: {
    annotations?: 'duration' | 'distance' | 'duration,distance';
  } = {}): Promise<OSRMTableResult> {
    const allPoints = destinations ? [...sources, ...destinations] : sources;
    const coords = allPoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    
    const params = new URLSearchParams({
      annotations: options.annotations ?? 'duration,distance',
    });

    if (destinations) {
      params.append('sources', sources.map((_, i) => i.toString()).join(';'));
      params.append('destinations', destinations.map((_, i) => (sources.length + i).toString()).join(';'));
    }

    return this.request(`/table/v1/driving/${coords}`, params);
  }

  /**
   * Nearest endpoint - snap coordenada para rua mais próxima
   */
  async nearest(coordinate: [number, number], options: {
    number?: number;
  } = {}): Promise<{
    waypoints: OSRMWaypoint[];
    code: string;
  }> {
    const [lng, lat] = coordinate;
    const params = new URLSearchParams({
      number: (options.number ?? 1).toString(),
    });

    return this.request(`/nearest/v1/driving/${lng},${lat}`, params);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { 
        signal: AbortSignal.timeout(5000) 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Limpa cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton
export const osrmService = new OSRMService();