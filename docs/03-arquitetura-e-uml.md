# Arquitetura e Diagramas UML — EntregaFácil

**Versão:** 0.1  
**Data:** 2026-11-17  
**Autor:** PLANMASTER  
**Branch:** develop  
**Referência:** docs/SRS.md, docs/02-benchmarks.md

---

## 1. Visão Arquitetural (C4 Level 1 — Context)

```mermaid
graph TB
    subgraph "Motorista"
        App[EntregaFácil App\nReact Native + Expo]
    end

    subgraph "Infraestrutura Self-Hosted (VPS)"
        direction TB
        API[API Gateway\nHono/Node.js + JWT]
        DB[(PostgreSQL + PostGIS)]
        Redis[(Redis)]
        MinIO[(MinIO / S3)]
        OSRM[OSRM Routing Engine\nDocker + Brazil PBF]
        GH[GraphHopper\nDocker + jsprit VRP]
        EVO[Evolution API\nDocker + PostgreSQL + Redis]
    end

    subgraph "Serviços Externos"
        OSM[OpenStreetMap\nGeofabrik PBF]
        NOM[Nominatim / Google Places]
        WA[WhatsApp\nBaileys / Cloud API]
    end

    App -->|HTTPS/WSS| API
    App -->|HTTPS| OSRM
    App -->|HTTPS| GH
    App -->|HTTPS| EVO
    App -->|HTTPS| NOM
    App -->|HTTPS| MinIO

    API --> DB
    API --> Redis
    API --> MinIO
    API --> OSRM
    API --> GH
    API --> EVO

    EVO --> WA
    OSRM --> OSM
    GH --> OSM
```

---

## 2. Diagrama de Casos de Uso (Use Case Diagram)

```mermaid
graph TB
    actor Motorista as "🏍️ Motorista"
    actor Gestor as "👨‍💼 Gestor (v0.2)"
    actor Sistema as "⚙️ Sistema (Background)"

    package "EntregaFácil App" {
        UC1[Cadastrar Endereços\nManual / CSV / WhatsApp]
        UC2[Criar Rota do Dia\nSelecionar endereços]
        UC3[Otimizar Rota\nOSRM Trip / GraphHopper VRP]
        UC4[Navegar Turn-by-Turn\nMapLibre Navigation]
        UC5[Comprovar Entrega\nFoto + GPS + Assinatura]
        UC6[Enviar WhatsApp Auto\nTemplate + Status]
        UC7[Funcionar Offline\nCache mapas + Queue sync]
        UC8[Ver Histórico/Relatórios\nExport CSV/PDF]
        UC9[Configurar Perfil/WhatsApp/Mapas]
    }

    Motorista --> UC1
    Motorista --> UC2
    Motorista --> UC3
    Motorista --> UC4
    Motorista --> UC5
    Motorista --> UC6
    Motorista --> UC7
    Motorista --> UC8
    Motorista --> UC9

    Gestor -.-> UC8
    Gestor -.-> UC2

    Sistema --> UC7
    Sistema --> UC3
    Sistema --> UC6
```

---

## 3. Diagrama de Classes / Entidades (Domain Model)

```mermaid
classDiagram
    class Motorista {
        +id: UUID
        +nome: String
        +cpfHash: String
        +telefone: String
        +email: String
        +fotoUrl: String?
        +veiculo: Veiculo
        +preferencias: Preferencias
        +whatsappConfig: WhatsAppConfig?
        +createdAt: DateTime
        +updatedAt: DateTime
        +excluirConta()
        +exportarDados()
    }

    class Veiculo {
        +placa: String
        +modelo: String
        +cor: String
        +ano: Int
        +tipo: Enum[moto, carro, bike]
        +crlvUrl: String?
    }

    class Preferencias {
        +tema: Enum[claro, escuro, sistema]
        +unidades: Enum[metric, imperial]
        +vozNavegacao: Boolean
        +volumeVoz: Int
        +modoLuva: Boolean
        +autoIniciarNavegacao: Boolean
        +syncApenasWifi: Boolean
        +notificacoesPush: Boolean
    }

    class WhatsAppConfig {
        +evolutionUrl: String
        +apiKey: String
        +instanceName: String
        +remetente: Enum[motorista, destinatario]
        +templatePadrao: String
        +statusConexao: Enum[conectado, desconectado, pareando]
        +testarConexao()
        +parearQRCode()
    }

    class Endereco {
        +id: UUID
        +motoristaId: UUID
        +nome: String
        +enderecoFormatado: String
        +latitude: Double
        +longitude: Double
        +cep: String?
        +bairro: String?
        +cidade: String
        +estado: String
        +observacoes: String?
        +destinatario: Destinatario?
        +createdAt: DateTime
        +updatedAt: DateTime
        +geocodificar()
        +validarDuplicata()
    }

    class Destinatario {
        +nome: String
        +telefone: String
        +notificar: Enum[sempre, nunca, apenas_problema]
    }

    class Rota {
        +id: UUID
        +motoristaId: UUID
        +nome: String
        +data: Date
        +veiculoId: UUID
        +status: Enum[rascunho, otimizada, em_andamento, concluida, parcial, cancelada]
        +waypoints: Waypoint[]
        +metricas: MetricasRota?
        +createdAt: DateTime
        +updatedAt: DateTime
        +otimizar()
        +iniciar()
        +finalizar()
        +exportarPDF()
        +exportarCSV()
    }

    class Waypoint {
        +id: UUID
        +rotaId: UUID
        +enderecoId: UUID
        +ordem: Int
        +status: Enum[pendente, em_rota, entregue, problema, cancelada]
        +comprovacao: Comprovacao?
        +whatsappLog: WhatsAppLog?
        +atualizarStatus()
    }

    class Comprovacao {
        +id: UUID
        +waypointId: UUID
        +fotoUrl: String
        +fotoHash: String
        +latitude: Double
        +longitude: Double
        +accuracy: Double
        +timestamp: DateTime
        +assinaturaUrl: String?
        +observacao: String?
        +tipoProblema: Enum[cliente_ausente, endereco_errado, recusou, outro]?
        +validarFoto()
    }

    class WhatsAppLog {
        +id: UUID
        +waypointId: UUID
        +messageId: String
        +destinatario: String
        +telefone: String
        +templateUsado: String
        +status: Enum[enviado, entregue, lido, erro]
        +enviadoEm: DateTime
        +entregueEm: DateTime?
        +lidoEm: DateTime?
        +erro: String?
    }

    class MetricasRota {
        +rotaId: UUID
        +distanciaTotalKm: Double
        +tempoEstimadoMin: Int
        +tempoRealMin: Int?
        +entregues: Int
        +problemas: Int
        +canceladas: Int
        +ganhoEstimado: Double
        +economiaVsManual: Double
    }

    class SyncQueue {
        +id: UUID
        +motoristaId: UUID
        +operacaoId: UUID
        +tipo: Enum[create, update, delete]
        +entidade: String
        +payload: JSON
        +timestamp: DateTime
        +tentativas: Int
        +status: Enum[pendente, processando, concluido, erro, conflito]
        +processar()
    }

    Motorista "1" --> "1" Veiculo
    Motorista "1" --> "1" Preferencias
    Motorista "1" --> "0..1" WhatsAppConfig
    Motorista "1" --> "*" Endereco
    Motorista "1" --> "*" Rota
    Motorista "1" --> "*" SyncQueue

    Endereco "1" --> "0..1" Destinatario
    Rota "1" --> "*" Waypoint
    Waypoint "1" --> "0..1" Comprovacao
    Waypoint "1" --> "0..1" WhatsAppLog
    Rota "1" --> "0..1" MetricasRota
```

---

## 4. Diagrama de Sequência — Fluxo Principal: Otimizar + Navegar + Entregar + WhatsApp

```mermaid
sequenceDiagram
    actor Motorista
    participant App as EntregaFácil App
    participant OSRM as OSRM (VPS)
    participant MapLibre as MapLibre Navigation
    participant EVO as Evolution API
    participant WA as WhatsApp
    participant API as Backend API
    participant DB as PostgreSQL

    Motorista->>App: Abre app, seleciona "Rota Centro"
    Motorista->>App: Toca "Otimizar Rota"
    App->>OSRM: POST /trip/v1/driving/{waypoints}?steps=true&source=first&destination=last
    OSRM-->>App: { waypoints[ordem], geometry, legs[duration,distance], waypoints[waypoint_index] }
    App->>App: Reordena checklist local conforme waypoint_index
    App->>API: PUT /routes/{id} { waypoints_ordenados, geometry, metricas }
    API->>DB: UPDATE rota SET status='otimizada', geometry=?, metricas=?
    App-->>Motorista: Exibe mapa com rota + resumo "42.3 km | 1h15m | -18%"

    Motorista->>App: Toca "Iniciar Rota"
    App->>App: Waypoint[0].status = EM_ROTA
    App->>MapLibre: Iniciar navegação (polyline + steps[manobra, distancia, rua])
    MapLibre-->>Motorista: Instruções voz/visual: "Em 300m, vire à direita na Rua Augusta"

    loop Para cada waypoint
        MapLibre->>App: GPS update (location, speed, bearing)
        App->>App: Verifica proximidade waypoint atual (< 50m)
        App->>App: Verifica desvio rota (> 200m por 30s)
        alt Desvio detectado
            App->>OSRM: POST /route/v1/driving/{current};{next_waypoints}
            OSRM-->>App: Nova geometry + steps
            App->>MapLibre: Atualizar rota
        end
    end

    Motorista->>App: Chega no local, toca "Cheguei"
    App->>App: Abre câmera (expo-camera)
    Motorista->>App: Captura foto
    App->>App: Valida foto (blur check + GPS accuracy < 50m)
    Motorista->>App: (Opcional) Assina canvas
    Motorista->>App: (Opcional) Seleciona problema + observação
    Motorista->>App: Toca "Confirmar Entrega"
    App->>App: Waypoint.status = ENTREGUE, Comprovacao criada
    App->>API: POST /deliveries { waypointId, fotoUrl, assinaturaUrl, observacao, gps, timestamp }
    API->>DB: INSERT comprovacao, UPDATE waypoint
    API->>MinIO: UPLOAD foto/assinatura
    API-->>App: 201 Created { deliveryId }

    alt Config WhatsApp: remetente = destinatario
        App->>EVO: POST /message/sendText { number, text(template), instance }
        EVO->>WA: Envia via Baileys/Cloud API
        WA-->>EVO: message_id + status callbacks (WebSocket)
        EVO-->>App: WebSocket: messages.upsert { status: delivered/read }
        App->>API: POST /whatsapp/logs { waypointId, messageId, status, telefone }
        API->>DB: INSERT whatsapp_log
    end

    App->>App: Próximo waypoint.status = EM_ROTA
    App->>MapLibre: Atualizar destino para próximo waypoint
end

    Motorista->>App: Última entrega confirmada, toca "Finalizar Rota"
    App->>API: PUT /routes/{id} { status: 'concluida', metricasFinais }
    API->>DB: UPDATE rota, CALCULAR metricas finais
    App-->>Motorista: Tela resumo + botão "Exportar PDF"
```

---

## 5. Diagrama de Sequência — Sync Offline/Online

```mermaid
sequenceDiagram
    actor Motorista
    participant App as EntregaFácil App (Offline)
    participant Queue as Sync Queue (Local SQLite)
    participant API as Backend API
    participant DB as PostgreSQL

    Note over App,Queue: MODO AVIÃO (Offline)
    
    Motorista->>App: Completa 3 entregas (foto + assinatura + obs)
    App->>Queue: ENQUEUE create:delivery { payload, timestamp }
    App->>Queue: ENQUEUE update:waypoint { status: entregue }
    App-->>Motorista: "Salvo offline — sincronizará quando conectar"

    Note over App,Queue: DISPOSITIVO VOLTA ONLINE
    
    App->>App: Detecta conectividade (NetInfo)
    App->>Queue: FLUSH queue (batch 10 ops)
    App->>API: POST /sync/batch { operations: [...] }
    
    API->>DB: BEGIN TRANSACTION
    loop Para cada operation
        alt create:delivery
            API->>DB: INSERT delivery, waypoint, comprovacao
        else update:waypoint
            API->>DB: UPDATE waypoint SET status='entregue'
        else conflict: same entity updated server+local
            API->>API: LWW (timestamp) + flag manual_merge se campos iguais
        end
    end
    API->>DB: COMMIT
    API-->>App: { applied: 5, conflicts: 0, server_changes: 2 }
    
    App->>Queue: CLEAR applied operations
    App->>App: APPLY server_changes (novas rotas do gestor)
    App-->>Motorista: Toast "Sincronizado: 5 enviadas, 2 recebidas"
```

---

## 6. Diagrama de Componentes (Component Diagram)

```mermaid
graph TB
    subgraph "Mobile App (React Native + Expo)"
        direction TB
        subgraph "Features"
            FAddr[addresses\n- AddressForm\n- AddressList\n- CSVImporter\n- WhatsAppShare]
            FRoute[routes\n- RouteBuilder\n- ChecklistDraggable\n- RouteOptimizer]
            FNav[navigation\n- NavigationView\n- TurnByTurn\n- DrivingMode]
            FProof[proof\n- CameraCapture\n- SignatureCanvas\n- ProblemSelector]
            FWA[whatsapp\n- WAConfig\n- TemplateEditor\n- ContactManager]
            FHist[history\n- RouteHistory\n- RouteDetail\n- ReportExporter]
            FProf[profile\n- DriverProfile\n- VehicleForm\n- Preferences]
        end

        subgraph "Shared"
            UI[ui\n- Button, Card, Input, Modal\n- MapView, ChecklistItem]
            Hooks[hooks\n- useLocation, useSync\n- useOSRM, useEvolution]
            Utils[utils\n- geo, date, format, validation]
            Store[store\n- Zustand: routes, addresses\n- queue, settings]
            API[api\n- axios instance + interceptors\n- offline queue middleware]
        end

        subgraph "Native Modules (Bare)"
            MNMap[maplibre-native\nMapLibre Navigation SDK]
            MNCam[expo-camera\nCameraView]
            MNLoc[expo-location\nGPS + Background]
            MNFS[expo-file-system\nMBTiles + Photos]
            MNSQL[expo-sqlite/async-storage\nLocal DB + Queue]
        end
    end

    subgraph "Backend (Node.js + Hono)"
        direction TB
        BAPI[API Routes\n- /addresses\n- /routes\n- /deliveries\n- /sync\n- /reports\n- /health]
        BAuth[Auth\n- Better Auth\n- JWT + Refresh\n- Roles]
        BOSRM[OSRM Client\n- Trip / Route / Table\n- Cache Redis]
        BGH[GraphHopper Client\n- VRP Optimize]
        BEVO[Evolution Client\n- Send Message\n- WebSocket Events]
        BMinIO[MinIO Client\n- Presigned URLs\n- Upload/Download]
        BDB[(PostgreSQL + PostGIS\n- Prisma/Drizzle ORM)]
        BRedis[(Redis\n- Session + Cache + Queue)]
    end

    subgraph "Infrastructure (Docker Compose VPS)"
        IOSRM[OSRM Container\n- brazil-latest.osrm\n- MLD profile]
        IGH[GraphHopper Container\n- brazil-gh\n- jsprit VRP]
        IEVO[Evolution API Container\n- PostgreSQL + Redis\n- Baileys/Cloud API]
        IDB[PostgreSQL 16 + PostGIS]
        IRedis[Redis 7]
        IMinIO[MinIO]
    end

    FAddr --> Hooks
    FRoute --> Hooks
    FNav --> Hooks
    FProof --> Hooks
    FWA --> Hooks
    FHist --> Hooks
    FProf --> Hooks

    Hooks --> API
    Hooks --> Store
    Hooks --> Utils
    UI --> Hooks
    UI --> Store

    API --> BAPI
    MNMap --> IOSRM
    MNCam --> MNFS
    MNLoc --> MNFS
    MNSQL --> Store

    BAPI --> BAuth
    BAPI --> BOSRM
    BAPI --> BGH
    BAPI --> BEVO
    BAPI --> BMinIO
    BAPI --> BDB
    BAPI --> BRedis

    BOSRM --> IOSRM
    BGH --> IGH
    BEVO --> IEVO
    BDB --> IDB
    BRedis --> IRedis
    BMinIO --> IMinIO
```

---

## 7. Diagrama de Deploy (Deployment Diagram)

```mermaid
graph TB
    subgraph "Motorista Device"
        Device[📱 Android/iOS\nEntregaFácil App\nReact Native + Expo\nBare Workflow]
    end

    subgraph "VPS (Hetzner CX42 - 8 vCPU, 16GB RAM, 160GB SSD)"
        direction TB
        Docker[Docker Engine + Compose]
        
        subgraph "Containers"
            C_API[entregafacil-api\nHono/Node.js 20\nPort: 3000]
            C_OSRM[osrm-backend\nProject-OSRM/osrm-backend\nPort: 5000\nVolume: /data/brazil.osrm]
            C_GH[graphhopper\nGraphHopper 11.x\nPort: 8989\nVolume: /data/gh]
            C_EVO[evolution-api\nEvolution Foundation\nPort: 8080\nVolume: /data/evolution]
            C_PG[(postgres:16-alpine\nPostGIS\nPort: 5432\nVolume: pgdata)]
            C_REDIS[(redis:7-alpine\nPort: 6379\nVolume: redisdata)]
            C_MINIO[(minio/minio\nPort: 9000/9001\nVolume: miniodata)]
        end
        
        Nginx[Nginx Reverse Proxy\nSSL/TLS Termination\nPort: 80/443\nDomínio: api.entregafacil.app]
    end

    subgraph "Externo"
        DNS[DNS: api.entregafacil.app\nA record → VPS IP]
        OSM[Geofabrik Brazil PBF\nDownload mensal (cron)]
        WA[WhatsApp Servers\nBaileys WebSocket / Cloud API HTTPS]
    end

    Device -->|HTTPS/WSS| Nginx
    Nginx --> C_API
    Nginx --> C_OSRM
    Nginx --> C_GH
    Nginx --> C_EVO

    C_API --> C_PG
    C_API --> C_REDIS
    C_API --> C_MINIO
    C_API --> C_OSRM
    C_API --> C_GH
    C_API --> C_EVO

    C_EVO --> WA
    C_OSRM --> OSM
    C_GH --> OSM

    Docker --> C_API
    Docker --> C_OSRM
    Docker --> C_GH
    Docker --> C_EVO
    Docker --> C_PG
    Docker --> C_REDIS
    Docker --> C_MINIO
```

---

## 8. Diagrama de Estados (State Machine) — Waypoint Status

```mermaid
stateDiagram-v2
    [*] --> PENDENTE : Rota criada
    PENDENTE --> EM_ROTA : Iniciar Rota / Próximo waypoint
    EM_ROTA --> ENTREGUE : Confirmar Entrega (foto válida)
    EM_ROTA --> PROBLEMA : Confirmar + Selecionar problema
    EM_ROTA --> CANCELADA : Motorista cancela
    PROBLEMA --> ENTREGUE : Re-tentar + Confirmar
    CANCELADA --> [*]
    ENTREGUE --> [*] : Rota finalizada
    
    note right of EM_ROTA
        Auto-próximo: ao ENTREGUE/PROBLEMA,
        waypoint+1.status = EM_ROTA
    end note
    
    note right of PROBLEMA
        Conta como "finalizado" para
        avançar rota (RN-009)
    end note
```

---

## 9. Diagrama de Atividades — Sync Engine

```mermaid
flowchart TD
    Start([Sync Trigger]) --> Online{Online?}
    Online -->|Não| QueueLocal[Enqueue Local\nSQLite/AsyncStorage]
    Online -->|Sim| Flush[Flush Queue\nBatch 10 ops]
    Flush --> POST[POST /sync/batch]
    POST --> Server{Server OK?}
    Server -->|Erro 5xx/Network| Retry[Backoff Exponencial\nMax 3 tentativas]
    Retry --> POST
    Server -->|200| Parse[Parse Response\napplied, conflicts, server_changes]
    Parse --> Conflicts{Conflitos > 0?}
    Conflicts -->|Sim| Resolve[Resolver LWW +\nFlag Manual Merge]
    Conflicts -->|Não| Apply[Apply Server Changes\nUpsert Entities]
    Resolve --> Apply
    Apply --> Clear[Clear Applied Ops\nLocal Queue]
    Clear --> Notify[Notify UI\nToast/Event]
    Notify --> End([Sync Complete])
    QueueLocal --> End
```

---

## 10. ADRs (Architecture Decision Records)

### ADR-001: Mobile Framework — React Native + Expo (Bare Workflow)

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Precisamos de performance em mapas, navegação turn-by-turn, offline-first, build APK/AAB.  
**Decisão:** React Native 0.76 + Expo SDK 58 (Managed → Bare quando necessário MapLibre Navigation SDK).  
**Alternativas:** Flutter (mapas offline menos maduros), KMP (ecossistema menor), Capacitor (performance mapas).  
**Consequências:** 
- ✅ MapLibre React Native nativo, Expo Maps fallback, EAS Build cloud
- ✅ Maior pool devs, OTA updates, ecossistema maduro
- ⚠️ Bare workflow adiciona complexidade (Xcode/Android Studio local para build nativo)
- ⚠️ Tamanho APK maior que Flutter nativo

---

### ADR-002: Map Engine — MapLibre React Native (Primary) + Expo Maps (Fallback)

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Mapas offline (MBTiles), turn-by-turn, vetor tiles, zero custo licença.  
**Decisão:** MapLibre React Native (676⭐, MIT) como engine principal; Expo Maps (Google Maps Android / Apple Maps iOS) apenas fallback visual em dev.  
**Alternativas:** Google Maps SDK (custo, sem offline real), Mapbox (custo, licença), Leaflet (não nativo mobile).  
**Consequências:**
- ✅ MBTiles suporte nativo, Navigation SDK turn-by-turn offline
- ✅ Style JSON customizável, 60fps nativo
- ⚠️ Requer Bare workflow para Navigation SDK
- ⚠️ Geração MBTiles (Planetiler) adiciona step no deploy

---

### ADR-003: Routing Engine — OSRM Self-Hosted (Primary) + GraphHopper (Fallback VRP)

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** VRP/TSP para 10-50 waypoints, offline-capable, zero custo, performance <3s.  
**Decisão:** OSRM (C++, MLD pipeline) para Trip/TSP guloso (primary); GraphHopper (Java, jsprit) para VRP com restrições (capacidade, janelas tempo) — fase 2.  
**Alternativas:** Google Routes API (pago, cloud-only), Mapbox Optimization (pago), Valhalla (complexo).  
**Consequências:**
- ✅ Zero custo licença, VPS próprio, controle total
- ✅ OSRM Trip resolve TSP 30 waypoints < 100ms
- ⚠️ GraphHopper Java consome mais RAM (2-4GB para Brasil)
- ⚠️ Pré-processamento PBF → OSRM/GraphHopper (cron mensal)

---

### ADR-004: WhatsApp Integration — Evolution API Self-Hosted (Docker)

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Notificação automática entrega, template variáveis, remetente configurável, LGPD compliance.  
**Decisão:** Evolution API (10.1k⭐, Apache 2.0) self-hosted Docker, modo híbrido: Baileys (gratuito, risco banimento) + Cloud API (oficial, pago/conversa).  
**Alternativas:** WhatsApp Cloud API direto (complexo, custo), Baileys direto (manutenção, risco), Twilio/Gupshup (caro, vendor lock-in).  
**Consequências:**
- ✅ Uma API para ambos provedores, WebSocket events tempo real
- ✅ Self-hosted = controle dados LGPD, zero custo licença
- ⚠️ Baileys requer monitoramento connectionState, QR Code pairing
- ⚠️ Cloud API requer Meta Business Verification, custo por conversa

---

### ADR-005: Offline Maps — MBTiles (OpenMapTiles) + MapLibre Local Style

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Navegação em áreas sem sinal, tiles vetoriais, download sob demanda WiFi.  
**Decisão:** Gerar MBTiles via Planetiler/OpenMapTiles (Brasil ~2GB, estados ~200-500MB), download no app (expo-file-system), MapLibre carrega style.json local + source MBTiles.  
**Alternativas:** Mapbox Offline (pago, vendor), GraphHopper offline (legacy, não mantido), TileServer-GL (server-side).  
**Consequências:**
- ✅ 100% offline após download, 60fps, estilo customizável
- ✅ Atualização mensal via job cron (Geofabrik → Planetiler → MBTiles → MinIO → App)
- ⚠️ Tamanho download grande (WiFi obrigatório)
- ⚠️ Geração MBTiles requer servidor potente (Planetiler multi-thread)

---

### ADR-006: Database — PostgreSQL + PostGIS + Drizzle ORM

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Dados geoespaciais (rotas, waypoints, heatmaps), ACID, JSONB, type-safe ORM.  
**Decisão:** PostgreSQL 16 + PostGIS 3.5, Drizzle ORM (type-safe, SQL-like, leve), migrations versionadas.  
**Alternativas:** MongoDB (geo nativo mas sem ACID forte), SQLite (local only), Prisma (mais pesado, runtime overhead).  
**Consequências:**
- ✅ Queries geoespaciais nativas (ST_DWithin, ST_MakeLine, ST_Distance)
- ✅ Drizzle: zero runtime overhead, inferência TypeScript perfeita
- ⚠️ PostGIS adiciona complexidade no Docker (extensão)

---

### ADR-007: Sync Strategy — Optimistic UI + Background Sync + LWW Conflict Resolution

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Offline-first, motorista em campo sem sinal, múltiplos devices (raro), gestor web (futuro).  
**Decisão:** Optimistic UI (atualiza local即时), queue local (SQLite) com idempotência (operation.id UUID), background sync (WorkManager/Background Fetch 15min + manual pull), conflict resolution: Last-Write-Wins por timestamp + flag manual merge se mesmo campo.  
**Alternativas:** CRDT (complexo, overkill), Server-wins (perde dados offline), Manual merge sempre (UX ruim).  
**Consequências:**
- ✅ UX fluida offline, sync confiável, auditoria completa
- ✅ Idempotência garante reentrancy segura
- ⚠️ LWW pode perder atualizações simultâneas legítimas (mitigado: flag manual merge)

---

### ADR-008: Build/Deploy — EAS Build + GitHub Actions + VPS Docker Compose

**Status:** Accepted  
**Data:** 2026-11-17  
**Contexto:** Build APK/AAB cloud, CI/CD, deploy infra imutável, rollback fácil.  
**Decisão:** EAS Build (Expo) para mobile (grátis 30 builds/mês), GitHub Actions para CI (lint, test, typecheck, SRS validation), VPS Docker Compose para backend (docker-compose.yml versionado, `docker compose up -d` deploy).  
**Alternativas:** Fastlane local (complexo), Codemagic (pago), Kubernetes (overkill), Ansible (mais complexo).  
**Consequências:**
- ✅ Build cloud sem Xcode/Android Studio local (managed workflow)
- ✅ Infra declarativa, rollback = `docker compose up -d` com tag anterior
- ⚠️ Bare workflow requer EAS Build com `android.gradle` customizado

---

## 11. Resumo de Decisões Técnicas

| ADR | Decisão | Impacto Risco | Mitigação |
|-----|---------|---------------|-----------|
| 001 | React Native + Expo Bare | Médio (complexidade nativa) | Documentação setup, scripts automatizados |
| 002 | MapLibre + Expo Maps | Baixo | Fallback testado CI |
| 003 | OSRM + GraphHopper | Baixo | Health checks, fallback automático |
| 004 | Evolution API Hybrid | Alto (Baileys banimento) | Cloud API primary, monitoramento ativo |
| 005 | MBTiles Planetiler | Médio (tamanho download) | WiFi only, progresso real, resume |
| 006 | PostgreSQL + PostGIS + Drizzle | Baixo | Migrations testadas CI |
| 007 | Optimistic + LWW + Manual | Baixo | Testes propriedade sync |
| 008 | EAS + GH Actions + Docker | Baixo | Rollback documentado |

---

**Próximo:** FASE 5 — Scrum/Backlog (Épicos, User Stories, Sprints)