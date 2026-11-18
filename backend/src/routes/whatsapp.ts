import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDB } from '../db';
import { whatsappLogs } from '../db/schema/whatsapp-logs';
import { motoristas } from '../db/schema/motoristas';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import fetch from 'node-fetch';

const whatsapp = new Hono();

whatsapp.use('*', authMiddleware);

// Schemas
const sendMessageSchema = z.object({
  instanceName: z.string().min(1),
  number: z.string().regex(/^55\d{10,11}$/, 'Número deve estar no formato 55DDDNNNNNNNN'),
  text: z.string().min(1).max(4096),
  templateName: z.string().optional(),
  options: z.object({
    delay: z.number().default(1000),
    presence: z.enum(['composing', 'recording', 'paused']).default('composing'),
    linkPreview: z.boolean().default(false),
    quotedMessageId: z.string().optional(),
  }).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1).max(50),
  content: z.string().min(1).max(1024),
  variables: z.array(z.string()).optional(),
});

const webhookEventSchema = z.object({
  event: z.enum(['messages.upsert', 'connection.update', 'qrcode.updated', 'chats.upsert', 'contacts.upsert']),
  instance: z.string(),
  data: z.any(),
});

// GET /whatsapp/templates - Lista templates da instância
whatsapp.get('/templates', async (c) => {
  const user = c.get('user');
  const instanceName = c.req.query('instance');
  
  if (!instanceName) {
    return c.json({ error: 'instance é obrigatório' }, 400);
  }

  // Verifica se instância pertence ao motorista
  const db = getDB();
  const [motorista] = await db.select()
    .from(motoristas)
    .where(and(eq(motoristas.id, user.motoristaId), eq(motoristas.whatsappConfig.instanceName, instanceName)))
    .limit(1);

  if (!motorista) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  try {
    const evolutionUrl = motorista.whatsappConfig?.evolutionUrl || process.env.EVOLUTION_BASE_URL;
    const apiKey = motorista.whatsappConfig?.apiKey;
    
    const response = await fetch(`${evolutionUrl}/settings/templates/${instanceName}`, {
      headers: { 'apikey': apiKey! },
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar templates');
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    logger.error({ err: error, instanceName }, 'Failed to fetch templates');
    return c.json({ error: 'Falha ao buscar templates' }, 500);
  }
});

// POST /whatsapp/templates - Cria/atualiza template
whatsapp.post('/templates', zValidator('json', templateSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  const db = getDB();

  const [motorista] = await db.select()
    .from(motoristas)
    .where(eq(motoristas.id, user.motoristaId))
    .limit(1);

  if (!motorista?.whatsappConfig) {
    return c.json({ error: 'WhatsApp não configurado' }, 400);
  }

  try {
    const evolutionUrl = motorista.whatsappConfig.evolutionUrl;
    const apiKey = motorista.whatsappConfig.apiKey;
    const instanceName = motorista.whatsappConfig.instanceName;

    const response = await fetch(`${evolutionUrl}/settings/templates/${instanceName}/${data.name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        content: data.content,
        variables: data.variables,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${error}`);
    }

    const result = await response.json();
    return c.json(result, 201);
  } catch (error) {
    logger.error({ err: error }, 'Failed to create template');
    return c.json({ error: 'Falha ao criar template' }, 500);
  }
});

// POST /whatsapp/send - Envia mensagem via Evolution API
whatsapp.post('/send', zValidator('json', sendMessageSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  const db = getDB();

  const [motorista] = await db.select()
    .from(motoristas)
    .where(eq(motoristas.id, user.motoristaId))
    .limit(1);

  if (!motorista?.whatsappConfig) {
    return c.json({ error: 'WhatsApp não configurado' }, 400);
  }

  const evolutionUrl = motorista.whatsappConfig.evolutionUrl;
  const apiKey = motorista.whatsappConfig.apiKey;
  const instanceName = motorista.whatsappConfig.instanceName;

  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: data.number,
        text: data.text,
        options: data.options || {
          delay: 1000,
          presence: 'composing',
          linkPreview: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Evolution API error: ${error}`);
    }

    const result = await response.json();
    
    // Log local
    await db.insert(whatsappLogs).values({
      entregaId: null, // Será preenchido pelo mobile se tiver
      messageId: result.key?.id || result.messageId,
      destinatarioNome: data.number,
      telefone: data.number,
      templateUsado: data.templateName || 'custom',
      status: 'enviado',
      enviadoEm: new Date(),
    });

    logger.info({ 
      motoristaId: user.motoristaId, 
      instance: instanceName,
      to: data.number,
      messageId: result.key?.id 
    }, 'WhatsApp message sent');

    return c.json(result);
  } catch (error) {
    logger.error({ err: error, to: data.number }, 'Failed to send WhatsApp');
    
    // Log erro local
    await db.insert(whatsappLogs).values({
      entregaId: null,
      messageId: '',
      destinatarioNome: data.number,
      telefone: data.number,
      templateUsado: data.templateName || 'custom',
      status: 'erro',
      enviadoEm: new Date(),
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
    });

    return c.json({ error: 'Falha ao enviar mensagem' }, 500);
  }
});

// POST /whatsapp/webhook - Recebe webhooks da Evolution API
whatsapp.post('/webhook', async (c) => {
  const body = await c.req.json();
  
  // Valida signature se configurado
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret) {
    const signature = c.req.header('x-signature');
    // TODO: Validar HMAC signature
  }

  const { event, instance, data } = body;
  const db = getDB();

  try {
    switch (event) {
      case 'messages.upsert': {
        // Atualiza status da mensagem local
        for (const msg of data.messages || [data]) {
          if (msg.key?.fromMe) {
            await db.update(whatsappLogs)
              .set({
                status: msg.status === 'DELIVERED' ? 'entregue' : 
                        msg.status === 'READ' ? 'lido' : 'enviado',
                entregueEm: msg.status === 'DELIVERED' ? new Date() : null,
                lidoEm: msg.status === 'READ' ? new Date() : null,
              })
              .where(eq(whatsappLogs.messageId, msg.key.id));
          }
        }
        break;
      }
      case 'connection.update': {
        // Atualiza status da instância
        const motorista = await db.select()
          .from(motoristas)
          .where(eq(motoristas.whatsappConfig.instanceName, instance))
          .limit(1);
        
        if (motorista[0]) {
          const status = data.state === 'open' ? 'conectado' : 
                        data.state === 'connecting' ? 'pareando' : 'desconectado';
          
          await db.update(motoristas)
            .set({
              whatsappConfig: {
                ...motorista[0].whatsappConfig,
                statusConexao: status,
              },
              updatedAt: new Date(),
            })
            .where(eq(motoristas.id, motorista[0].id));
        }
        break;
      }
      case 'qrcode.updated': {
        // QR Code atualizado - notifica mobile via push/websocket
        logger.info({ instance }, 'QR Code updated');
        break;
      }
    }

    return c.json({ received: true });
  } catch (error) {
    logger.error({ err: error, event }, 'Webhook processing failed');
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

// GET /whatsapp/logs - Lista logs de mensagens
whatsapp.get('/logs', async (c) => {
  const user = c.get('user');
  const db = getDB();

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  const [data, total] = await Promise.all([
    db.select()
      .from(whatsappLogs)
      .where(eq(whatsappLogs.motoristaId, user.motoristaId)) // Precisa adicionar motoristaId ao schema
      .limit(limit)
      .offset(offset)
      .orderBy(desc(whatsappLogs.enviadoEm)),
    db.select({ count: sql`count(*)` })
      .from(whatsappLogs)
      .where(eq(whatsappLogs.motoristaId, user.motoristaId)),
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

// GET /whatsapp/connection/:instanceName - Status da conexão
whatsapp.get('/connection/:instanceName', zValidator('param', z.object({ instanceName: z.string() })), async (c) => {
  const user = c.get('user');
  const { instanceName } = c.req.valid('param');
  const db = getDB();

  const [motorista] = await db.select()
    .from(motoristas)
    .where(and(eq(motoristas.id, user.motoristaId), eq(motoristas.whatsappConfig.instanceName, instanceName)))
    .limit(1);

  if (!motorista) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  try {
    const evolutionUrl = motorista.whatsappConfig?.evolutionUrl || process.env.EVOLUTION_BASE_URL;
    const apiKey = motorista.whatsappConfig?.apiKey;

    const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': apiKey! },
    });

    if (!response.ok) {
      throw new Error('Erro ao verificar conexão');
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    logger.error({ err: error, instanceName }, 'Failed to check connection');
    return c.json({ error: 'Falha ao verificar conexão' }, 500);
  }
});

// POST /whatsapp/pair/:instanceName - Gera QR Code para pareamento
whatsapp.post('/pair/:instanceName', zValidator('param', z.object({ instanceName: z.string() })), async (c) => {
  const user = c.get('user');
  const { instanceName } = c.req.valid('param');
  const db = getDB();

  const [motorista] = await db.select()
    .from(motoristas)
    .where(and(eq(motoristas.id, user.motoristaId), eq(motoristas.whatsappConfig.instanceName, instanceName)))
    .limit(1);

  if (!motorista) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  try {
    const evolutionUrl = motorista.whatsappConfig?.evolutionUrl || process.env.EVOLUTION_BASE_URL;
    const apiKey = motorista.whatsappConfig?.apiKey;

    const response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey!,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Erro ao gerar QR Code');
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    logger.error({ err: error, instanceName }, 'Failed to pair');
    return c.json({ error: 'Falha ao gerar QR Code' }, 500);
  }
});

export default whatsapp;