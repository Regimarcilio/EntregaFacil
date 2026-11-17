# SRS — EntregaFácil (Especificação de Requisitos de Software)

**Versão:** 0.1  
**Data:** 2026-11-17  
**Autor:** PLANMASTER  
**Branch:** develop  
**Base:** docs/templates/SRS_TEMPLATE.md  
**Referência:** https://integrador-cedup.glide.page/dl/a400f7

---

## 1. Introdução

### 1.1 Propósito
Este documento especifica os requisitos funcionais e não-funcionais do **EntregaFácil**, aplicativo mobile (Android/iOS) para motoristas de aplicativo de entrega (iFood, Uber Eats, 99Food, Rappi) e motoboys autônomos. O objetivo é otimizar rotas multi-parada, automatizar comprovação de entrega e notificar clientes/destinatários via WhatsApp, funcionando parcialmente offline.

### 1.2 Escopo
**Produto:** EntregaFácil v0.1 (MVP)  
**Contexto:** Motoristas que fazem 10-50 entregas/dia, precisam roteirizar múltiplos endereços, comprovar entrega (foto+GPS+assinatura) e avisar cliente automaticamente.  
**Limites:** Não integra APIs oficiais iFood/Uber (fora do escopo MVP). Não gerencia pagamentos. Foco no motorista, não no cliente final.

### 1.3 Definições, Acrônimos, Abreviações

| Termo | Definição |
|-------|-----------|
| **VRP** | Vehicle Routing Problem — problema de roteirização de veículos |
| **TSP** | Traveling Salesman Problem — problema do caixeiro viajante (ordem ótima de paradas) |
| **OSRM** | Open Source Routing Machine — engine de roteamento open source |
| **MBTiles** | Formato de tiles vetoriais offline (SQLite) |
| **Evolution API** | API open source para integração WhatsApp (Baileys + Cloud API) |
| **MapLibre** | Fork open source do Mapbox GL, renderiza vetor tiles |
| **OTA** | Over-The-Air updates (Expo Updates) |
| **LGPD** | Lei Geral de Proteção de Dados (Lei 13.709/2018) |
| **PBF** | Protocolbuffer Binary Format — dump OpenStreetMap |
| **CH/MLD** | Contraction Hierarchies / Multi-Level Dijkstra — algoritmos OSRM |
| **jsprit** | Biblioteca Java para VRP com restrições (capacidade, janelas tempo) |

### 1.4 Referências
- [Visão e Escopo](docs/01-visao-e-escopo.md)
- [Benchmarks Referenciais](docs/02-benchmarks.md)
- [Evolution API Docs](https://docs.evolutionfoundation.com.br)
- [OSRM HTTP API](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md)
- [MapLibre React Native](https://maplibre.org/maplibre-react-native/)
- [Expo Maps SDK](https://docs.expo.dev/versions/latest/sdk/maps/)
- LGPD (Lei 13.709/2018), Lei do Motoboy (Lei 12.009/2009)
- WCAG 2.1 AA, Material Design 3 / Human Interface Guidelines

### 1.5 Visão Geral
Este SRS contém: Requisitos Funcionais (RF), Não-Funcionais (RNF), Regras de Negócio (RN), Interfaces, Matriz de Rastreabilidade, Riscos e Glossário.

---

## 2. Descrição Geral

### 2.1 Perspectiva do Produto
Sistema independente, mobile-first (React Native + Expo), arquitetura offline-first com sincronização assíncrona. Backend self-hosted (Docker Compose em VPS) expõe APIs REST + WebSocket para: roteirização (OSRM/GraphHopper), WhatsApp (Evolution API), sincronização de dados (PostgreSQL + PostGIS), armazenamento de arquivos (MinIO).

### 2.2 Funções do Produto (Resumo)
1. **Gestão de Endereços** — CRUD, busca (OSM/Google Places), importação CSV/WhatsApp, geocoding reverso
2. **Checklist de Entregas** — Lista reordenável, status machine, filtros, agrupamento por região
3. **Otimização de Rota** — VRP/TSP via OSRM (Trip) / GraphHopper (jsprit), parâmetros: capacidade, prioridade, janelas tempo
4. **Navegação** — Turn-by-turn offline (MapLibre Navigation SDK v0.2), recálculo automático, instruções voz/visual
5. **Comprovação** — Foto obrigatória (câmera/galeria), GPS + timestamp + hash, assinatura digital (canvas), observações
6. **Notificação WhatsApp** — Template pré-aprovado, remetente configurável (motorista/destinatário), status delivery/read
7. **Modo Offline** — Cache tiles MBTiles, rotas JSON, fotos locais, sync automático quando online
8. **Histórico/Relatórios** — Filtros, export CSV/PDF, resumo diário (km, tempo, ganhos estimados)
9. **Perfil/Config** — Dados motorista, veículo, preferências (som, unidade, tema, WhatsApp)

### 2.3 Características dos Usuários
| Perfil | Experiência Técnica | Necessidades Especiais |
|--------|---------------------|------------------------|
| Motoboy App | Baixa-Média (usa apps nativos) | UI simples, botões grandes, modo luva, voz |
| Motoboy Autônomo | Média (WhatsApp, planilhas) | Import CSV, relatórios, multi-cliente |
| Gestor Frota | Média-Alta | Dashboard web (v0.2), API acesso dados |

### 2.4 Restrições

| Categoria | Restrição |
|-----------|-----------|
| **Hardware** | Android 8+ (API 26), iOS 15+; RAM ≥ 2GB; armazenamento ≥ 2GB livre |
| **SO/Plataforma** | React Native 0.76+, Expo SDK 58, Node.js 20+ (backend) |
| **Bibliotecas** | MapLibre React Native, Expo Maps, Evolution API, OSRM, Drizzle ORM, Better Auth |
| **Regulatórias** | LGPD (consentimento, direito exclusão, portabilidade), Lei 12.009/2009 (jornada, EPI), WCAG 2.1 AA |
| **Padrões** | Conventional Commits, SemVer, GitFlow (develop-first), ADR para decisões arquiteturais |
| **Orçamento** | Zero licenças (open source only); VPS ~R$200/mês |
| **Prazo** | MVP 8-10 semanas (5 sprints x 2 semanas) |

### 2.5 Premissas e Dependências
1. **Premissa:** Motorista tem smartphone Android/iOS compatível com GPS e câmera
2. **Premissa:** VPS com Docker disponível para deploy backend (OSRM, Evolution, PostgreSQL, Redis, MinIO)
3. **Dependência Externa:** OpenStreetMap data (Geofabrik Brazil PBF ~2GB) para OSRM/GraphHopper
4. **Dependência Externa:** Evolution API instance rodando e conectada ao WhatsApp (Baileys ou Cloud API)
5. **Premissa:** Motorista aceita conceder permissões: Localização (precisa), Câmera, Armazenamento, Notificações
6. **Dependência:** Expo EAS Build para builds de produção (grátis até 30/mês)

---

## 3. Requisitos Funcionais (RF)

> **Formato:** RF-XXX | Prioridade (MoSCoW) | Ator | Descrição | Dependências | Critério de Aceite (Gherkin)

### 3.1 Módulo: Endereços & Geocoding

#### RF-001: Cadastrar Endereço Manual
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Permitir inserir endereço digitando livremente com autocomplete (OSM Nominatim / Google Places) e confirmar no mapa.  
**Dependências:** RF-002, RN-001  
**Critério de Aceite:**
```gherkin
Given o motorista está na tela "Novo Endereço"
When ele digita "Rua Augusta, 500, São Paulo" no campo busca
And seleciona o resultado "Rua Augusta, 500 - Consolação, São Paulo - SP"
And toca "Confirmar no Mapa"
And ajusta o pin se necessário
And toca "Salvar"
Then o endereço aparece na lista "Meus Endereços" com: nome, endereço formatado, lat/lng, cep, bairro, cidade, estado
And o endereço é salvo no banco local (SQLite/AsyncStorage) e enfileirado para sync
```

#### RF-002: Buscar Endereço via Autocomplete
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Autocomplete com debounce 300ms, usando Nominatim (gratuito) ou Google Places (se API key configurada).  
**Dependências:** RN-002  
**Critério de Aceite:**
```gherkin
Given o motorista digita no campo busca de endereço
When ele para de digitar por 300ms
And o termo tem ≥ 3 caracteres
Then a app faz request para Nominatim/Google Places
And exibe até 5 sugestões com: nome, endereço curto, distância da localização atual (se GPS disponível)
And ao tocar uma sugestão, preenche os campos do formulário
```

#### RF-003: Importar Endereços via CSV
**Prioridade:** Should | **Ator:** Motorista  
**Descrição:** Importar arquivo CSV com colunas: nome, endereço, lat, lng, cep, observações. Validação linha a linha.  
**Dependências:** RF-001, RF-002  
**Critério de Aceite:**
```gherkin
Given o motorista toca "Importar CSV" na lista de endereços
And seleciona arquivo "entregas_hoje.csv" com 25 linhas válidas
When o app processa o arquivo
Then exibe preview com: linhas válidas (verde), linhas com erro (vermelho + motivo)
And ao confirmar, cria 25 endereços na base local
And mostra toast "25 endereços importados, 0 erros"
```

#### RF-004: Importar Endereços via WhatsApp (Compartilhar)
**Prioridade:** Could | **Ator:** Motorista  
**Descrição:** Receber endereços compartilhados via WhatsApp (Share Extension / Intent) — parse de texto livre para extrair endereços.  
**Dependências:** RF-001, RF-002  
**Critério de Aceite:**
```gherkin
Given o motorista recebe mensagem WhatsApp com: "Entregas: 1) Rua A, 100 2) Av B, 200 3) Praça C, 300"
When ele compartilha a mensagem para o EntregaFácil (Share Sheet)
Then o app extrai 3 endereços candidatos
And exibe tela de confirmação com cada endereço geocodado
And ao confirmar, adiciona os 3 à lista
```

#### RF-005: Editar/Excluir Endereço
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Swipe actions na lista: editar (abre formulário pré-preenchido), excluir (confirmação).  
**Dependências:** RF-001  
**Critério de Aceite:**
```gherkin
Given a lista "Meus Endereços" tem 10 itens
When o motorista faz swipe left no item 3
And toca "Excluir"
And confirma no modal
Then o item é removido da lista e do banco local
And sync queue marca como deleted
```

---

### 3.2 Módulo: Checklist de Entregas

#### RF-006: Criar Nova Rota (Checklist)
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Agrupar endereços selecionados em uma "Rota do Dia" com nome, data, veículo, observações.  
**Dependências:** RF-001, RF-005  
**Critério de Aceite:**
```gherkin
Given o motorista tem 15 endereços salvos
When ele toca "Nova Rota"
And seleciona 12 endereços (checkbox multi-select)
And define nome "Rota Centro - 17/11"
And toca "Criar"
Then a rota aparece na lista "Minhas Rotas" com status "Rascunho"
And mostra contador: "12 endereços, 0 otimizados, 0 entregues"
```

#### RF-007: Reordenar Checklist (Drag & Drop)
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Lista reordenável com `react-native-draggable-flatlist` ou `@shopify/flash-list` + `react-native-gesture-handler`.  
**Dependências:** RF-006  
**Critério de Aceite:**
```gherkin
Given uma rota com 5 endereços em ordem aleatória
When o motorista arrasta o item 5 para posição 1
And toca "Salvar Ordem"
Then a nova ordem persiste no banco local
And o badge "Ordem Manual" aparece ao lado do nome da rota
```

#### RF-008: Status Machine por Entrega
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Cada item da checklist tem estados: `PENDENTE` → `EM_ROTA` → `ENTREGUE` | `PROBLEMA` | `CANCELADA`. Transições válidas enforcadas.  
**Dependências:** RF-006, RN-003  
**Critério de Aceite:**
```gherkin
Given uma rota com status "Rascunho" e 3 endereços PENDENTE
When o motorista toca "Iniciar Rota" (RF-010)
Then o primeiro endereço muda para EM_ROTA (highlight visual)
And os demais permanecem PENDENTE
When o motorista toca "Confirmar Entrega" no primeiro
And preenche comprovação (RF-013)
Then o status muda para ENTREGUE (verde, check)
And o segundo endereço muda automaticamente para EM_ROTA
```

#### RF-009: Filtrar/Agrupar Checklist
**Prioridade:** Should | **Ator:** Motorista  
**Descrição:** Filtros: Todos, Pendentes, Entregues, Problemas. Agrupamento: Por Bairro, Por Prioridade, Por Janela Tempo.  
**Dependências:** RF-008  
**Critério de Aceite:**
```gherkin
Given uma rota com 20 endereços em 5 bairros diferentes
When o motorista seleciona filtro "Por Bairro"
Then a lista agrupa com headers colapsáveis: "Centro (5)", "Vila Madalena (3)", ...
And tocar no header expande/contrai
```

---

### 3.3 Módulo: Otimização de Rota (VRP/TSP)

#### RF-010: Calcular Rota Otimizada (OSRM Trip)
**Prioridade:** Must | **Ator:** Motorista / Sistema  
**Descrição:** Enviar waypoints (lat/lng) para OSRM `/trip/v1/driving/` com parâmetros: `source=first`, `destination=last`, `roundtrip=false`, `steps=true`. Retornar ordem ótima + geometria polyline + duração/distância total.  
**Dependências:** RF-006, RN-004, Benchmarks (OSRM self-hosted)  
**Critério de Aceite:**
```gherkin
Given uma rota com 15 endereços (waypoints) em "Rascunho"
When o motorista toca "Otimizar Rota"
And o app envia request para OSRM local (VPS)
Then em < 3s retorna resposta com: waypoints reordenados, geometry (polyline), legs (duração/distância por trecho)
And o app atualiza a ordem local da checklist conforme `waypoints[i].waypoint_index`
And exibe no mapa a rota completa (polyline colorida)
And mostra resumo: "Distância total: 42.3 km | Tempo estimado: 1h 15min | Economia vs manual: ~18%"
And status da rota muda para "Otimizada"
```

#### RF-011: Roteirização com Restrições (GraphHopper jsprit) — Fase 2
**Prioridade:** Could | **Ator:** Motorista / Sistema  
**Descrição:** VRP completo: capacidade veículo (peso/volume), janelas de tempo (entrega 10h-12h), prioridade, skills (moto vs carro).  
**Dependências:** RF-010, Benchmarks (GraphHopper)  
**Critério de Aceite:**
```gherkin
Given uma rota com 20 endereços, 5 com janela de tempo, veículo capacidade 50kg
When o motorista toca "Otimizar Avançado" (se disponível)
And o app envia para GraphHopper /vrp/optimize com: jobs, vehicles, relations
Then retorna solução com: routes[] (cada veículo), unassigned[], cost total
And exibe no mapa rotas por veículo (cores diferentes)
```

#### RF-012: Recalcular Rota em Tempo Real (Desvio)
**Prioridade:** Should | **Ator:** Sistema (GPS)  
**Descrição:** Se motorista sair da rota > 200m por > 30s, recalcular automaticamente from current location para próximos waypoints.  
**Dependências:** RF-010, RF-014 (navegação)  
**Critério de Aceite:**
```gherkin
Given navegação ativa no waypoint 3 de 10
When GPS detecta desvio > 200m da polyline por 30s consecutivos
Then app mostra toast "Recalculando rota..." (não bloqueia UI)
And chama OSRM /route/v1/driving/ current_location; next_waypoints...
And atualiza polyline no mapa e instruções de navegação
And mantém waypoints já entregues como ENTREGUE
```

---

### 3.4 Módulo: Navegação Turn-by-Turn

#### RF-013: Iniciar Navegação para Próxima Entrega
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Ao tocar "Navegar" (ou auto ao mudar status para EM_ROTA), iniciar MapLibre Navigation SDK (v0.2) ou fallback: seguir polyline + instruções simples (distância, próxima manobra).  
**Dependências:** RF-010, RF-008, Benchmarks (MapLibre Navigation)  
**Critério de Aceite:**
```gherkin
Given rota otimizada, status "Otimizada", waypoint 1 = EM_ROTA
When o motorista toca "Navegar" no card do waypoint 1
Then MapLibre Navigation inicia com: rota (polyline), instruções voz (PT-BR), modo 2D/3D, night mode auto
And mostra: distância até próxima manobra, nome da rua, ETA, velocidade atual
And botão "Cheguei" visível (grande, acessível)
```

#### RF-014: Instruções de Navegação Offline
**Prioridade:** Must | **Ator:** Sistema  
**Descrição:** OSRM retorna `steps[]` com instruções (manobra, distância, nome rua). App renderiza lista + voz (expo-speech / react-native-tts).  
**Dependências:** RF-010, RN-005  
**Critério de Aceite:**
```gherkin
Given navegação ativa para waypoint atual
When distância para próxima manobra < 500m
Then app anuncia por voz: "Em 300 metros, vire à direita na Rua Augusta"
And mostra visual: seta direção + "300m" + "Rua Augusta"
And repete em 100m e na manobra
```

#### RF-015: Modo "Dirigindo" (UI Simplificada)
**Prioridade:** Should | **Ator:** Motorista  
**Descrição:** Tela fullscreen: mapa grande, próxima instrução fixa no topo, botões grandes: "Cheguei", "Pular", "Problema", "Cancelar". Modo luva (touch target ≥ 48dp).  
**Dependências:** RF-013, RN-006  
**Critério de Aceite:**
```gherkin
Given navegação iniciada
When o motorista toca "Modo Dirigindo" (ou auto após 5s sem interação)
Then UI entra em modo kiosk: status bar oculta, botões 60x60dp, fonte 18sp+
And toque acidental em área do mapa não fecha modo
And apenas botões de ação funcionam
```

---

### 3.5 Módulo: Comprovação de Entrega

#### RF-016: Capturar Foto Obrigatória
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Ao tocar "Cheguei" → abre câmera (expo-camera) ou galeria. Foto obrigatória para confirmar. Metadados: EXIF GPS, timestamp, hash SHA-256, device ID.  
**Dependências:** RF-013, RN-007, RN-008 (LGPD)  
**Critério de Aceite:**
```gherkin
Given navegação ativa, waypoint atual = EM_ROTA
When o motorista toca "Cheguei"
Then abre tela de comprovação com: preview câmera (fullscreen), botão capturar (grande), toggle lanterna
When o motorista captura foto
Then app valida: imagem não borrada (laplacian variance > 100), GPS disponível (accuracy < 50m)
And exibe preview com: miniatura, coordenadas, timestamp, endereço reverso (geocoding)
And botão "Confirmar Entrega" habilitado apenas se foto válida
```

#### RF-017: Assinatura Digital (Canvas)
**Prioridade:** Should | **Ator:** Motorista / Destinatário  
**Descrição:** Canvas assinatura (react-native-signature-capture) opcional. Salva como PNG base64 + metadados.  
**Dependências:** RF-016  
**Critério de Aceite:**
```gherkin
Given foto capturada e validada
When o motorista toca "Adicionar Assinatura" (opcional)
Then abre canvas fullscreen: "Assine aqui", botões "Limpar", "Cancelar", "Salvar"
When assina e toca "Salvar"
Then assinatura anexada à comprovação (PNG 400x200, base64)
And preview mostra miniatura assinatura ao lado da foto
```

#### RF-018: Observações / Problemas
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Campo texto livre (max 500 chars) + seleção rápida: "Cliente ausente", "Endereço errado", "Recusou recebimento", "Outro".  
**Dependências:** RF-016, RN-009  
**Critério de Aceite:**
```gherkin
Given tela de comprovação aberta
When o motorista seleciona "Cliente ausente" + digita "Portão fechado, interfone não atende"
And toca "Confirmar Entrega"
Then status muda para ENTREGUE com flag "Problema: Cliente ausente"
And observação salva no registro
And WhatsApp notificação inclui observação (se configurado)
```

#### RF-019: Comprovação Offline (Queue Local)
**Prioridade:** Must | **Ator:** Sistema  
**Descrição:** Se sem internet, salva tudo local (SQLite/AsyncStorage + FileSystem fotos) + enfileira para sync. Sincroniza automático quando online.  
**Dependências:** RF-016, RF-017, RF-018, RN-010  
**Critério de Aceite:**
```gherkin
Given dispositivo em modo avião (offline)
When motorista completa entrega com foto + assinatura + observação
Then app mostra "Salvo offline — sincronizará quando conectar"
And dados persistem após fechar app / reiniciar celular
When dispositivo volta online
Then sync automático em background (WorkManager / Background Fetch)
And toast "3 entregas sincronizadas" ao concluir
```

---

### 3.6 Módulo: Notificação WhatsApp (Evolution API)

#### RF-020: Configurar Instância Evolution API
**Prioridade:** Must | **Ator:** Motorista (Setup Inicial)  
**Descrição:** Tela config: URL Evolution API, API Key, Instance Name, QR Code pairing (Baileys) ou Cloud API credentials. Teste conexão.  
**Dependências:** Benchmarks (Evolution API), RN-011  
**Critério de Aceite:**
```gherkin
Given primeira vez abrindo app
When motorista vai em Configurações > WhatsApp
And preenche: URL "https://evolution.meudominio.com", API Key "sk-...", Instance "motorista-001"
And toca "Testar Conexão"
Then app faz GET /instance/connectionState/motorista-001
And se conectado: mostra "Conectado ✅" + número WhatsApp
And se desconectado: mostra QR Code para pareamento (Baileys) ou instruções Cloud API
```

#### RF-021: Enviar Notificação Entrega Confirmada
**Prioridade:** Must | **Ator:** Sistema (Trigger: RF-018 confirmado)  
**Descrição:** POST `/message/sendText` Evolution API com template variáveis. Remetente configurável: `fromMe: true` (número do motorista) ou `fromMe: false` (número do destinatário via API oficial).  
**Dependências:** RF-020, RN-012, RN-013  
**Critério de Aceite:**
```gherkin
Given entrega confirmada (RF-018) para waypoint "João Silva - Rua A, 100"
And config WhatsApp: remetente = "Destinatário" (fromMe: false), template "entrega_confirmada"
When app envia POST /message/sendText {
  number: "5511999998888",  // telefone do destinatário (do cadastro endereço)
  text: "✅ Entrega #123 confirmada!\n📍 Rua A, 100 - Centro\n🕐 14:32\n📸 Foto: https://cdn.meudominio.com/entregas/abc123.jpg\n✍️ Assinatura: https://cdn.meudominio.com/entregas/abc123_sig.png",
  instance: "motorista-001"
}
Then Evolution API retorna 200 { key: { id: "msg_abc", ... } }
And app registra log: delivery_id, message_id, status "sent", timestamp
And WebSocket event "messages.upsert" chega com status "delivered" / "read"
And app atualiza log local para "delivered" / "read"
```

#### RF-022: Template WhatsApp com Variáveis Dinâmicas
**Prioridade:** Must | **Ator:** Motorista (Config)  
**Descrição:** Editor de template com placeholders: `{{pedido}}`, `{{endereco}}`, `{{hora}}`, `{{foto_url}}`, `{{assinatura_url}}`, `{{observacao}}`. Validação: tamanho ≤ 1024 chars, variáveis válidas.  
**Dependências:** RF-021, RN-014  
**Critério de Aceite:**
```gherkin
Given config WhatsApp > Templates
When motorista edita template "entrega_confirmada"
And insere: "Entrega {{pedido}} ok em {{endereco}} às {{hora}}. Foto: {{foto_url}}"
And toca "Salvar"
Then template salvo no banco local + sync
And preview mostra com dados mock preenchidos
```

#### RF-023: Gerenciar Contatos Destinatários
**Prioridade:** Should | **Ator:** Motorista  
**Descrição:** Cada endereço pode ter: nome destinatário, telefone WhatsApp, preferência notificação (sempre/nunca/apenas problema).  
**Dependências:** RF-001, RF-021  
**Critério de Aceite:**
```gherkin
Given endereço "Rua A, 100" editado
When motorista adiciona: "João Silva", "5511999998888", notificação "Sempre"
And salva
Then ao confirmar entrega nesse endereço, WhatsApp enviado para 5511999998888
And log mostra destinatário: "João Silva (5511999998888)"
```

---

### 3.7 Módulo: Offline & Sync

#### RF-024: Cache de Mapas Offline (MBTiles)
**Prioridade:** Must | **Ator:** Sistema / Motorista  
**Descrição:** Download sob demanda (WiFi) de regiões MBTiles (OpenMapTiles Brasil ~2GB total, estados ~200-500MB). Armazenamento em `FileSystem.documentDirectory`. MapLibre carrega style.json local + source MBTiles.  
**Dependências:** Benchmarks (MapLibre + MBTiles), RN-015  
**Critério de Aceite:**
```gherkin
Given motorista em Config > Mapas Offline
When toca "Baixar São Paulo (450MB)" e confirma
And dispositivo em WiFi
Then download inicia com progresso real (bytes/total)
And ao concluir, MapLibre recarrega com source local
And mapa funciona 100% offline (zoom, pan, rota renderizada)
And armazenamento mostra "Mapas: 450 MB"
```

#### RF-025: Sincronização Bidirecional (Background)
**Prioridade:** Must | **Ator:** Sistema  
**Descrição:** Queue de operações (CRUD endereços, rotas, comprovações). Sync: push local → server, pull server → local. Conflict resolution: Last-Write-Wins (timestamp) + manual merge se conflito de dados (ex: mesmo endereço editado em 2 devices).  
**Dependências:** RF-019, RN-010, RN-016  
**Critério de Aceite:**
```gherkin
Given app online, há 5 operações na queue local (3 creates, 1 update, 1 delete)
When sync trigger (manual pull-to-refresh ou background 15min)
Then app envia batch POST /sync/batch { operations: [...] }
And server responde { applied: 5, conflicts: 0, server_changes: 2 }
And app aplica 2 mudanças do server (novas rotas do gestor)
And queue local limpa operações aplicadas
And toast "Sincronizado: 5 enviadas, 2 recebidas"
```

---

### 3.8 Módulo: Histórico & Relatórios

#### RF-026: Listar Histórico de Rotas
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Tela com lista de rotas finalizadas: data, nome, status (Concluída/Parcial), total endereços, entregues, problemas, km, tempo, ganho estimado. Filtros: período, status.  
**Dependências:** RF-006, RF-008  
**Critério de Aceite:**
```gherkin
Given motorista tocou "Histórico"
When lista carrega
Then mostra cards: "Rota Centro - 17/11 | ✅ 12/12 | 42.3 km | 1h15m | R$ 185,00"
And filtros funcionam: "Última semana", "Este mês", "Com problemas"
And pull-to-refresh sincroniza com server
```

#### RF-027: Detalhe de Rota / Comprovações
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Ao tocar rota no histórico: lista de endereços com status, foto (thumb expansível), assinatura, observação, timestamp, GPS, status WhatsApp (enviado/entregue/lido/erro).  
**Dependências:** RF-016, RF-017, RF-018, RF-021  
**Critério de Aceite:**
```gherkin
Given rota "Rota Centro - 17/11" tocada no histórico
Then mostra 12 itens: 10 ✅ Entregue, 1 ⚠️ Problema, 1 ❌ Cancelada
And ao tocar item "João Silva": modal com foto fullscreen, assinatura, observação, mapa localização, log WhatsApp
And botão "Reenviar WhatsApp" se status = erro
```

#### RF-028: Exportar Relatório (CSV / PDF)
**Prioridade:** Should | **Ator:** Motorista  
**Descrição:** Exportar rota ou período: CSV (colunas padronizadas) ou PDF (layout profissional com logo, resumo, tabela, fotos thumbnails). Compartilhar via Share Sheet (WhatsApp, Email, Drive).  
**Dependências:** RF-026, RF-027  
**Critério de Aceite:**
```gherkin
Given detalhe da rota aberto
When motorista toca "Exportar" > "PDF Completo"
Then app gera PDF em background (react-native-pdf / expo-print)
And abre Share Sheet com arquivo "Rota_Centro_20261117.pdf"
And PDF contém: cabeçalho, resumo (km, tempo, ganhos), tabela endereços, fotos 3x3 grid, rodapé com hash validação
```

---

### 3.9 Módulo: Perfil & Configurações

#### RF-029: Perfil do Motorista
**Prioridade:** Must | **Ator:** Motorista  
**Descrição:** Nome, foto (câmera/galeria), CPF (mascarado), telefone, email, veículo (placa, modelo, cor, ano, tipo: moto/carro/bike), documento veículo (CRLV foto).  
**Dependências:** RN-017 (LGPD)  
**Critério de Aceite:**
```gherkin
Given tela Perfil
When motorista preenche todos campos e toca "Salvar"
Then dados salvos local + sync
And validações: placa formato brasileiro (AAA-0000 ou AAA0A00), CPF válido (algoritmo), email formato
```

#### RF-030: Preferências do App
**Prioridade:** Should | **Ator:** Motorista  
**Descrição:** Tema (Claro/Escuro/Sistema), Unidades (km/h vs mph), Voz navegação (Ativada/Desativada/Volume), Modo luva (On/Off), Auto-iniciar navegação (On/Off), Sync apenas WiFi (On/Off), Notificações push (On/Off).  
**Dependências:** RF-014, RF-015, RF-025  
**Critério de Aceite:**
```gherkin
Given Configurações > Preferências
When motorista altera "Tema" para "Escuro"
Then app aplica tema escuro imediatamente (react-native-appearance / Context)
And persiste preferência
```

---

## 4. Requisitos Não-Funcionais (RNF)

> **Formato:** RNF-XXX | Categoria | Prioridade | Descrição | Métrica/Target | Validação

### 4.1 Performance

#### RNF-001: Tempo de Cálculo Rota (OSRM Trip)
**Categoria:** Performance | **Prioridade:** Must  
**Descrição:** Cálculo de rota para até 30 waypoints deve completar em < 3s (rede local VPS) ou < 5s (rede 4G).  
**Métrica:** p95 < 3s (VPS local), p95 < 5s (4G)  
**Validação:** Benchmark automatizado CI: 100 requests com 10/20/30 waypoints SP capital

#### RNF-002: Tempo de Inicialização App (Cold Start)
**Categoria:** Performance | **Prioridade:** Must  
**Descrição:** Splash → Home interativo.  
**Métrica:** < 3s (Android), < 4s (iOS) em device médio (Snapdragon 680 / A14)  
**Validação:** `expo-startup-trace` + Sentry mobile vitals

#### RNF-003: Frame Rate Navegação/Mapa
**Categoria:** Performance | **Prioridade:** Must  
**Descrição:** Mapa 60fps durante pan/zoom/navegação.  
**Métrica:** 99th percentile ≥ 55fps (MapLibre native)  
**Validação:** `react-native-performance-monitor` + teste manual device farm

#### RNF-004: Tamanho APK / AAB
**Categoria:** Performance | **Prioridade:** Should  
**Métrica:** APK < 80MB, AAB < 60MB (download)  
**Validação:** `eas build --profile production` + `bundletool` analyze

#### RNF-005: Consumo Bateria (Navegação Ativa)
**Categoria:** Performance | **Prioridade:** Should  
**Métrica:** < 15%/hora (GPS + tela + CPU) em device médio  
**Validação:** Battery Historian + teste campo 2h navegação contínua

---

### 4.2 Segurança

#### RNF-006: Criptografia em Trânsito
**Categoria:** Security | **Prioridade:** Must  
**Descrição:** Todo tráfego API: HTTPS/TLS 1.3. WebSocket: WSS.  
**Métrica:** 100% requests HTTPS, 0 mixed content  
**Validação:** `nmap --script ssl-enum-ciphers` + `curl -v` headers

#### RNF-007: Criptografia em Repouso (Dados Sensíveis)
**Categoria:** Security | **Prioridade:** Must  
**Descrição:** SQLite local criptografado (SQLCipher / expo-secure-store para tokens). Fotos/assinaturas: arquivos criptografados (AES-256) ou armazenamento seguro do OS (Keychain/Keystore).  
**Métrica:** 0 dados sensíveis em plaintext no filesystem  
**Validação:** `kalimaster-sast` + inspeção manual device rooted

#### RNF-008: Autenticação e Autorização
**Categoria:** Security | **Prioridade:** Must  
**Descrição:** Better Auth: email/senha + magic link. JWT access token (15min) + refresh token (30d, rotação). Roles: `driver`, `admin`. API keys Evolution API com rotação.  
**Métrica:** 0 endpoints públicos sem auth (exceto health check)  
**Validação:** Teste penetração OWASP MASVS L1

#### RNF-009: LGPD Compliance
**Categoria:** Security | **Prioridade:** Must  
**Descrição:** Consentimento explícito (onboarding), direito exclusão (config > excluir conta), portabilidade (exportar todos dados JSON), minimização (coleta só necessário), DPO nomeado.  
**Métrica:** Checklist LGPD 100% ok  
**Validação:** Auditoria `docs/lgpd-checklist.md` + `kalimaster-sast` PII detection

---

### 4.3 Usabilidade & Acessibilidade

#### RNF-010: Acessibilidade WCAG 2.1 AA
**Categoria:** Usability | **Prioridade:** Must  
**Descrição:** TalkBack/VoiceOver: labels semânticos, contraste ≥ 4.5:1, touch target ≥ 48dp, foco visível, ordem lógica, anúncios de status.  
**Métrica:** 0 violações axe-core / Accessibility Scanner  
**Validação:** `axe-core` CI + teste manual TalkBack/VoiceOver cego

#### RNF-011: Modo Luva / Touch Targets
**Categoria:** Usability | **Prioridade:** Must  
**Descrição:** Modo condução: todos botões ≥ 60x60dp, espaçamento ≥ 8dp, fonte ≥ 18sp, cores alto contraste.  
**Métrica:** 100% botões ação ≥ 60dp no modo dirigindo  
**Validação:** Inspeção visual + teste com luva de motoboy real

#### RNF-012: Internacionalização (i18n) — PT-BR Only MVP
**Categoria:** Usability | **Prioridade:** Won't (MVP)  
**Descriência:** App apenas PT-BR v0.1. Infra i18n (expo-localization + i18next) preparada para fase 2.  
**Métrica:** 0 hardcoded strings em componentes (todas em `locales/pt-BR.json`)

---

### 4.4 Confiabilidade & Disponibilidade

#### RNF-013: Funcionamento Offline (Core Features)
**Categoria:** Reliability | **Prioridade:** Must  
**Descrição:** Navegação, comprovação, checklist, mapa (tiles cached) funcionam 100% offline. Sync quando online.  
**Métrica:** 0 crashes offline, 100% operações enfileiradas sincronizam  
**Validação:** Teste campo: modo avião + 10 entregas completas + reconexão

#### RNF-014: Taxa de Crash-Free Sessions
**Categoria:** Reliability | **Prioridade:** Must  
**Métrica:** > 99.5% (Play Console / Sentry)  
**Validação:** Monitoramento contínuo produção

#### RNF-015: Sincronização Confiável
**Categoria:** Reliability | **Prioridade:** Must  
**Descrição:** Sync idempotente (retry com mesmo payload = mesmo resultado). Conflict resolution determinístico.  
**Métrica:** 0 perda de dados em 1000 ciclos sync simulados (network flaky)  
**Validação:** Chaos testing (toxiproxy) + property-based tests

---

### 4.5 Escalabilidade & Manutenibilidade

#### RNF-016: Arquitetura Modular (Feature-based)
**Categoria:** Maintainability | **Prioridade:** Should  
**Descrição:** Pastas: `src/features/{addresses,routes,navigation,proof,whatsapp,history,profile,settings}` + `src/shared/{ui,hooks,utils,api,store}`.  
**Métrica:** 0 imports circulares, dependency graph acíclico  
**Validação:** `madge --circular` CI

#### RNF-017: Observabilidade (Logs, Métricas, Traces)
**Categoria:** Scalability | **Prioridade:** Should  
**Descrição:** OpenTelemetry + Grafana Stack (Loki logs, Tempo traces, Prometheus métricas). Custom events: `route_calculated`, `delivery_confirmed`, `whatsapp_sent`, `sync_completed`.  
**Métrica:** 100% fluxos críticos instrumentados  
**Validação:** Dashboard Grafana operacional

---

## 5. Requisitos de Interface

### 5.1 Interfaces de Usuário (UI)
- **Design System:** React Native Paper (Material You) + custom tokens (cores, spacing, tipografia)
- **Telas Principais (MVP):** Splash, Onboarding (permissões + WhatsApp), Home (Rotas), Nova Rota, Checklist, Mapa/Rota, Navegação, Comprovação, Histórico, Detalhe Rota, Perfil, Configurações
- **Componentes Críticos:** `DraggableChecklistItem`, `MapView` (MapLibre/Expo Maps), `NavigationView`, `CameraCapture`, `SignatureCanvas`, `WhatsAppConfig`, `OfflineMapDownloader`, `SyncIndicator`
- **Acessibilidade:** `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `accessibilityHint` em todos componentes interativos
- **Responsivo:** Phone (360-420dp width), Tablet (opcional fase 2), Landscape (navegação)

### 5.2 Interfaces de Hardware
- **GPS:** `expo-location` (high accuracy, foreground + background)
- **Câmera:** `expo-camera` (photo only, no video)
- **Armazenamento:** `expo-file-system` + `expo-media-library` (fotos/assinaturas)
- **Sensores:** Acelerômetro (opcional: detectar parada/movimento para auto-status)
- **Bluetooth:** Fora escopo (impressora térmica fase 2)

### 5.3 Interfaces de Software / APIs

| API | Protocolo | Auth | Endpoints Principais |
|-----|-----------|------|---------------------|
| **EntregaFácil Backend** | REST + WebSocket | JWT (Better Auth) | `/api/v1/addresses`, `/routes`, `/deliveries`, `/sync`, `/reports`, `/health` |
| **OSRM** | HTTP (local VPS) | API Key (opcional) | `/trip/v1/driving/`, `/route/v1/driving/`, `/table/v1/driving/`, `/nearest/v1/driving/` |
| **GraphHopper** | HTTP (local VPS) | API Key | `/vrp/optimize`, `/route`, `/isochrone` |
| **Evolution API** | REST + WebSocket | API Key | `/instance/create`, `/instance/connect`, `/message/sendText`, `/message/sendMedia`, `/chat/fetchMessages` |
| **Nominatim / Google Places** | HTTP | API Key (Google) | `/search`, `/reverse`, `/autocomplete` |
| **MinIO (S3)** | HTTP (S3 API) | Access Key + Secret | `PUT /bucket/entregas/{id}.jpg`, `GET /bucket/entregas/{id}.jpg` |

### 5.4 Interfaces de Comunicação
- **Formato Dados:** JSON (REST), Protocol Buffers (opcional futuro), GeoJSON (rotas/polylines)
- **Criptografia:** TLS 1.3 (HTTPS/WSS), AES-256-GCM (arquivos locais)
- **Compressão:** GZIP/Brotli (API responses), WebP (fotos upload, quality 80%)
- **Sync Protocol:** Batch operations `{ operations: [{ id, type, entity, payload, timestamp }] }` com versionamento otimista

---

## 6. Regras de Negócio (RN)

| ID | Regra | Descrição | Origem | Validação |
|----|-------|-----------|--------|-----------|
| **RN-001** | Endereço único por rota | Não permitir duplicar mesmo endereço (lat/lng ± 10m) na mesma rota | UX | Check ao adicionar na checklist |
| **RN-002** | Geocoding rate limit | Máx 1 request/segundo Nominatim (política OSM); cache local 24h | OSM Policy | Middleware client-side |
| **RN-003** | Transições de status válidas | PENDENTE → EM_ROTA → ENTREGUE\|PROBLEMA\|CANCELADA. Não voltar. | Negócio | State machine enforcada (XState) |
| **RN-004** | Waypoints mínimos otimização | OSRM Trip requer ≥ 2 waypoints; máx 100 (limit config) | OSRM Spec | Validação UI + backend |
| **RN-005** | Instruções voz obrigatórias | Se voz desativada, visual deve ser extra claro (seta + distância grande) | Acessibilidade | Testes modo mudo |
| **RN-006** | Modo dirigindo auto-ativar | Após 5s navegação sem toque, entra modo kiosk. Sai ao tocar 3x rápido ou "Sair Modo Dirigindo" | Segurança | Timer + gesture detector |
| **RN-007** | Foto obrigatória para ENTREGUE | Não permitir confirmar entrega sem foto válida (blur check + GPS) | Compliance | Validação `react-native-vision-camera` / ML Kit |
| **RN-008** | Dados PII minimização | Não salvar CPF completo (apenas hash), fotos só se necessárias, localização só durante uso | LGPD | Code review + `kalimaster-sast` |
| **RN-009** | Problema não bloqueia rota | Status PROBLEMA conta como "finalizado" para avançar para próximo waypoint | Operação | State machine |
| **RN-010** | Sync idempotência | Mesmo `operation.id` processado 2x = no-op. Timestamp server wins. | Confiabilidade | Testes propriedade |
| **RN-011** | Evolution API instance única | Um motorista = uma instância Evolution. Não compartilhar. | Segurança | Backend valida `instance_name` unique per user |
| **RN-012** | WhatsApp opt-in destinatário | Só notificar se destinatário tem telefone + flag "notificar=sim" | LGPD/Meta Policy | Check antes envio |
| **RN-013** | Template WhatsApp pré-aprovado | Só templates aprovados Meta (Cloud API) ou Baileys (livre). Validar variáveis. | Meta Policy | Validação backend |
| **RN-014** | Tamanho template ≤ 1024 chars | Limite WhatsApp Business API | Meta Spec | Contador chars UI + validação backend |
| **RN-015** | MBTiles atualização mensal | Tiles OSM atualizados ~mensal. App notifica "Mapas desatualizados > 60 dias" | Dados | Check version MBTiles vs Geofabrik |
| **RN-016** | Conflict resolution: LWW + manual | Last-Write-Wins por timestamp; se mesmo campo editado offline em 2 devices → flag manual merge | Confiabilidade | Sync engine testes |
| **RN-017** | Exclusão conta = anonimização | LGPD Art. 18: excluir conta anonimiza dados (mantém métricas agregadas sem PII) | LGPD | Job backend `anonymize_user_data(user_id)` |

---

## 7. Matriz de Rastreabilidade

| RF/RNF/RN | User Story (US) | Critério Aceite (AC) | Teste Unitário | Teste Integração | Teste E2E |
|-----------|-----------------|----------------------|----------------|------------------|-----------|
| RF-001 | US-001 | AC-001 | TU-001 (addressService.create) | TI-001 (API /addresses) | TE-001 (Fluxo cadastro endereço) |
| RF-002 | US-001 | AC-002 | TU-002 (geocoding.search) | TI-002 (Nominatim mock) | TE-001 |
| RF-003 | US-002 | AC-003 | TU-003 (csvParser.parse) | TI-003 (Import flow) | TE-002 (Import CSV 25 linhas) |
| RF-006 | US-003 | AC-004 | TU-004 (routeService.create) | TI-004 (API /routes) | TE-003 (Criar rota + 12 endereços) |
| RF-007 | US-003 | AC-005 | TU-005 (reorder.reduce) | TI-005 (Drag-drop persist) | TE-003 |
| RF-008 | US-004 | AC-006 | TU-006 (statusMachine.transition) | TI-006 (Status flow) | TE-004 (Checklist status machine) |
| RF-010 | US-005 | AC-007 | TU-007 (osrmClient.trip) | TI-007 (OSRM VPS real) | TE-005 (Otimizar 15 waypoints <3s) |
| RF-013 | US-006 | AC-008 | TU-008 (navigation.start) | TI-008 (MapLibre Nav SDK) | TE-006 (Navegação turn-by-turn) |
| RF-016 | US-007 | AC-009 | TU-009 (camera.capture + validate) | TI-009 (Photo + GPS + hash) | TE-007 (Comprovação completa) |
| RF-020 | US-008 | AC-010 | TU-010 (evolutionClient.testConnection) | TI-010 (Evolution API real) | TE-008 (Setup WhatsApp + QR) |
| RF-021 | US-009 | AC-011 | TU-011 (whatsappService.sendDelivery) | TI-011 (Evolution send + WS events) | TE-009 (Entrega → WhatsApp auto) |
| RF-024 | US-010 | AC-012 | TU-012 (mapDownloader.download) | TI-012 (MBTiles load MapLibre) | TE-010 (Offline mapa SP 450MB) |
| RF-025 | US-011 | AC-013 | TU-013 (syncEngine.pushPull) | TI-013 (Sync batch + conflicts) | TE-011 (Offline 10 entregas + sync) |
| RF-028 | US-012 | AC-014 | TU-014 (reportGenerator.pdf) | TI-014 (Share Sheet) | TE-012 (Export PDF rota) |
| RNF-001 | US-013 | AC-015 | TU-015 (benchmark.osrmTrip) | TI-015 (Load test 100 req) | TE-013 (Performance CI) |
| RNF-010 | US-014 | AC-016 | TU-016 (a11yAudit) | TI-016 (TalkBack flow) | TE-014 (Acessibilidade cego) |
| RNF-013 | US-015 | AC-017 | TU-017 (offlineQueue) | TI-017 (Airplane mode) | TE-015 (Campo offline 2h) |
| RN-003 | US-016 | AC-018 | TU-018 (stateMachine) | TI-018 (Invalid transitions) | TE-016 (Status machine) |
| RN-007 | US-017 | AC-019 | TU-019 (photoValidator) | TI-019 (Blur + GPS check) | TE-017 (Foto obrigatória) |
| RN-012 | US-018 | AC-020 | TU-020 (whatsappOptIn) | TI-020 (No phone = no send) | TE-018 (LGPD opt-in) |

---

## 8. Riscos e Mitigações

| ID | Risco | Prob. | Impacto | Mitigação | Responsável | Status |
|----|-------|-------|---------|-----------|-------------|--------|
| RSK-001 | OSRM/GraphHopper VPS falha | Média | Alto | Health check + auto-restart Docker; fallback GraphHopper se OSRM down; cache rotas recentes local | DevOps | Planejado |
| RSK-002 | Evolution API banimento WhatsApp (Baileys) | Alta | Alto | Usar Cloud API oficial como primary; Baileys só fallback; monitorar connectionState; alerta se "disconnected" > 5min | Backend | Planejado |
| RSK-003 | MapLibre Navigation SDK instável (early) | Média | Médio | Fallback: navegação simples (polyline + instruções OSRM steps) v0.1; Navigation SDK v0.2 | Mobile | Mitigado |
| RSK-004 | Tiles MBTiles desatualizados | Baixa | Médio | Job mensal baixar Geofabrik + gerar MBTiles (Planetiler); notificar app se > 60 dias | DevOps | Planejado |
| RSK-005 | Sync conflict loss data | Baixa | Crítico | Idempotência + LWW + log auditoria completo; backup diário PostgreSQL + MinIO | Backend | Planejado |
| RSK-006 | LGPD não conformidade | Baixa | Crítico | Checklist LGPD em `docs/lgpd-checklist.md`; DPO nomeado; `kalimaster-sast` PII scan CI | Legal/Tech | Planejado |
| RSK-007 | Performance mapa device low-end | Média | Alto | Testes device farm (Samsung A10, Moto G Power); fallback Expo Maps (Google/Apple nativo) mais leve | Mobile | Planejado |
| RSK-008 | Google Maps API custos inesperados | Baixa | Médio | Não usar Google Maps API (primary MapLibre/OSM); Expo Maps só fallback visual dev | Tech Lead | Mitigado |
| RSK-009 | Battery drain navegação | Média | Médio | Otimizar GPS (passive quando parado), reduzir fps mapa 30fps navegação, dark mode OLED | Mobile | Planejado |
| RSK-010 | App store rejection (WhatsApp automation) | Média | Alto | Não automatizar envio sem ação usuário (template pré-aprovado, botão "Enviar" visível); documentar uso legítimo | Mobile/Legal | Planejado |

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Waypoint** | Ponto de parada (lat/lng) na rota — origem, destino ou intermediário |
| **Polyline** | Geometria codificada (Google Encoded Polyline) representando rota no mapa |
| **Trip (OSRM)** | Endpoint que resolve TSP guloso: ordem ótima de waypoints dados |
| **VRP (Vehicle Routing Problem)** | Generalização do TSP com restrições: capacidade, janelas tempo, múltiplos veículos |
| **jsprit** | Biblioteca Java para resolver VRP com restrições (usada pelo GraphHopper) |
| **MBTiles** | Especificação para armazenar tiles de mapa em SQLite (offline) |
| **Vector Tiles** | Tiles com dados vetoriais (pontos, linhas, polígonos) — renderizados client-side (MapLibre) |
| **Baileys** | Biblioteca TypeScript para WhatsApp Web API (não-oficial, usada pelo Evolution API) |
| **Cloud API** | WhatsApp Business API oficial da Meta (cloud-based, pago por conversa) |
| **Evolution Instance** | Conexão WhatsApp isolada na Evolution API (um número = uma instance) |
| **Sync Queue** | Fila local de operações (CRUD) pendentes de sincronização com servidor |
| **LWW (Last-Write-Wins)** | Estratégia de resolução de conflito: vence a operação com timestamp mais recente |
| **TalkBack / VoiceOver** | Leitores de tela Android/iOS (acessibilidade) |
| **Modo Luva** | UI com touch targets grandes (≥60dp) para uso com luvas de motoboy |
| **GeoJSON** | Formato JSON para dados geográficos (FeatureCollection, LineString, Point) |

---

## 10. Aprovações

| Role | Nome | Assinatura | Data |
|------|------|------------|------|
| Product Owner | | | |
| Tech Lead | | | |
| Dev Mobile | | | |
| Dev Backend | | |
| QA | | | |

---

**Fim do SRS v0.1**  
**Próximo:** FASE 4 — UML + Arquitetura (Diagramas Mermaid + ADRs)