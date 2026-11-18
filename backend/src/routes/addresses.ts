import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDB } from '../db';
import { enderecos } from '../db/schema/enderecos';
import { motoristas } from '../db/schema/motoristas';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const addresses = new Hono();

// Aplica auth middleware em todas as rotas
addresses.use('*', authMiddleware);

// Schemas
const createAddressSchema = z.object({
  nome: z.string().min(1).max(100),
  enderecoFormatado: z.string().min(5).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  bairro: z.string().max(100).optional(),
  cidade: z.string().min(1).max(100),
  estado: z.string().length(2, 'Estado deve ter 2 letras'),
  observacoes: z.string().max(500).optional(),
  destinatario: z.object({
    nome: z.string().min(1).max(100),
    telefone: z.string().regex(/^\+?55\d{10,11}$/, 'Telefone deve estar no formato brasileiro com DDD'),
    notificar: z.enum(['sempre', 'nunca', 'apenas_problema']).default('sempre'),
  }).optional(),
});

const updateAddressSchema = createAddressSchema.partial();

const geocodeQuerySchema = z.object({
  q: z.string().min(3, 'Query deve ter pelo menos 3 caracteres'),
  limit: z.coerce.number().int().positive().max(10).default(5),
});

const importCSVSchema = z.object({
  csvContent: z.string().min(1),
  skipHeader: z.boolean().default(true),
});

// GET /addresses - Lista endereços do motorista
addresses.get('/', async (c) => {
  const user = c.get('user');
  const db = getDB();

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  const [data, total] = await Promise.all([
    db.select()
      .from(enderecos)
      .where(eq(enderecos.motoristaId, user.motoristaId))
      .limit(limit)
      .offset(offset)
      .orderBy(enderecos.createdAt),
    db.select({ count: sql`count(*)` })
      .from(enderecos)
      .where(eq(enderecos.motoristaId, user.motoristaId)),
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

// GET /addresses/geocode - Autocomplete de endereços (Nominatim)
addresses.get('/geocode', zValidator('query', geocodeQuerySchema), async (c) => {
  const { q, limit } = c.req.valid('query');
  const user = c.get('user');

  try {
    // Primeiro busca no cache local (endereços já salvos)
    const db = getDB();
    const localResults = await db.select()
      .from(enderecos)
      .where(
        and(
          eq(enderecos.motoristaId, user.motoristaId),
          sql`(${enderecos.nome} ILIKE ${'%' + q + '%'} OR ${enderecos.enderecoFormatado} ILIKE ${'%' + q + '%'})`
        )
      )
      .limit(limit);

    // Se tem resultados locais, retorna eles primeiro
    if (localResults.length > 0) {
      return c.json({
        source: 'local',
        results: localResults.map(r => ({
          id: r.id,
          nome: r.nome,
          enderecoFormatado: r.enderecoFormatado,
          latitude: r.latitude,
          longitude: r.longitude,
          cep: r.cep,
          bairro: r.bairro,
          cidade: r.cidade,
          estado: r.estado,
          distance: null, // TODO: calcular distância se tiver GPS atual
        })),
      });
    }

    // Busca no Nominatim (OpenStreetMap)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=1&countrycodes=br`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'EntregaFacil/1.0 (contato@entregafacil.app)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar no Nominatim');
    }

    const results = await response.json();

    const formatted = results.map((r: any) => ({
      placeId: r.place_id,
      nome: r.display_name.split(',')[0],
      enderecoFormatado: r.display_name,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      cep: r.address?.postcode,
      bairro: r.address?.suburb || r.address?.neighbourhood,
      cidade: r.address?.city || r.address?.town || r.address?.village,
      estado: r.address?.state?.substring(0, 2).toUpperCase(),
      type: r.type,
      importance: r.importance,
    }));

    return c.json({ source: 'nominatim', results: formatted });
  } catch (error) {
    logger.error({ err: error, query: q }, 'Geocoding failed');
    return c.json({ error: 'Falha ao buscar endereços' }, 500);
  }
});

// POST /addresses - Cria novo endereço
addresses.post('/', zValidator('json', createAddressSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  const db = getDB();

  // Verifica duplicata (±10 metros = ~0.0001 graus)
  const [duplicate] = await db.select()
    .from(enderecos)
    .where(
      and(
        eq(enderecos.motoristaId, user.motoristaId),
        sql`ABS(${enderecos.latitude} - ${data.latitude}) < 0.0001`,
        sql`ABS(${enderecos.longitude} - ${data.longitude}) < 0.0001`
      )
    )
    .limit(1);

  if (duplicate) {
    return c.json({ error: 'Endereço muito próximo de outro já cadastrado (raio ~10m)' }, 409);
  }

  const [endereco] = await db.insert(enderecos).values({
    ...data,
    motoristaId: user.motoristaId,
    destinatario: data.destinatario ? JSON.stringify(data.destinatario) : null,
  }).returning();

  logger.info({ enderecoId: endereco.id, motoristaId: user.motoristaId }, 'Endereço criado');

  return c.json(endereco, 201);
});

// POST /addresses/import-csv - Importa endereços via CSV
addresses.post('/import-csv', zValidator('json', importCSVSchema), async (c) => {
  const user = c.get('user');
  const { csvContent, skipHeader } = c.req.valid('json');
  const db = getDB();

  const lines = csvContent.trim().split('\n');
  const startLine = skipHeader ? 1 : 0;
  
  if (lines.length <= startLine) {
    return c.json({ error: 'CSV vazio ou apenas cabeçalho' }, 400);
  }

  // Detecta cabeçalho
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const expectedHeaders = ['nome', 'endereco', 'latitude', 'longitude', 'cep', 'bairro', 'cidade', 'estado', 'observacoes', 'destinatario_nome', 'destinatario_telefone', 'destinatario_notificar'];
  
  const results = {
    total: lines.length - startLine,
    created: 0,
    errors: [] as Array<{ line: number; error: string; data?: any }>,
  };

  for (let i = startLine; i < lines.length; i++) {
    const lineNum = i + 1;
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length < 3) {
      results.errors.push({ line: lineNum, error: 'Linha com poucos campos (mínimo: nome, endereco, latitude, longitude)' });
      continue;
    }

    try {
      const rowData: any = {};
      headers.forEach((header, idx) => {
        if (values[idx] !== undefined) rowData[header] = values[idx];
      });

      // Validação básica
      if (!rowData.nome || !rowData.endereco || !rowData.latitude || !rowData.longitude) {
        throw new Error('Campos obrigatórios: nome, endereco, latitude, longitude');
      }

      const latitude = parseFloat(rowData.latitude);
      const longitude = parseFloat(rowData.longitude);
      
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordenadas inválidas');
      }

      // Verifica duplicata
      const [dup] = await db.select()
        .from(enderecos)
        .where(
          and(
            eq(enderecos.motoristaId, user.motoristaId),
            sql`ABS(${enderecos.latitude} - ${latitude}) < 0.0001`,
            sql`ABS(${enderecos.longitude} - ${longitude}) < 0.0001`
          )
        )
        .limit(1);

      if (dup) {
        results.errors.push({ line: lineNum, error: 'Endereço duplicado (próximo a outro cadastrado)', data: rowData });
        continue;
      }

      // Monta destinatário se houver
      let destinatario = null;
      if (rowData.destinatario_nome || rowData.destinatario_telefone) {
        destinatario = {
          nome: rowData.destinatario_nome || '',
          telefone: rowData.destinatario_telefone || '',
          notificar: (rowData.destinatario_notificar as 'sempre' | 'nunca' | 'apenas_problema') || 'sempre',
        };
      }

      await db.insert(enderecos).values({
        motoristaId: user.motoristaId,
        nome: rowData.nome,
        enderecoFormatado: rowData.endereco,
        latitude,
        longitude,
        cep: rowData.cep || null,
        bairro: rowData.bairro || null,
        cidade: rowData.cidade || 'São Paulo',
        estado: rowData.estado || 'SP',
        observacoes: rowData.observacoes || null,
        destinatario: destinatario ? JSON.stringify(destinatario) : null,
      });

      results.created++;
    } catch (error) {
      results.errors.push({ 
        line: lineNum, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data: values 
      });
    }
  }

  logger.info({ 
    motoristaId: user.motoristaId, 
    created: results.created, 
    errors: results.errors.length 
  }, 'CSV import completed');

  return c.json(results);
});

// GET /addresses/:id - Busca endereço por ID
addresses.get('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const [endereco] = await db.select()
    .from(enderecos)
    .where(and(eq(enderecos.id, id), eq(enderecos.motoristaId, user.motoristaId)))
    .limit(1);

  if (!endereco) {
    return c.json({ error: 'Endereço não encontrado' }, 404);
  }

  return c.json(endereco);
});

// PUT /addresses/:id - Atualiza endereço
addresses.put('/:id', zValidator('param', z.object({ id: z.string().uuid() })), zValidator('json', updateAddressSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = getDB();

  const [existing] = await db.select()
    .from(enderecos)
    .where(and(eq(enderecos.id, id), eq(enderecos.motoristaId, user.motoristaId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Endereço não encontrado' }, 404);
  }

  // Se mudou coordenadas, verifica duplicata
  if (data.latitude !== undefined && data.longitude !== undefined) {
    const [dup] = await db.select()
      .from(enderecos)
      .where(
        and(
          eq(enderecos.motoristaId, user.motoristaId),
          sql`${enderecos.id} != ${id}`,
          sql`ABS(${enderecos.latitude} - ${data.latitude}) < 0.0001`,
          sql`ABS(${enderecos.longitude} - ${data.longitude}) < 0.0001`
        )
      )
      .limit(1);

    if (dup) {
      return c.json({ error: 'Endereço muito próximo de outro já cadastrado' }, 409);
    }
  }

  const [updated] = await db.update(enderecos)
    .set({
      ...data,
      destinatario: data.destinatario ? JSON.stringify(data.destinatario) : null,
      updatedAt: new Date(),
    })
    .where(eq(enderecos.id, id))
    .returning();

  return c.json(updated);
});

// DELETE /addresses/:id - Remove endereço
addresses.delete('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const db = getDB();

  const result = await db.delete(enderecos)
    .where(and(eq(enderecos.id, id), eq(enderecos.motoristaId, user.motoristaId)))
    .returning({ id: enderecos.id });

  if (result.length === 0) {
    return c.json({ error: 'Endereço não encontrado' }, 404);
  }

  return c.json({ message: 'Endereço removido com sucesso' });
});

export default addresses;