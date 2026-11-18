import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDB } from '../db';
import { rotas } from '../db/schema/rotas';
import { enderecos } from '../db/schema/enderecos';
import { veiculos } from '../db/schema/veiculos';
import { entregas } from '../db/schema/entregas';
import { eq, and, sql, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { apiClient } from '../../mobile/src/shared/api/client'; // Reutiliza tipos se necessário

const routes = new Hono();

routes.use('*', authMiddleware);

// Schemas
const createRouteSchema = z.object({
  nome: z.string().min(1).max(100),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  veiculoId: z.string().uuid('Veículo inválido'),
  waypoints: z.array(z.object({
    enderecoId: z.string().uuid(),
    ordem: z.number().int().nonnegative(),
    status: z.enum(['pendente', 'em_rota', 'entregue', 'problema', 'cancelada']).default('pendente'),
  })).min(2, 'Mínimo 2 waypoints').max(50, 'Máximo 50 waypoints'),
});

const updateRouteSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  veiculoId: z.string().uuid().optional(),
  status: z.enum(['rascunho', 'otimizada', 'em_andamento', 'concluida', 'parcial', 'cancelada']).optional(),
  waypoints: z.array(z.object({
    id: z.string().uuid().optional(),
    enderecoId: z.string().uuid(),
    ordem: z.number().int().nonnegative(),
    status: z.enum(['pendente', 'em_rota', 'entregue', 'problema', 'cancelada']).optional(),
  })).optional(),
});

const optimizeRouteSchema = z.object({
  source: z.enum(['first', 'any']).default('first'),
  destination: z.enum(['last', 'any']).default('last'),
  roundtrip: z.boolean().default(false),
});

// GET /routes - Lista rotas do motorista
routes.get('/', async (c) => {
  const user = c.get('user');
  const db = getDB();

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const offset = (page - 1) * limit;

  const conditions = [eq(rotas.motoristaId, user.motoristaId)];
  if (status) conditions.push(eq(rotas.status, status));

  const [data, total] = await Promise.all([
    db.select()
      .from(rotas)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(rotas.data), desc(rotas.createdAt)),
    db.select({ count: sql`count(*)` })
      .from(rotas)
      .where(and(...conditions)),
  ]);

  // Adiciona contadores de status dos waypoints
  const routesWithCounts = await Promise.all(data.map(async (r) => {
    const waypoints = r.waypoints as any[];
    const counts = {
      total: waypoints.length,
      pendente: waypoints.filter(w => w.status === 'pendente').length,
      em_rota: waypoints.filter(w => w.status === 'em_rota').length,
      entregue: waypoints.filter(w => w.status === 'entregue').length,
      problema: waypoints.filter(w => w.status === 'problema').length,
      cancelada: waypoints.filter(w => w.status === 'cancelada').length,
    };
    return { ...r, waypointCounts: counts };
  }));

  return c.json({
    data: routesWithCounts,
    pagination: {
      page,
      limit,
      total: Number(total[0].count),
      totalPages: Math.ceil(Number(total[0].count) / limit),
    },
  });
});

// GET /routes/:id - Busca rota por ID
routes.get('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const [rota] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, id), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!rota) {
    return c.json({ error: 'Rota não encontrada' }, 404);
  }

  // Busca detalhes dos endereços dos waypoints
  const waypoints = rota.waypoints as any[];
  const enderecoIds = waypoints.map(w => w.enderecoId);
  
  let enderecosMap = new Map();
  if (enderecoIds.length > 0) {
    const enderecosData = await db.select()
      .from(enderecos)
      .where(sql`${enderecos.id} IN (${enderecosMap})`); // Placeholder, vamos fazer query correta
    
    // Query correta com IN
    const placeholders = enderecoIds.map(() => '?').join(',');
    const enderecosData2 = await db.select()
      .from(enderecos)
      .where(sql`${enderecos.id} IN (${sql.raw(enderecoIds.map(() => '?').join(','))})`);
    
    // Como Drizzle não tem IN direto simples, vamos buscar individualmente
    for (const eid of enderecoIds) {
      const [e] = await db.select().from(enderecos).where(eq(enderecos.id, eid)).limit(1);
      if (e) enderecosMap.set(eid, e);
    }
  }

  const waypointsWithDetails = waypoints.map(w => ({
    ...w,
    endereco: enderecosMap.get(w.enderecoId) || null,
  }));

  return c.json({ ...rota, waypoints: waypointsWithDetails });
});

// POST /routes - Cria nova rota
routes.post('/', zValidator('json', createRouteSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  const db = getDB();

  // Valida se veículo pertence ao motorista
  const [vehicle] = await db.select()
    .from(veiculos)
    .where(and(eq(veiculos.id, data.veiculoId), eq(veiculos.motoristaId, user.motoristaId)))
    .limit(1);

  if (!vehicle) {
    return c.json({ error: 'Veículo não encontrado ou não pertence a você' }, 404);
  }

  // Valida se todos os endereços pertencem ao motorista
  const enderecoIds = data.waypoints.map(w => w.enderecoId);
  const enderecosValidos = await db.select({ id: enderecos.id })
    .from(enderecos)
    .where(and(eq(enderecos.motoristaId, user.motoristaId), sql`${enderecos.id} IN (${enderecosValidos})`));
  
  if (enderecosValidos.length !== enderecoIds.length) {
    return c.json({ error: 'Um ou mais endereços não pertencem a você' }, 403);
  }

  // Verifica duplicatas na rota
  const uniqueEnderecos = new Set(enderecoIds);
  if (uniqueEnderecos.size !== enderecoIds.length) {
    return c.json({ error: 'Não é permitido adicionar o mesmo endereço mais de uma vez na rota' }, 409);
  }

  // Busca coordenadas dos endereços para waypoints
  const waypointsWithCoords = await Promise.all(data.waypoints.map(async (w, idx) => {
    const [endereco] = await db.select()
      .from(enderecos)
      .where(eq(enderecos.id, w.enderecoId))
      .limit(1);
    
    return {
      id: crypto.randomUUID(),
      rotaId: '', // será preenchido depois
      enderecoId: w.enderecoId,
      ordem: w.ordem,
      status: w.status,
      latitude: endereco.latitude,
      longitude: endereco.longitude,
      enderecoNome: endereco.nome,
      enderecoFormatado: endereco.enderecoFormatado,
    };
  }));

  // Ordena por ordem
  waypointsWithCoords.sort((a, b) => a.ordem - b.ordem);

  const [novaRota] = await db.insert(rotas).values({
    motoristaId: user.motoristaId,
    veiculoId: data.veiculoId,
    nome: data.nome,
    data: new Date(data.data),
    status: 'rascunho',
    waypoints: waypointsWithCoords,
  }).returning();

  // Atualiza waypoints com rotaId
  const finalWaypoints = waypointsWithCoords.map(w => ({ ...w, rotaId: novaRota.id }));
  await db.update(rotas)
    .set({ waypoints: finalWaypoints })
    .where(eq(rotas.id, novaRota.id));

  logger.info({ rotaId: novaRota.id, motoristaId: user.motoristaId, waypoints: waypointsWithCoords.length }, 'Rota criada');

  return c.json({ ...novaRota, waypoints: finalWaypoints }, 201);
});

// PUT /routes/:id - Atualiza rota
routes.put('/:id', zValidator('param', z.object({ id: z.string().uuid() })), zValidator('json', updateRouteSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = getDB();

  const [existing] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, id), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Rota não encontrada' }, 404);
  }

  // Se mudando veículo, valida
  if (data.veiculoId) {
    const [vehicle] = await db.select()
      .from(veiculos)
      .where(and(eq(veiculos.id, data.veiculoId), eq(veiculos.motoristaId, user.motoristaId)))
      .limit(1);
    if (!vehicle) {
      return c.json({ error: 'Veículo não encontrado' }, 404);
    }
  }

  // Se atualizando waypoints
  let finalWaypoints = existing.waypoints as any[];
  if (data.waypoints) {
    // Valida endereços
    const enderecoIds = data.waypoints.map(w => w.enderecoId);
    const enderecosValidos = await db.select({ id: enderecos.id })
      .from(enderecos)
      .where(and(eq(enderecos.motoristaId, user.motoristaId), sql`${enderecos.id} IN (${enderecosValidos})`));
    
    if (enderecosValidos.length !== enderecoIds.length) {
      return c.json({ error: 'Um ou mais endereços não pertencem a você' }, 403);
    }

    // Verifica duplicatas
    const uniqueEnderecos = new Set(enderecoIds);
    if (uniqueEnderecos.size !== enderecoIds.length) {
      return c.json({ error: 'Endereços duplicados na rota' }, 409);
    }

    // Busca coordenadas
    finalWaypoints = await Promise.all(data.waypoints.map(async (w, idx) => {
      const [endereco] = await db.select()
        .from(enderecos)
        .where(eq(enderecos.id, w.enderecoId))
        .limit(1);
      
      return {
        id: w.id || crypto.randomUUID(),
        rotaId: id,
        enderecoId: w.enderecoId,
        ordem: w.ordem,
        status: w.status || 'pendente',
        latitude: endereco.latitude,
        longitude: endereco.longitude,
        enderecoNome: endereco.nome,
        enderecoFormatado: endereco.enderecoFormatado,
      };
    }));
    finalWaypoints.sort((a, b) => a.ordem - b.ordem);
  }

  const [updated] = await db.update(rotas)
    .set({
      ...data,
      waypoints: finalWaypoints,
      updatedAt: new Date(),
    })
    .where(eq(rotas.id, id))
    .returning();

  return c.json(updated);
});

// DELETE /routes/:id - Remove rota
routes.delete('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const result = await db.delete(rotas)
    .where(and(eq(rotas.id, id), eq(rotas.motoristaId, user.motoristaId)))
    .returning({ id: rotas.id });

  if (result.length === 0) {
    return c.json({ error: 'Rota não encontrada' }, 404);
  }

  return c.json({ message: 'Rota removida com sucesso' });
});

// POST /routes/:id/optimize - Otimiza rota com OSRM
routes.post('/:id/optimize', zValidator('param', z.object({ id: z.string().uuid() })), zValidator('json', optimizeRouteSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const { source, destination, roundtrip } = c.req.valid('json');
  const db = getDB();

  const [rota] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, id), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!rota) {
    return c.json({ error: 'Rota não encontrada' }, 404);
  }

  if (rota.status === 'em_andamento' || rota.status === 'concluida') {
    return c.json({ error: 'Não é possível otimizar rota em andamento ou finalizada' }, 400);
  }

  const waypoints = rota.waypoints as any[];
  if (waypoints.length < 2) {
    return c.json({ error: 'Mínimo 2 waypoints para otimizar' }, 400);
  }

  // Prepara coordenadas para OSRM (formato: lng,lat)
  const coordinates = waypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
  
  try {
    // Chama OSRM Trip endpoint
    const osrmUrl = `${process.env.OSRM_BASE_URL || 'http://localhost:5000'}/trip/v1/driving/${coordinates}`;
    const params = new URLSearchParams({
      steps: 'true',
      source,
      destination,
      roundtrip: roundtrip.toString(),
      geometries: 'polyline6',
      overview: 'simplified',
      annotations: 'duration,distance',
    });

    const response = await fetch(`${osrmUrl}?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OSRM error: ${error}`);
    }

    const osrmResult = await response.json();

    if (osrmResult.code !== 'Ok' || !osrmResult.waypoints || osrmResult.waypoints.length === 0) {
      throw new Error('OSRM não encontrou rota válida');
    }

    // Reordena waypoints conforme OSRM
    const orderedWaypoints = osrmResult.waypoints
      .sort((a: any, b: any) => a.waypoint_index - b.waypoint_index)
      .map((wp: any, idx: number) => {
        const originalWp = waypoints.find(w => 
          Math.abs(w.latitude - wp.location[1]) < 0.0001 && 
          Math.abs(w.longitude - wp.location[0]) < 0.0001
        );
        return {
          ...originalWp,
          ordem: idx,
        };
      });

    // Calcula métricas
    const totalDistance = osrmResult.trips[0].distance / 1000; // km
    const totalDuration = Math.round(osrmResult.trips[0].duration / 60); // minutos
    const geometry = osrmResult.trips[0].geometry; // polyline6

    const metricas = {
      distanciaTotalKm: Math.round(totalDistance * 10) / 10,
      tempoEstimadoMin: totalDuration,
      entregues: 0,
      problemas: 0,
      canceladas: 0,
      ganhoEstimado: 0,
      economiaVsManual: 0, // TODO: calcular vs ordem original
    };

    const [updated] = await db.update(rotas)
      .set({
        status: 'otimizada',
        waypoints: orderedWaypoints,
        geometry: { type: 'LineString', coordinates: decodePolyline(geometry) },
        metricas,
        updatedAt: new Date(),
      })
      .where(eq(rotas.id, id))
      .returning();

    logger.info({ rotaId: id, distance: totalDistance, duration: totalDuration }, 'Rota otimizada');

    return c.json({
      ...updated,
      osrm: {
        waypoints: osrmResult.waypoints,
        trips: osrmResult.trips,
      },
    });

  } catch (error) {
    logger.error({ err: error, rotaId: id }, 'Falha ao otimizar rota');
    return c.json({ error: 'Falha ao otimizar rota: ' + (error instanceof Error ? error.message : 'Erro desconhecido') }, 500);
  }
});

// POST /routes/:id/start - Inicia rota
routes.post('/:id/start', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const [rota] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, id), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!rota) return c.json({ error: 'Rota não encontrada' }, 404);
  if (rota.status !== 'otimizada' && rota.status !== 'rascunho') {
    return c.json({ error: 'Rota deve estar otimizada ou em rascunho para iniciar' }, 400);
  }

  const waypoints = rota.waypoints as any[];
  if (waypoints.length === 0) return c.json({ error: 'Rota sem waypoints' }, 400);

  // Atualiza primeiro waypoint para em_rota
  const updatedWaypoints = waypoints.map((w, idx) => ({
    ...w,
    status: idx === 0 ? 'em_rota' : 'pendente',
  }));

  const [updated] = await db.update(rotas)
    .set({
      status: 'em_andamento',
      waypoints: updatedWaypoints,
      updatedAt: new Date(),
    })
    .where(eq(rotas.id, id))
    .returning();

  return c.json(updated);
});

// POST /routes/:id/finish - Finaliza rota
routes.post('/:id/finish', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const [rota] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, id), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!rota) return c.json({ error: 'Rota não encontrada' }, 404);
  if (rota.status !== 'em_andamento') {
    return c.json({ error: 'Rota não está em andamento' }, 400);
  }

  const waypoints = rota.waypoints as any[];
  const entregues = waypoints.filter(w => w.status === 'entregue').length;
  const problemas = waypoints.filter(w => w.status === 'problema').length;
  const canceladas = waypoints.filter(w => w.status === 'cancelada').length;
  const pendentes = waypoints.filter(w => w.status === 'pendente' || w.status === 'em_rota').length;

  const finalStatus = pendentes > 0 ? 'parcial' : 'concluida';

  const [updated] = await db.update(rotas)
    .set({
      status: finalStatus,
      metricas: {
        ...rota.metricas,
        entregues,
        problemas,
        canceladas,
        tempoRealMin: rota.metricas?.tempoRealMin || 0, // TODO: calcular real
      },
      updatedAt: new Date(),
    })
    .where(eq(rotas.id, id))
    .returning();

  return c.json(updated);
});

// Helper: Decode polyline6 (Google encoded polyline)
function decodePolyline(encoded: string): number[][] {
  const points: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push([lng / 1e6, lat / 1e6]); // GeoJSON: [lng, lat]
  }

  return points;
}

// Import crypto
import { crypto } from 'crypto';

export default routes;