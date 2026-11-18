import { logger } from '../utils/logger';

export interface GHJob {
  id: string;
  location: [number, number]; // [lng, lat]
  service_time?: number; // segundos
  time_windows?: [number, number][]; // [earliest, latest] em segundos desde epoch
  priority?: number; // 1-10
  skills?: string[];
  required_skills?: string[];
}

export interface GHVehicle {
  vehicle_id: string;
  start_location: [number, number];
  end_location?: [number, number];
  capacity?: number[];
  skills?: string[];
  time_window?: [number, number];
  max_distance?: number;
  max_duration?: number;
}

export interface GHRelation {
  type: 'in_direct_sequence' | 'in_sequence' | 'same_vehicle' | 'different_vehicles';
  jobs: string[];
  vehicle_id?: string;
}

export interface GHObjective {
  type: 'min' | 'max';
  value: 'vehicles' | 'completion_time' | 'transport_time' | 'waiting_time' | 'activities' | 'distance';
}

export interface GHConfiguration {
  routing?: {
    calc_points?: boolean;
    snap_preventions?: string[];
    curve?: string;
  };
  optimization?: {
    max_vehicles?: number;
    max_tour_duration?: number;
    max_tour_distance?: number;
  };
}

export interface GHVRPRequest {
  jobs: GHJob[];
  vehicles: GHVehicle[];
  relations?: GHRelation[];
  objectives?: GHObjective[];
  configuration?: GHConfiguration;
}

export interface GHVRPResponse {
  solution: {
    routes: GHRoute[];
    unassigned: GHUnassigned[];
    cost: number;
    transport_time: number;
    completion_time: number;
    waiting_time: number;
    activities: number;
    distance: number;
  };
  error?: string;
}

export interface GHRoute {
  vehicle_id: string;
  activities: GHActivity[];
  cost: number;
  transport_time: number;
  completion_time: number;
  waiting_time: number;
  distance: number;
  points?: GHPoints;
}

export interface GHActivity {
  type: 'start' | 'end' | 'job';
  job_id?: string;
  location: [number, number];
  arrival: number; // timestamp
  departure: number; // timestamp
  service_time?: number;
  waiting_time?: number;
}

export interface GHPoints {
  coordinates: [number, number][];
  encoded_polyline?: string;
}

export interface GHUnassigned {
  job_id: string;
  reasons: Array<{ code: string; description: string }>;
}

export interface GHRouteRequest {
  points: [number, number][];
  vehicle?: string;
  points_encoded?: boolean;
  instructions?: boolean;
  calc_points?: boolean;
  elevation?: boolean;
  simplify?: boolean;
  details?: string[];
}

export interface GHRouteResponse {
  paths: GHPath[];
  info: {
    copyrights: string[];
    took: number;
  };
}

export interface GHPath {
  distance: number;
  time: number; // ms
  ascend: number;
  descend: number;
  points: {
    coordinates: [number, number][];
    encoded_polyline?: string;
  };
  instructions?: GHInstruction[];
  details?: Record<string, number[][]>;
}

export interface GHInstruction {
  distance: number;
  time: number; // ms
  sign: number;
  text: string;
  interval: [number, number];
  interval_points: number[];
}

export class GraphHopperService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(baseUrl: string = process.env.GRAPHHOPPER_BASE_URL || 'http://localhost:8989') {
    this.baseUrl = baseUrl;
  }

  private getCacheKey(endpoint: string, body: any): string {
    return `${endpoint}:${JSON.stringify(body)}`;
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

  private async request<T>(endpoint: string, body: any): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, body);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000), // VRP pode demorar mais
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GraphHopper ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`GraphHopper error: ${data.errors.map(e => e.detail).join(', ')}`);
      }

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.error({ err: error, url }, 'GraphHopper request failed');
      throw error;
    }
  }

  /**
   * VRP Optimization - jsprit
   */
  async optimizeVRP(request: GHVRPRequest): Promise<GHVRPResponse> {
    return this.request('/vrp/optimize', request);
  }

  /**
   * Route calculation (point-to-point)
   */
  async route(request: GHRouteRequest): Promise<GHRouteResponse> {
    const params = new URLSearchParams();
    if (request.vehicle) params.append('vehicle', request.vehicle);
    if (request.points_encoded !== undefined) params.append('points_encoded', request.points_encoded.toString());
    if (request.instructions !== undefined) params.append('instructions', request.instructions.toString());
    if (request.calc_points !== undefined) params.append('calc_points', request.calc_points.toString());
    if (request.elevation !== undefined) params.append('elevation', request.elevation.toString());
    if (request.simplify !== undefined) params.append('simplify', request.simplify.toString());
    if (request.details) params.append('details', request.details.join(','));

    // Para route, o body contém os pontos
    return this.request(`/route?${params.toString()}`, { points: request.points });
  }

  /**
   * Matrix API - distâncias/durações entre múltiplos pontos
   */
  async matrix(points: [number, number][], options: {
    vehicle?: string;
    from_indices?: number[];
    to_indices?: number[];
    out_arrays?: string[];
  } = {}): Promise<any> {
    const body = {
      points: points.map(([lng, lat]) => [lat, lng]), // GH usa [lat, lng]
      vehicle: options.vehicle || 'car',
      from_indices: options.from_indices,
      to_indices: options.to_indices,
      out_arrays: options.out_arrays || ['distances', 'times'],
    };

    return this.request('/matrix', body);
  }

  /**
   * Isochrone API - área alcançável
   */
  async isochrone(point: [number, number], options: {
    vehicle?: string;
    buckets?: number[];
    reverse_flow?: boolean;
  } = {}): Promise<any> {
    const body = {
      point: [point[1], point[0]], // [lat, lng]
      vehicle: options.vehicle || 'car',
      buckets: options.buckets || [600, 1200, 1800], // 10, 20, 30 min em segundos
      reverse_flow: options.reverse_flow || false,
    };

    return this.request('/isochrone', body);
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

  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton
export const graphhopperService = new GraphHopperService();

// Helper: Convert OSRM waypoints to GH jobs
export function waypointsToGHJobs(waypoints: any[]): any[] {
  return waypoints.map((wp, idx) => ({
    id: wp.id || `job_${idx}`,
    location: [wp.longitude, wp.latitude] as [number, number],
    service_time: 300, // 5 min default
    // time_windows: wp.timeWindow ? [[wp.timeWindow.start, wp.timeWindow.end]] : undefined,
  }));
}

// Helper: Convert vehicle to GH vehicle
export function vehicleToGHVehicle(vehicle: any, startLocation: [number, number]): any => ({
  vehicle_id: vehicle.id,
  start_location: startLocation,
  end_location: vehicle.endLocation,
  capacity: vehicle.capacity ? [vehicle.capacity] : undefined,
  skills: vehicle.skills,
  time_window: vehicle.timeWindow ? [vehicle.timeWindow.start, vehicle.timeWindow.end] : undefined,
  max_distance: vehicle.maxDistance,
  max_duration: vehicle.maxDuration,
});