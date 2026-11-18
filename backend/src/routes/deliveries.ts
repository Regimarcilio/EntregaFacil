import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDB } from '../db';
import { entregas } from '../db/schema/entregas';
import { rotas } from '../db/schema/rotas';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const deliveries = new Hono();

deliveries.use('*', authMiddleware);

// Schemas
const createDeliverySchema = z.object({
  rotaId: z.string().uuid(),
  waypointId: z.string().uuid(),
  enderecoId: z.string().uuid(),
  fotoUrl: z.string().url(),
  fotoHash: z.string().length(64),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime(),
  assinaturaUrl: z.string().url().optional(),
  observacao: z.string().max(500).optional(),
  tipoProblema: z.enum(['cliente_ausente', 'endereco_errado', 'recusou', 'outro']).optional(),
});

const getDeliveriesQuerySchema = z.object({
  rotaId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['entregue', 'problema']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// POST /deliveries - Cria nova comprovação de entrega
deliveries.post('/', zValidator('json', createDeliverySchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  const db = getDB();

  // Valida se rota pertence ao motorista
  const [rota] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, data.rotaId), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!rota) {
    return c.json({ error: 'Rota não encontrada' }, 404);
  }

  // Verifica duplicata por hash da foto
  const [duplicate] = await db.select()
    .from(entregas)
    .where(eq(entregas.fotoHash, data.fotoHash))
    .limit(1);

  if (duplicate) {
    return c.json({ error: 'Esta foto já foi registrada como comprovação' }, 409);
  }

  const [entrega] = await db.insert(entregas).values({
    ...data,
    timestamp: new Date(data.timestamp),
  }).returning();

  // Atualiza waypoint na rota
  const waypoints = rota.waypoints as any[];
  const updatedWaypoints = waypoints.map((w: any) => {
    if (w.id === data.waypointId) {
      return {
        ...w,
        status: data.tipoProblema ? 'problema' : 'entregue',
        comprovacao: {
          id: entrega.id,
          fotoUrl: entrega.fotoUrl,
          fotoHash: entrega.fotoHash,
          latitude: entrega.latitude,
          longitude: entrega.longitude,
          accuracy: entrega.accuracy,
          timestamp: entrega.timestamp.toISOString(),
          assinaturaUrl: entrega.assinaturaUrl,
          observacao: entrega.observacao,
          tipoProblema: entrega.tipoProblema,
        },
      };
    }
    return w;
  });

  // Verifica se deve avançar para próximo waypoint
  const currentIndex = waypoints.findIndex((w: any) => w.id === data.waypointId);
  let nextWaypointUpdated = false;
  if (currentIndex >= 0 && currentIndex < waypoints.length - 1) {
    const nextStatus = waypoints[currentIndex + 1].status;
    if (nextStatus === 'pendente') {
      updatedWaypoints[currentIndex + 1] = {
        ...updatedWaypoints[currentIndex + 1],
        status: 'em_rota',
      };
      nextWaypointUpdated = true;
    }
  }

  await db.update(rotas)
    .set({
      waypoints: updatedWaypoints,
      updatedAt: new Date(),
    })
    .where(eq(rotas.id, data.rotaId));

  logger.info({ 
    entregaId: entrega.id, 
    rotaId: data.rotaId, 
    waypointId: data.waypointId,
    tipoProblema: data.tipoProblema 
  }, 'Entrega registrada');

  return c.json({
    ...entrega,
    nextWaypointAdvanced: nextWaypointUpdated,
  }, 201);
});

// GET /deliveries - Lista entregas do motorista
deliveries.get('/', zValidator('query', getDeliveriesQuerySchema), async (c) => {
  const user = c.get('user');
  const { rotaId, page, limit, status, startDate, endDate } = c.req.valid('query');
  const db = getDB();

  const offset = (page - 1) * limit;

  const conditions = [eq(entregas.motoristaId, user.motoristaId)];
  // Join com rotas para filtrar por motorista
  // Como Drizzle não tem join fácil aqui, vamos buscar rotas do motorista primeiro
  const rotasDoMotorista = await db.select({ id: rotas.id })
    .from(rotas)
    .where(eq(rotas.motoristaId, user.motoristaId));
  
  const rotaIds = rotasDoMotorista.map(r => r.id);
  
  if (rotaIds.length === 0) {
    return c.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
  }

  conditions.push(sql`${entregas.rotaId} IN (${sql.raw(rotaIds.map(() => '?').join(','))})`);
  
  if (rotaId) conditions.push(eq(entregas.rotaId, rotaId));
  if (status) conditions.push(eq(entregas.tipoProblema, status ? 'problema' : null)); // Aproximação
  if (startDate) conditions.push(sql`${entregas.timestamp} >= ${startDate}`);
  if (endDate) conditions.push(sql`${entregas.timestamp} <= ${endDate}`);

  const [data, total] = await Promise.all([
    db.select()
      .from(entregas)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(entregas.timestamp)),
    db.select({ count: sql`count(*)` })
      .from(entregas)
      .where(and(...conditions)),
  ]);

  return c.json({
    data,
    pagination: {
      page,
      limit,
      total: Number(total[0].count),
      totalPages: Math.ceil(Number(total[0].count) / limit),
    },
  });
});

// GET /deliveries/:id - Busca entrega por ID
deliveries.get('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const [entrega] = await db.select()
    .from(entregas)
    .where(eq(entregas.id, id))
    .limit(1);

  if (!entrega) {
    return c.json({ error: 'Entrega não encontrada' }, 404);
  }

  // Verifica se rota pertence ao motorista
  const [rota] = await db.select()
    .from(rotas)
    .where(and(eq(rotas.id, entrega.rotaId), eq(rotas.motoristaId, user.motoristaId)))
    .limit(1);

  if (!rota) {
    return c.json({ error: 'Acesso negado' }, 403);
  }

  return c.json(entrega);
});

// POST /deliveries/proof - Upload de foto de comprovação (multipart)
deliveries.post('/proof', async (c) => {
  const user = c.get('user');
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const metadataStr = formData.get('metadata') as string;
    
    if (!file || !metadataStr) {
      return c.json({ error: 'Arquivo e metadata são obrigatórios' }, 400);
    }

    const metadata = JSON.parse(metadataStr);
    
    // Valida tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'Apenas imagens são permitidas' }, 400);
    }

    // Valida tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'Arquivo muito grande (máx 10MB)' }, 400);
    }

    // Em produção: upload para MinIO/S3
    // Por enquanto: salva localmente ou retorna URL mock
    const fotoHash = crypto.createHash('sha256').update(await file.arrayBuffer()).digest('hex');
    const fotoUrl = `https://cdn.entregafacil.app/entregas/${fotoHash}.jpg`;

    // Verifica duplicata
    const db = getDB();
    const [duplicate] = await db.select()
      .from(entregas)
      .where(eq(entregas.fotoHash, fotoHash))
      .limit(1);

    if (duplicate) {
      return c.json({ error: 'Esta foto já foi registrada', existingId: duplicate.id }, 409);
    }

    return c.json({
      fotoUrl,
      fotoHash,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    logger.error({ err: error }, 'Upload proof failed');
    return c.json({ error: 'Falha ao processar upload' }, 500);
  }
});

export default deliveries;