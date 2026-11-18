# EntregaFácil API Documentation

**Base URL**: `https://api.entregafacil.app/api/v1`
**Authentication**: Bearer Token (JWT)
**Content-Type**: `application/json`
**Rate Limit**: 100 req/min (auth: 10/15min)

---

## Authentication

### POST `/auth/login`
Login com email e senha.

**Request**:
```json
{
  "email": "motorista@entregafacil.app",
  "password": "Senha@123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "motorista@entregafacil.app",
    "role": "driver",
    "motoristaId": "uuid"
  }
}
```

### POST `/auth/register`
Registro de novo motorista.

**Request**:
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "password": "Senha@123",
  "telefone": "5511999999999",
  "cpf": "12345678901"
}
```

### POST `/auth/refresh`
Renovar access token.

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST `/auth/logout`
Logout (invalida refresh token).

### GET `/auth/me`
Perfil do usuário autenticado.

---

## Endereços

### GET `/addresses`
Lista endereços do motorista.

**Query Params**:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` - busca textual

### POST `/addresses`
Criar endereço.

**Request**:
```json
{
  "nome": "Casa do Cliente",
  "enderecoFormatado": "Av. Paulista, 1000 - São Paulo/SP",
  "latitude": -23.5733,
  "longitude": -46.6417,
  "cep": "01310-100",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "observacoes": "Portaria 24h",
  "destinatario": {
    "nome": "Maria Santos",
    "telefone": "5511988887777",
    "notificar": "sempre"
  }
}
```

### GET `/addresses/:id`
Buscar endereço por ID.

### PUT `/addresses/:id`
Atualizar endereço.

### DELETE `/addresses/:id`
Deletar endereço.

### GET `/addresses/geocode?q=Av. Paulista`
Geocoding via Nominatim.

**Response**:
```json
[
  {
    "enderecoFormatado": "Av. Paulista, 1000 - São Paulo/SP",
    "latitude": -23.5733,
    "longitude": -46.6417,
    "cep": "01310-100",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "estado": "SP"
  }
]
```

---

## Rotas

### GET `/routes`
Lista rotas do motorista.

**Query Params**:
- `status` (rascunho|otimizada|em_andamento|concluida|parcial|cancelada)
- `page`, `limit`

### POST `/routes`
Criar rota.

**Request**:
```json
{
  "nome": "Rota Centro - Manhã",
  "data": "2024-11-20",
  "veiculoId": "uuid",
  "waypoints": [
    { "enderecoId": "uuid", "ordem": 1 },
    { "enderecoId": "uuid", "ordem": 2 }
  ]
}
```

### GET `/routes/:id`
Detalhes da rota com waypoints e métricas.

### PUT `/routes/:id`
Atualizar rota (apenas rascunho).

### DELETE `/routes/:id`
Deletar rota.

### POST `/routes/:id/optimize`
Otimizar rota (OSRM TSP).

**Response**:
```json
{
  "waypoints": [...], // reordenados
  "geometry": { "type": "LineString", "coordinates": [...] },
  "metricas": {
    "distanciaTotalKm": 15.2,
    "tempoEstimadoMin": 45,
    "entregues": 0,
    "problemas": 0,
    "canceladas": 0,
    "ganhoEstimado": 45.50,
    "economiaVsManual": 12.30
  }
}
```

### POST `/routes/:id/start`
Iniciar rota (status → em_andamento).

### POST `/routes/:id/finish`
Finalizar rota.

---

## Entregas/Comprovações

### POST `/deliveries`
Registrar comprovação de entrega.

**Request**:
```json
{
  "rotaId": "uuid",
  "waypointId": "uuid",
  "enderecoId": "uuid",
  "fotoUrl": "https://minio.entregafacil.app/entregas/...",
  "fotoHash": "sha256...",
  "latitude": -23.5733,
  "longitude": -46.6417,
  "accuracy": 5.0,
  "timestamp": "2024-11-18T10:30:00Z",
  "assinaturaUrl": "https://minio.entregafacil.app/assinaturas/...",
  "observacao": "Entregue ao porteiro",
  "tipoProblema": null // ou: cliente_ausente, endereco_errado, recusou, outro
}
```

### GET `/deliveries?rotaId=uuid`
Lista entregas.

### GET `/deliveries/:id`
Detalhes da entrega.

### POST `/deliveries/proof`
Upload foto comprovação (multipart/form-data).

**Form Fields**:
- `file` (image/jpeg, max 10MB)
- `metadata` (JSON string)

**Response**:
```json
{
  "fotoUrl": "https://minio.entregafacil.app/entregas/...",
  "fotoHash": "sha256...",
  "size": 2048576,
  "type": "image/jpeg"
}
```

### POST `/deliveries/assinatura`
Upload assinatura (base64 PNG).

**Form Fields**:
- `base64` (data:image/png;base64,...)
- `metadata` (JSON string)

### POST `/deliveries/minio/presigned-upload`
Gerar URL pré-assinada para upload direto no MinIO.

**Request**:
```json
{
  "contentType": "image/jpeg",
  "bucket": "entregafacil-provas",
  "metadata": {
    "deliveryId": "uuid",
    "waypointId": "uuid",
    "type": "foto",
    "latitude": -23.5733,
    "longitude": -46.6417,
    "accuracy": 5.0
  }
}
```

**Response**:
```json
{
  "uploadUrl": "https://minio.entregafacil.app/entregafacil-provas",
  "key": "entregas/uuid/uuid/foto/uuid.jpg",
  "bucket": "entregafacil-provas",
  "publicUrl": "https://minio.entregafacil.app/entregafacil-provas/entregas/...",
  "fields": { ... } // Campos para POST multipart
}
```

### DELETE `/deliveries/minio/delete`
Deletar arquivo do MinIO.

### GET `/deliveries/minio/list?deliveryId=uuid`
Listar arquivos de uma entrega.

---

## WhatsApp

### GET `/whatsapp/templates?instance=uuid`
Listar templates da instância.

### POST `/whatsapp/templates`
Criar/atualizar template.

**Request**:
```json
{
  "name": "entrega_confirmada",
  "content": "Olá {{nome}}, sua entrega no endereço {{endereco}} foi confirmada às {{hora}}.",
  "variables": ["nome", "endereco", "hora"]
}
```

### POST `/whatsapp/send`
Enviar mensagem.

**Request**:
```json
{
  "instanceName": "entregafacil",
  "number": "5511999999999",
  "text": "Mensagem de teste",
  "templateName": "entrega_confirmada",
  "options": {
    "delay": 1000,
    "presence": "composing",
    "linkPreview": false
  }
}
```

### POST `/whatsapp/webhook`
Webhook da Evolution API (público).

**Events**: `messages.upsert`, `connection.update`, `qrcode.updated`

### GET `/whatsapp/logs`
Logs de mensagens enviadas.

### GET `/whatsapp/connection/:instanceName`
Status da conexão.

### POST `/whatsapp/pair/:instanceName`
Gerar QR Code para pareamento.

---

## Sincronização

### POST `/sync/batch`
Sincronização em lote (offline-first).

**Request**:
```json
{
  "operations": [
    {
      "id": "uuid",
      "type": "create|update|delete",
      "entity": "address|route|waypoint|delivery|whatsapp_log",
      "payload": { ... },
      "timestamp": 1700000000000
    }
  ]
}
```

**Response**:
```json
{
  "synced": ["uuid1", "uuid2"],
  "conflicts": [],
  "serverChanges": [
    { "entity": "route", "id": "uuid", "data": {...}, "action": "update" }
  ]
}
```

### GET `/sync/changes?since=2024-11-18T00:00:00Z`
Buscar mudanças do servidor desde timestamp.

---

## Relatórios

### GET `/reports/dashboard`
Estatísticas do motorista.

**Response**:
```json
{
  "totalRotas": 150,
  "totalEntregas": 1200,
  "totalKm": 5000.5,
  "ganhoTotal": 15000.00,
  "mediaEntregasPorRota": 8,
  "taxaSucesso": 95.5
}
```

### GET `/reports/routes/:id/pdf`
Exportar rota em PDF.

### GET `/reports/routes/:id/csv`
Exportar rota em CSV.

---

## Health Check

### GET `/health`
Health check da API.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-11-18T10:30:00Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "ok",
    "redis": "ok",
    "minio": "ok",
    "osrm": "ok"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{ "error": "Dados inválidos", "details": [...] }
```

### 401 Unauthorized
```json
{ "error": "Token de autorização não fornecido" }
```

### 403 Forbidden
```json
{ "error": "Acesso negado" }
```

### 404 Not Found
```json
{ "error": "Recurso não encontrado" }
```

### 409 Conflict
```json
{ "error": "Conflito de dados", "existingId": "uuid" }
```

### 429 Too Many Requests
```json
{ "error": "Muitas requisições. Tente novamente mais tarde.", "retryAfter": 60 }
```

### 500 Internal Server Error
```json
{ "error": "Erro interno do servidor", "requestId": "uuid" }
```

---

## Webhooks

### Evolution API → EntregaFácil
**POST** `/webhook/evolution`

Headers: `x-signature: sha256=...`

**Payload**:
```json
{
  "event": "messages.upsert",
  "instance": "entregafacil",
  "data": {
    "messages": [
      {
        "key": { "id": "msg-id", "fromMe": true },
        "status": "DELIVERED"
      }
    ]
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 10 | 15 min |
| `/auth/register` | 5 | 15 min |
| `/api/*` | 100 | 1 min |
| `/sync/batch` | 30 | 1 min |
| `/whatsapp/send` | 20 | 1 min |

Headers de resposta:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## SDKs / Client Libraries

### Mobile (TypeScript)
```typescript
import { apiClient } from '@/shared/api/client';

// Automatically handles auth, refresh, offline queue
const routes = await apiClient.getRoutes();
await apiClient.createRoute(data);
```

### Backend (Node.js)
```typescript
// Internal service calls
const result = await minioClient.presignedGetObject(bucket, key);
await evolutionApi.sendMessage(instance, number, text);
```

---

## Changelog

- **v1.0.0** (2024-11-18): Initial release
  - Complete CRUD for addresses, routes, deliveries
  - WhatsApp integration with Evolution API
  - Offline sync with conflict resolution
  - MinIO direct upload
  - OSRM + GraphHopper routing
  - PDF/CSV reports