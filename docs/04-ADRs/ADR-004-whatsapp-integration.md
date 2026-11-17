# ADR-004: WhatsApp Integration — Evolution API Self-Hosted (Hybrid Mode)

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
Requisitos de notificação WhatsApp:
- Envio automático ao confirmar entrega (template com variáveis)
- Remetente configurável: número do motorista OU número do destinatário
- Template pré-aprovado Meta (Cloud API) ou livre (Baileys)
- Status delivery/read callbacks tempo real
- LGPD compliance (opt-in destinatário, minimização dados)
- Zero custo licença preferível

## Decisão
**Evolution API** (10.1k⭐, Apache 2.0) self-hosted via Docker Compose, operando em **modo híbrido**:
- **Primary**: WhatsApp Cloud API (oficial Meta) — confiável, templates aprovados, baixo risco banimento
- **Fallback**: Baileys (WhatsApp Web) — gratuito, sem custo por conversa, para testes/dev

## Alternativas Consideradas

| Opção | Custo | Confiabilidade | Templates | LGPD | Veredito |
|-------|-------|----------------|-----------|------|----------|
| **Evolution API Hybrid (Escolhido)** | $0 licença + VPS | Alta (Cloud) / Média (Baileys) | Ambos | Self-hosted = controle | ✅ |
| WhatsApp Cloud API Direto | $0.005-0.03/conv | Muito Alta | Oficiais Meta | Meta processa | ❌ Complexo, vendor lock |
| Baileys Direto | $0 | Baixa (banimento) | Livres | Self-hosted | ❌ Manutenção alta |
| Twilio / Gupshup / Zenvia | $0.01-0.05/msg + mensal | Alta | Via BSP | BSP processa | ❌ Caro, lock-in |
| WhatsApp Business App (manual) | $0 | N/A | Manuais | Local | ❌ Não automatiza |

## Consequências

### Positivas
- **Uma API unificada**: REST + WebSocket para ambos provedores
- **Self-hosted**: Controle total dados (LGPD), zero custo licença
- **WebSocket Events**: `messages.upsert`, `connection.update`, `qrcode.updated` tempo real
- **Multi-instance**: Um motorista = uma instância isolada
- **TypeScript Native**: Tipos compartilhados com app/backend

### Negativas/Riscos (Críticos)
- **Baileys Banimento**: WhatsApp detecta automação Web → banimento número (mitigado: Cloud API primary)
- **Cloud API Custo**: ~R$ 0,03/conversa Brasil (mitigado: só notificações essenciais, ~30-50/dia motorista)
- **Meta Verification**: Cloud API requer Meta Business Verification (docs, tempo)
- **Manutenção Evolution**: Updates frequentes, breaking changes ocasionais

## Arquitetura Híbrida

```
App (React Native)
    │
    ├── Config: evolutionUrl, apiKey, instanceName, remetenteMode
    │
    ├── Cloud API (Primary)
    │       ├── Instance type: "cloud"
    │       ├── Templates: Pré-aprovados Meta (namespace)
    │       ├── Custo: Por conversa (24h window)
    │       └── Confiabilidade: 99.9%
    │
    └── Baileys (Fallback/Dev)
            ├── Instance type: "baileys"
            ├── Templates: Livres (texto simples)
            ├── Custo: $0
            └── Risco: Banimento (monitorar connectionState)
```

## Configuração Evolution API (Docker Compose)

```yaml
# docker-compose.yml
services:
  evolution-api:
    image: evoapicloud/evolution-api:latest
    environment:
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://evo:evo@postgres:5432/evolution
      - REDIS_URI=redis://redis:6379
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - CONFIG_SESSION_PHONE_CLIENT=EntregaFacil
      - CONFIG_SESSION_PHONE_NAME=EntregaFacil
      - CONFIG_WEBHOOK_GLOBAL_ENABLED=true
      - CONFIG_WEBHOOK_GLOBAL_URL=https://api.entregafacil.app/webhook/evolution
      - CONFIG_WEBHOOK_GLOBAL_EVENTS=messages.upsert,connection.update,qrcode.updated
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=evolution
      - POSTGRES_USER=evo
      - POSTGRES_PASSWORD=evo
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## Fluxo Envio Notificação (App → Evolution → WhatsApp)

```typescript
// App side (React Native)
interface SendDeliveryNotification {
  waypointId: string;
  destinatario: { nome: string; telefone: string; notificar: 'sempre' | 'nunca' | 'apenas_problema' };
  comprovacao: { fotoUrl: string; assinaturaUrl?: string; observacao?: string; timestamp: Date };
  template: 'entrega_confirmada' | 'entrega_problema';
  remetente: 'motorista' | 'destinatario';  // fromMe: true/false
}

// Evolution API Payload
POST /message/sendText
{
  "number": "5511999998888",  // telefone destinatário (limpo: só números)
  "text": "✅ Entrega #123 confirmada!\n📍 Rua A, 100 - Centro\n🕐 14:32\n📸 Foto: https://cdn.entregafacil.app/entregas/abc123.jpg\n✍️ Assinatura: https://cdn.entregafacil.app/entregas/abc123_sig.png",
  "instance": "motorista-001",
  "options": {
    "delay": 1000,
    "presence": "composing",
    "linkPreview": false
  }
}

// WebSocket Callback (Real-time)
WS: messages.upsert
{
  "event": "messages.upsert",
  "instance": "motorista-001",
  "data": {
    "key": { "remoteJid": "5511999998888@s.whatsapp.net", "id": "msg_abc123", "fromMe": true },
    "message": { "conversation": "..." },
    "status": "DELIVERED"  // ou "READ", "ERROR"
  }
}
```

## Templates WhatsApp (Pré-aprovados Meta)

### Template: `entrega_confirmada` (Cloud API)
```
Namespace: {{namespace}}
Name: entrega_confirmada
Language: pt_BR
Category: UTILITY
Components:
  - BODY: "✅ Entrega {{1}} confirmada!\n📍 {{2}}\n🕐 {{3}}\n📸 Foto: {{4}}\n✍️ Assinatura: {{5}}"
  - BUTTONS: 
      - QUICK_REPLY: "Ver no App" (payload: "open_app:delivery_{{1}}")
      - QUICK_REPLY: "Problema?" (payload: "report_issue:{{1}}")
Variables: {{1}}=pedido {{2}}=endereco {{3}}=hora {{4}}=foto_url {{5}}=assinatura_url
```

### Template: `entrega_problema` (Cloud API)
```
Body: "⚠️ Entrega {{1}} com observação:\n📍 {{2}}\n🕐 {{3}}\n📝 {{4}}\n📸 Foto: {{5}}"
Variables: {{1}}=pedido {{2}}=endereco {{3}}=hora {{4}}=observacao {{5}}=foto_url
```

## LGPD Compliance

1. **Opt-in Explícito**: Cadastro endereço → campo `notificar: 'sempre' | 'nunca' | 'apenas_problema'`
2. **Minimização**: Só envia se `notificar !== 'nunca'` E telefone válido
3. **Logs Auditoria**: `whatsapp_logs` table com messageId, status, timestamp, telefone (hash parcial)
4. **Direito Exclusão**: Delete instance Evolution + anonimiza logs (RN-017)
5. **Retenção**: Logs 90 dias, depois anonimização automática (job cron)

## Monitoramento Crítico

```promql
# Alertas Prometheus/Grafana
- alert: EvolutionInstanceDisconnected
  expr: evolution_instance_connection_state{state="disconnected"} == 1
  for: 5m
  labels: { severity: critical }
  annotations:
    summary: "Instância {{ $labels.instance }} desconectada > 5min"
    runbook: "Verificar QR Code Baileys ou Cloud API credentials"

- alert: EvolutionMessageFailureRate
  expr: rate(evolution_messages_failed_total[5m]) / rate(evolution_messages_sent_total[5m]) > 0.1
  for: 2m
  labels: { severity: warning }
  annotations:
    summary: "Taxa falha > 10% na instância {{ $labels.instance }}"
```

## Validação
- [ ] PoC: Evolution API + Cloud API (Meta verified) → envio template + callback delivered/read
- [ ] PoC: Evolution API + Baileys → QR Code pairing + envio texto livre
- [ ] Teste carga: 100 mensagens/minuto instância única
- [ ] Teste LGPD: Opt-in 'nunca' → zero mensagens enviadas
- [ ] Teste fallback: Cloud API down → Baileys assume (manual switch v0.1, auto v0.2)
- [ ] Monitoramento: Dashboards Grafana operacionais (connection state, message throughput, latency)

## Referências
- [Benchmarks](docs/02-benchmarks.md#3-whatsapp-integration--evolution-api)
- [Evolution API Docs](https://docs.evolutionfoundation.com.br)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Baileys](https://github.com/WhiskeySockets/Baileys)
- [Meta Business Verification](https://www.facebook.com/business/help/209793356715751)