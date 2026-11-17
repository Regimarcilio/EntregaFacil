# ADR-007: Sync Strategy — Optimistic UI + Background Sync + LWW Conflict Resolution

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
App offline-first: motorista em campo sem sinal, completa entregas, sincroniza quando online. Requisitos:
- UX fluida offline (optimistic UI)
- Confiabilidade: zero perda de dados
- Conflict resolution determinístico
- Background sync automático + manual
- Auditoria completa

## Decisão
**Optimistic UI** (atualiza local即时) + **Local Queue** (SQLite/AsyncStorage, idempotente) + **Background Sync** (WorkManager/Background Fetch 15min + manual pull) + **Conflict Resolution**: Last-Write-Wins (timestamp) + **Flag Manual Merge** se mesmo campo editado offline em 2+ devices.

## Alternativas Consideradas

| Opção | UX Offline | Confiabilidade | Complexidade | Veredito |
|-------|------------|----------------|--------------|----------|
| **Optimistic + LWW + Manual Flag (Escolhido)** | ✅ Fluida | ✅ Idempotente | Média | ✅ |
| CRDT (Yjs/Automerge) | ✅ | ✅ | Muito Alta | ❌ Overkill |
| Server-wins | ❌ Perde offline | ✅ | Baixa | ❌ UX ruim |
| Manual merge sempre | ✅ | ✅ | Alta | ❌ UX ruim |
| Operational Transform | ✅ | ✅ | Muito Alta | ❌ Overkill |

## Consequências

### Positivas
- **Optimistic UI**: Motorista vê entrega confirmada即时, navegação prossegue sem espera
- **Idempotência**: `operation.id` UUID único → retry seguro, reentrancy garantida
- **LWW Simples**: Timestamp server vence; caso raro conflito real → flag `manual_merge=true` no registro
- **Background Sync**: WorkManager (Android) + Background Fetch (iOS) a cada 15min + pull-to-refresh manual
- **Auditoria Completa**: `sync_queue` table com todas operações, tentativas, erros, resolução

### Negativas/Riscos
- **LWW pode perder updates legítimos** simultâneos (ex: gestor edita rota no web, motorista edita offline) — mitigado: flag manual merge + notificação
- **Queue growth**: Se offline prolongado, queue cresce — mitigado: batch 10 ops, compressão payload
- **Clock skew**: Device clock errado → LWW errado — mitigado: usar timestamp server (`NOW()`) como source of truth

## Arquitetura Sync

```
┌─────────────────────────────────────────────────────────────────┐
                        MOBILE APP (OFFLINE)
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │  Optimistic   │   │  Local Queue  │
            │    UI Update  │   │  (SQLite)     │
            │  (Zustand)    │   │  idempotent   │
            └───────────────┘   └───────┬───────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
            │ WorkManager   │   │ Background    │   │ Pull-to       │
            │ (Android)     │   │ Fetch (iOS)   │   │ Refresh       │
            │ 15min         │   │ 15min         │   │ Manual        │
            └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
                    ┌─────────────────────────────────────┐
                    │        SYNC ENGINE                  │
                    │  POST /sync/batch { operations[] }  │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    ▼                                     ▼
            ┌───────────────┐                     ┌───────────────┐
            │   SERVER      │                     │   SERVER      │
            │  (200 OK)     │                     │  (Conflict)   │
            │ applied: N    │                     │ 409 Conflict  │
            │ conflicts: 0  │                     │ manual_merge  │
            └───────┬───────┘                     └───────┬───────┘
                    │                                     │
                    ▼                                     ▼
            ┌───────────────┐                     ┌───────────────┐
            │ Clear Queue   │                     │ Flag Local    │
            │ Applied Ops   │                     │ Record        │
            │ Apply Server  │                     │ Notify User   │
            │ Changes       │                     │ "Conflito:    │
            └───────────────┘                     │  revisar"     │
                                                 └───────────────┘
```

## Local Queue Schema (SQLite/AsyncStorage)

```typescript
// Local queue entry (idempotent)
interface SyncOperation {
  id: string;                    // UUID v4 (client-generated)
  type: 'create' | 'update' | 'delete';
  entity: 'address' | 'route' | 'waypoint' | 'delivery' | 'whatsapp_log';
  payload: Record<string, any>;  // Full entity data (create/update) ou { id } (delete)
  timestamp: number;             // Date.now() client
  retryCount: number;            // Incrementado a cada falha
  status: 'pending' | 'processing' | 'synced' | 'error' | 'conflict';
  serverTimestamp?: number;      // Preenchido após sync bem-sucedido
}
```

## Sync Batch Protocol

```typescript
// Request: App → Server
POST /api/v1/sync/batch
{
  "clientId": "motorista-uuid",
  "clientTime": 1700000000000,           // Device timestamp (para clock skew detection)
  "operations": [
    {
      "id": "op-uuid-1",
      "type": "create",
      "entity": "delivery",
      "payload": { ...deliveryData },
      "timestamp": 1700000000000
    },
    {
      "id": "op-uuid-2",
      "type": "update",
      "entity": "waypoint",
      "payload": { id: "wp-uuid", status: "entregue" },
      "timestamp": 1700000001000
    }
  ]
}

// Response: Server → App
{
  "applied": 2,
  "conflicts": 0,
  "serverTime": 1700000005000,
  "serverChanges": [
    { "entity": "route", "id": "route-uuid", "data": { ...updatedByManager } }
  ],
  "conflictsDetail": []  // Se houver conflitos
}
```

## Conflict Resolution Logic (Server-Side)

```typescript
// POST /sync/batch handler
async function handleSyncBatch(operations: SyncOperation[], clientId: string) {
  const results = { applied: 0, conflicts: 0, serverChanges: [], conflictsDetail: [] };
  
  for (const op of operations) {
    // 1. Idempotency check
    const existing = await db.syncLog.findUnique({ where: { operationId: op.id } });
    if (existing) {
      results.applied++; // Já processado, no-op
      continue;
    }
  
    // 2. Optimistic lock: check version/timestamp
    const current = await db[op.entity].findUnique({ where: { id: op.payload.id } });
    
    if (!current && op.type !== 'create') {
      // Entidade não existe (pode ter sido deletada no server)
      results.conflicts++;
      results.conflictsDetail.push({ opId: op.id, reason: 'not_found', action: 'manual_merge' });
      continue;
    }
  
    if (current && op.type !== 'create') {
      // LWW: server timestamp vence
      const serverTs = current.updatedAt.getTime();
      const clientTs = op.timestamp;
      
      if (serverTs > clientTs + 1000) { // 1s tolerância clock skew
        // Server mais novo → conflito
        results.conflicts++;
        results.conflictsDetail.push({ 
          opId: op.id, 
          reason: 'server_newer', 
          serverData: current,
          clientData: op.payload,
          action: 'manual_merge'
        });
        // Marca registro local para merge manual
        await flagLocalForManualMerge(clientId, op.entity, op.payload.id);
        continue;
      }
    }
  
    // 3. Apply operation (transaction)
    await db.$transaction(async (tx) => {
      switch (op.type) {
        case 'create':
          await tx[op.entity].create({ data: op.payload });
          break;
        case 'update':
          await tx[op.entity].update({ where: { id: op.payload.id }, data: op.payload });
          break;
        case 'delete':
          await tx[op.entity].delete({ where: { id: op.payload.id } });
          break;
      }
      // Log para idempotência
      await tx.syncLog.create({ 
        data: { operationId: op.id, clientId, entity: op.entity, appliedAt: new Date() } 
      });
    });
  
    results.applied++;
  }
  
  // 4. Fetch server changes since last sync (para pull)
  const lastSync = await db.motorista.findUnique({ where: { id: clientId }, select: { lastSyncAt: true } });
  if (lastSync?.lastSyncAt) {
    results.serverChanges = await fetchServerChangesSince(clientId, lastSync.lastSyncAt);
  }
  
  return results;
}
```

## Background Sync Implementation

```typescript
// Android: WorkManager (expo-task-manager + expo-background-fetch)
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

TaskManager.defineTask('SYNC_TASK', async () => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
    return BackgroundFetch.Result.NoData;
  }
  
  try {
    await syncEngine.pushAndPull();
    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error('Background sync failed:', error);
    return BackgroundFetch.Result.Failed;
  }
});

// Registrar task (15min intervalo mínimo)
await BackgroundFetch.registerTaskAsync('SYNC_TASK', {
  minimumInterval: 15 * 60, // 15 minutos
  stopOnTerminate: false,
  startOnBoot: true,
});

// iOS: Background Fetch + Manual Pull-to-Refresh
// NetInfo.addEventListener para trigger imediato quando volta online
```

## Validação
- [ ] Teste propriedade: 1000 ciclos sync com network flaky (toxiproxy) → 0 perda dados
- [ ] Teste idempotência: Mesmo `operation.id` enviado 5x → 1 aplicação
- [ ] Teste LWW: Client offline edita, server edita → flag manual_merge + notificação
- [ ] Teste background: App killed → boot → WorkManager executa sync
- [ ] Teste queue growth: 500 ops offline → batch 10 → memória < 50MB
- [ ] Auditoria: `sync_queue` table permite replay completo

## Referências
- [SRS - RF-025](docs/SRS.md#rf-025-sincroniza%C3%A7%C3%A3o-bidirecional-background)
- [Benchmarks](docs/02-benchmarks.md#5-backend--sync--database--comparativo)
- [WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager)
- [expo-background-fetch](https://docs.expo.dev/versions/latest/sdk/background-fetch/)