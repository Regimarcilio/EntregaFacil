# Backlog Scrum — EntregaFácil

**Versão:** 0.1  
**Data:** 2026-11-17  
**Autor:** PLANMASTER  
**Branch:** develop  
**Base:** docs/templates/SCRUM_TEMPLATE.md, docs/SRS.md

---

## 1. Product Vision

> **Elevator Pitch:** "EntregaFácil é o copiloto do motoboy: organiza endereços, calcula a melhor rota, navega offline, comprova entrega com foto+assinatura e avisa o cliente no WhatsApp automaticamente — tudo num app que funciona até sem sinal."

---

## 2. Épicos

| Épico ID | Nome | Descrição | Prioridade | Sprint Alvo |
|----------|------|-----------|------------|-------------|
| **EPIC-001** | **Fundação & Setup** | Projeto Expo bare, CI/CD, auth, database, sync engine, design system | Must | Sprint 1 |
| **EPIC-002** | **Endereços & Geocoding** | CRUD endereços, autocomplete OSM/Google, import CSV/WhatsApp, geocoding reverso | Must | Sprint 1-2 |
| **EPIC-003** | **Rotas & Checklist** | Criar rota, checklist draggable, status machine, filtros/agrupamento | Must | Sprint 2 |
| **EPIC-004** | **Otimização de Rota** | OSRM Trip (TSP), GraphHopper VRP (fase 2), recálculo desvio, cache offline | Must | Sprint 3 |
| **EPIC-005** | **Navegação Turn-by-Turn** | MapLibre Navigation SDK (fase 2) / fallback polyline+steps, modo dirigindo, voz | Must | Sprint 3-4 |
| **EPIC-006** | **Comprovação de Entrega** | Câmera + validação (blur+GPS), assinatura canvas, observações/problemas, offline queue | Must | Sprint 4 |
| **EPIC-007** | **WhatsApp Integration** | Evolution API config, templates, envio auto, status callbacks, opt-in LGPD | Must | Sprint 4-5 |
| **EPIC-008** | **Mapas Offline** | MBTiles download (Planetiler/MinIO), MapLibre local style, atualização mensal | Must | Sprint 5 |
| **EPIC-009** | **Histórico & Relatórios** | Lista rotas, detalhe comprovações, export CSV/PDF, share sheet | Should | Sprint 5 |
| **EPIC-010** | **Perfil & Configurações** | Perfil motorista/veículo, preferências (tema, voz, luva), WhatsApp config, mapas offline | Should | Sprint 5 |
| **EPIC-011** | **Observabilidade & Qualidade** | Sentry, Grafana dashboards, testes E2E, acessibilidade, performance, LGPD audit | Should | Sprint 5-6 |

---

## 3. User Stories

### EPIC-001: Fundação & Setup

#### US-001: Inicializar Projeto Expo Bare + TypeScript
**Como** Dev Mobile  
**Quero** projeto Expo SDK 58 com TypeScript, ESLint, Prettier, Husky, estrutura feature-based  
**Para** começar desenvolvimento com padrões definidos  

**Critérios de Aceite:**
- [ ] `npx create-expo-app@latest --template blank-typescript` executado
- [ ] Estrutura `src/features/*`, `src/shared/*` criada
- [ ] ESLint (Airbnb + React Native), Prettier, Husky (pre-commit) configurados
- [ ] `yarn lint`, `yarn typecheck`, `yarn test` passam
- [ ] `eas.json` com profiles development/preview/production
- [ ] GitHub Actions CI: lint + typecheck + test unit

**DoR:** ✅ Stack definida (ADR-001), repositório Git criado  
**DoD:** ✅ Código em `develop`, CI verde, docs/onboarding-mobile.md

---

#### US-002: Configurar Backend API + Database + Auth
**Como** Dev Backend  
**Quero** API Hono/Node.js + PostgreSQL/PostGIS + Drizzle ORM + Better Auth + Docker Compose  
**Para** ter base de dados e autenticação pronta  

**Critérios de Aceite:**
- [ ] `docker-compose.yml` com postgres, redis, minio, api
- [ ] Drizzle schema: motoristas, veiculos, enderecos, rotas, entregas, whatsapp_logs, sync_queue
- [ ] Better Auth: email/senha + magic link, JWT 15min + refresh 30d, roles driver/admin
- [ ] Endpoints: `/health`, `/auth/*`, `/api/v1/*` (CRUD básico)
- [ ] Migrations `drizzle-kit` funcionando
- [ ] Testes integração: auth + CRUD motorista

**DoR:** ✅ ADR-006 aprovado, VPS acessível  
**DoD:** ✅ API deploy staging, health check passa, Swagger/OpenAPI gerado

---

#### US-003: Implementar Sync Engine (Optimistic + LWW + Background)
**Como** Dev Fullstack  
**Quero** queue local idempotente + background sync (WorkManager/BackgroundFetch) + conflict resolution LWW + manual flag  
**Para** app funcionar offline com sync confiável  

**Critérios de Aceite:**
- [ ] `syncQueue` table + local queue (SQLite/AsyncStorage) com `operation.id` UUID
- [ ] Optimistic UI: Zustand store atualiza即时, enqueue operation
- [ ] `POST /sync/batch` server: idempotência, LWW, serverChanges pull
- [ ] WorkManager (Android) + BackgroundFetch (iOS) 15min + NetInfo trigger
- [ ] Pull-to-refresh manual + toast sync status
- [ ] Testes propriedade: 1000 ciclos network flaky → 0 perda dados

**DoR:** ✅ ADR-007 aprovado, schema sync_queue definido  
**DoD:** ✅ E2E offline 10 entregas + sync passa, auditoria completa

---

#### US-004: Design System + Componentes Base
**Como** Dev Mobile  
**Quero** React Native Paper (Material You) + tokens custom (cores, spacing, tipografia) + componentes acessíveis  
**Para** UI consistente e acessível (WCAG 2.1 AA)  

**Critérios de Aceite:**
- [ ] `theme.ts` com cores light/dark, spacing 4dp grid, tipografia scale
- [ ] Componentes: `Button`, `Card`, `Input`, `Modal`, `Checkbox`, `Select`, `Toast`, `BottomSheet`
- [ ] `MapView` wrapper (MapLibre/Expo Maps), `ChecklistItem` draggable
- [ ] Acessibilidade: `accessibilityLabel`, `role`, `state`, `hint` em todos interativos
- [ ] Contraste ≥ 4.5:1, touch target ≥ 48dp (60dp modo luva)
- [ ] Storybook ou Expo dev client para visualização

**DoR:** ✅ Requisitos UI/UX definidos  
**DoD:** ✅ `axe-core` 0 violações AA, Storybook publicado

---

### EPIC-002: Endereços & Geocoding

#### US-005: CRUD Endereços com Autocomplete
**Como** Motorista  
**Quero** adicionar/editar/excluir endereços com busca autocomplete (Nominatim/Google Places) e confirmação no mapa  
**Para** montar minha lista de entregas rapidamente  

**Critérios de Aceite:**
- [ ] Tela "Novo Endereço": campos nome, busca autocomplete (debounce 300ms, ≥3 chars)
- [ ] Autocomplete usa Nominatim (grátis) ou Google Places (se API key)
- [ ] Seleção → pré-preenche formulário + mostra pin no mapa (MapLibre/Expo Maps)
- [ ] Ajuste pin manual → atualiza lat/lng
- [ ] Validação: CEP formato, coordenadas válidas, duplicata ±10m (RN-001)
- [ ] Lista "Meus Endereços": swipe actions editar/excluir, pull-to-refresh sync

**DoR:** ✅ RF-001, RF-002, RF-005, RN-001, RN-002  
**DoD:** ✅ Testes unitários geocoding, integração Nominatim mock, E2E cadastro 5 endereços

---

#### US-006: Importar Endereços via CSV
**Como** Motorista Autônomo  
**Quero** importar arquivo CSV com colunas (nome, endereço, lat, lng, cep, obs)  
**Para** não digitar 20+ endereços manualmente  

**Critérios de Aceite:**
- [ ] Botão "Importar CSV" na lista endereços → file picker
- [ ] Parse CSV (PapaParse) → validação linha a linha (geocoding se lat/lng ausente)
- [ ] Preview: linhas válidas (verde), erros (vermelho + motivo: "CEP inválido", "Geocoding falhou")
- [ ] Confirmação → cria endereços em batch local + enqueue sync
- [ ] Toast "X importados, Y erros" + opção baixar CSV erros

**DoR:** ✅ RF-003, US-005 pronto  
**DoD:** ✅ CSV 25 linhas → 25 endereços < 5s, erros reportados corretamente

---

#### US-007: Receber Endereços via WhatsApp Share
**Como** Motorista App  
**Quero** compartilhar mensagem WhatsApp com lista de endereços para o EntregaFácil  
**Para** não copiar/colar manualmente  

**Critérios de Aceite:**
- [ ] Share Extension (iOS) / Intent Filter (Android) registrado para `text/plain`
- [ ] Parser: extrai endereços de texto livre (regex + NLP simples)
- [ ] Tela confirmação: lista endereços extraídos → geocoding → aprovar/rejeitar cada
- [ ] Aprovação → adiciona à lista endereços

**DoR:** ✅ RF-004, US-005 pronto  
**DoD:** ✅ Texto "1) Rua A, 100\n2) Av B, 200" → 2 endereços geocodados

---

### EPIC-003: Rotas & Checklist

#### US-008: Criar Rota do Dia (Checklist)
**Como** Motorista  
**Quero** selecionar múltiplos endereços e criar uma "Rota do Dia" com nome, data, veículo  
**Para** organizar minhas entregas antes de sair  

**Critérios de Aceite:**
- [ ] Tela "Nova Rota": multi-select endereços (checkbox), campo nome, data (default hoje), veículo
- [ ] Mínimo 2 endereços, máximo 50 (config)
- [ ] Rota criada com status "Rascunho", contador "X endereços, 0 otimizados"
- [ ] Lista "Minhas Rotas": cards com nome, data, status, contador, ação "Continuar"/"Otimizar"

**DoR:** ✅ RF-006, US-005 pronto  
**DoD:** ✅ Cria rota 12 endereços → aparece na lista com status correto

---

#### US-009: Reordenar Checklist (Drag & Drop)
**Como** Motorista  
**Quero** arrastar endereços na checklist para definir ordem manual antes de otimizar  
**Para** priorizar entregas urgentes  

**Critérios de Aceite:**
- [ ] `DraggableFlatList` ou `FlashList` + `react-native-gesture-handler`
- [ ] Drag handle visível (≡), feedback visual (elevação, opacidade)
- [ ] Drop → reordena array local imediatamente
- [ ] Botão "Salvar Ordem" → persiste + badge "Ordem Manual" na rota
- [ ] Acessibilidade: `accessibilityRole="button"`, `aria-grabbed`, keyboard support

**DoR:** ✅ RF-007, US-008 pronto  
**DoD:** ✅ Drag 5→1 posição → ordem salva + badge aparece

---

#### US-010: Status Machine Checklist (Pendente → Em Rota → Entregue/Problema)
**Como** Motorista  
**Quero** ver status visual de cada entrega e avançar automaticamente para próxima  
**Para** não me perder na sequência  

**Critérios de Aceite:**
- [ ] Estados: `PENDENTE` (cinza) → `EM_ROTA` (azul, highlight) → `ENTREGUE` (verde, check) | `PROBLEMA` (laranja, ⚠) | `CANCELADA` (vermelho, ✕)
- [ ] Transições enforcadas (XState): não voltar, pular só via "Pular" (→ CANCELADA)
- [ ] Ao confirmar ENTREGUE/PROBLEMA: próximo waypoint → EM_ROTA automaticamente
- [ ] Filtros: Todos, Pendentes, Entregues, Problemas (RF-009)
- [ ] Agrupamento: Por Bairro, Prioridade, Janela Tempo (colapsável)

**DoR:** ✅ RF-008, RF-009, RN-003, RN-009, US-008 pronto  
**DoD:** ✅ Fluxo 5 waypoints: inicia → 3 entregues → 1 problema → 1 cancelada → finaliza

---

### EPIC-004: Otimização de Rota

#### US-011: Calcular Rota Otimizada (OSRM Trip)
**Como** Motorista  
**Quero** tocar "Otimizar Rota" e ver a melhor ordem calculada em < 3s  
**Para** economizar tempo e combustível  

**Critérios de Aceite:**
- [ ] Botão "Otimizar Rota" habilitado só se status "Rascunho" ou "Ordem Manual" + ≥2 waypoints
- [ ] Request OSRM `/trip/v1/driving/{waypoints}?steps=true&source=first&destination=last&roundtrip=false`
- [ ] Loading state com spinner + "Calculando melhor rota..."
- [ ] Resposta < 3s (p95): waypoints reordenados, geometry polyline, legs[duration,distance]
- [ ] Checklist reordenada conforme `waypoint_index` retornado
- [ ] Mapa exibe rota completa (polyline colorida) + waypoints numerados
- [ ] Resumo: "Distância: 42.3 km | Tempo: 1h15m | Economia vs manual: ~18%"
- [ ] Status rota → "Otimizada", enqueue sync

**DoR:** ✅ RF-010, RN-004, ADR-003, OSRM VPS rodando  
**DoD:** ✅ 15 waypoints SP → otimizado < 3s, ordem correta, mapa renderiza

---

#### US-012: Recalcular Rota em Desvio (Auto)
**Como** Motorista  
**Quero** que o app recalcule automaticamente se eu sair da rota  
**Para** não precisar mexer no celular dirigindo  

**Critérios de Aceite:**
- [ ] GPS monitora desvio: > 200m da polyline por > 30s consecutivos
- [ ] Toast não-bloqueante "Recalculando rota..."
- [ ] Request OSRM `/route/v1/driving/{current_location};{next_waypoints...}`
- [ ] Atualiza polyline no mapa + instruções navegação
- [ ] Waypoints já entregues mantidos como ENTREGUE
- [ ] Log: `recalculation_count` na rota para métricas

**DoR:** ✅ RF-012, US-011 pronto, navegação ativa  
**DoD:** ✅ Simula desvio GPS → recalcula < 2s, navegação continua

---

### EPIC-005: Navegação Turn-by-Turn

#### US-013: Navegação Simples (Polyline + Steps + Voz) — MVP
**Como** Motorista  
**Quero** seguir a rota com instruções visuais (seta + distância + rua) e voz  
**Para** chegar no destino sem olhar o mapa constantemente  

**Critérios de Aceite:**
- [ ] Ao tocar "Navegar" (waypoint EM_ROTA): inicia navegação
- [ ] MapLibre: adiciona `route-layer` (LineString) + `waypoints-layer` (SymbolLayer)
- [ ] Instruções: OSRM `steps[]` → lista + voz (expo-speech / react-native-tts PT-BR)
- [ ] Próxima manobra: card fixo topo "Em 300m, vire à direita na Rua Augusta"
- [ ] Anúncios voz: 500m, 100m, na manobra (RN-005)
- [ ] Botão "Cheguei" grande (60dp) → abre comprovação (US-016)
- [ ] Modo dirigindo auto-após 5s inatividade (RN-006)

**DoR:** ✅ RF-013, RF-014, RF-015, US-011 pronto, MapLibre integrado  
**DoD:** ✅ Navega 5km rota real → instruções corretas, voz funciona, modo dirigindo ativa

---

#### US-014: MapLibre Navigation SDK (Turn-by-Turn Nativo) — Fase 2
**Como** Motorista  
**Quero** navegação nativa com recálculo automático, lanes, speed limits, voz nativa  
**Para** experiência profissional igual Google Maps/Waze  

**Critérios de Aceite:**
- [ ] `@maplibre/maplibre-navigation-react-native` instalado (Bare workflow)
- [ ] `NavigationViewController` (iOS) / `NavigationService` (Android) integrado
- [ ] Recálculo off-route automático (SDK)
- [ ] Instruções voz nativas (TTS OS), lane guidance, speed limits
- [ ] Fallback gracioso se SDK falhar → US-013

**DoR:** ✅ ADR-002, US-013 validado, Bare workflow configurado  
**DoD:** ✅ Navegação 30min device real → recálculo, voz nativa, lanes

---

### EPIC-006: Comprovação de Entrega

#### US-015: Capturar Foto Obrigatória + Validação
**Como** Motorista  
**Quero** tirar foto da entrega com validação automática (não borrada, GPS ok)  
**Para** ter comprovação válida sem retrabalho  

**Critérios de Aceite:**
- [ ] Botão "Cheguei" → abre câmera fullscreen (expo-camera), botão capturar grande, toggle lanterna
- [ ] Validação automática: Laplacian variance > 100 (não borrada), GPS accuracy < 50m
- [ ] Preview: miniatura + coordenadas + timestamp + endereço reverso (geocoding)
- [ ] Botão "Confirmar Entrega" habilitado SÓ se foto válida (RN-007)
- [ ] Metadados salvos: EXIF GPS, timestamp, SHA-256 hash, device ID

**DoR:** ✅ RF-016, RN-007, RN-008, câmera permission  
**DoD:** ✅ Foto borrada → rejeitada; foto ok + GPS → confirmar habilitado

---

#### US-016: Assinatura Digital + Observações/Problemas
**Como** Motorista  
**Quero** coletar assinatura do destinatário e registrar problemas (cliente ausente, endereço errado)  
**Para** comprovação completa e comunicação clara  

**Critérios de Aceite:**
- [ ] Botão "Adicionar Assinatura" (opcional) → canvas fullscreen (react-native-signature-capture)
- [ ] Canvas: "Assine aqui", botões Limpar/Cancelar/Salvar → PNG 400x200 base64
- [ ] Seletor problema: "Cliente ausente", "Endereço errado", "Recusou", "Outro" + texto livre 500 chars
- [ ] Status waypoint: ENTREGUE (se ok) ou PROBLEMA (se selecionado) — RN-009
- [ ] Observação incluída no WhatsApp template (se configurado)

**DoR:** ✅ RF-017, RF-018, RN-009, US-015 pronto  
**DoD:** ✅ Entrega com assinatura + "Cliente ausente" → status PROBLEMA, WhatsApp inclui obs

---

#### US-017: Comprovação Offline (Queue Local + Sync)
**Como** Motorista  
**Quero** completar entregas sem internet e sincronizar quando conectar  
**Para** trabalhar em áreas sem sinal  

**Critérios de Aceite:**
- [ ] Modo avião: foto + assinatura + obs → "Salvo offline — sincronizará quando conectar"
- [ ] Dados persistem: SQLite (metadados) + FileSystem (fotos/assinaturas) + sync queue
- [ ] Reconexão: WorkManager/BackgroundFetch detecta online → flush queue batch 10
- [ ] Toast "X entregas sincronizadas" ao concluir
- [ ] Zero perda: reiniciar app offline → dados intactos

**DoR:** ✅ RF-019, RF-025, ADR-007, US-015/016 prontos  
**DoD:** ✅ Teste campo: modo avião 10 entregas → online → sync 100% sucesso

---

### EPIC-007: WhatsApp Integration

#### US-018: Configurar Evolution API (QR Code / Cloud API)
**Como** Motorista  
**Quero** configurar minha instância WhatsApp no app (URL, API Key, QR Code pairing)  
**Para** habilitar notificações automáticas  

**Critérios de Aceite:**
- [ ] Tela Config > WhatsApp: campos URL, API Key, Instance Name
- [ ] Botão "Testar Conexão" → GET `/instance/connectionState/{instance}`
- [ ] Se Baileys desconectado: exibe QR Code (image) + instruções "Escaneie no WhatsApp Web"
- [ ] Se Cloud API: campos Business Account ID, Phone Number ID, Token
- [ ] Status visual: 🟢 Conectado / 🟡 Pareando / 🔴 Desconectado
- [ ] Toggle "Remetente: Meu número / Número do cliente" (fromMe true/false)

**DoR:** ✅ RF-020, ADR-004, Evolution API VPS rodando  
**DoD:** ✅ QR Code scan → conectado → status 🟢, Cloud API configurado → teste envio ok

---

#### US-019: Envio Automático WhatsApp Entrega Confirmada
**Como** Sistema  
**Quero** enviar template WhatsApp automaticamente ao confirmar entrega  
**Para** cliente saber na hora sem motorista digitar  

**Critérios de Aceite:**
- [ ] Trigger: entrega confirmada (US-015/016) + destinatário tem telefone + `notificar !== 'nunca'`
- [ ] Template `entrega_confirmada`: variáveis `{{pedido}}`, `{{endereco}}`, `{{hora}}`, `{{foto_url}}`, `{{assinatura_url}}`
- [ ] POST `/message/sendText` Evolution API com `instance`, `number`, `text`, `options.delay=1000`
- [ ] WebSocket `messages.upsert` → atualiza log local: `enviado` → `entregue` → `lido`
- [ ] Log `whatsapp_logs`: messageId, destinatário, telefone, template, status, timestamps
- [ ] Fallback: se erro → status "erro", botão "Reenviar" no detalhe rota (US-027)

**DoR:** ✅ RF-021, RF-022, RF-023, RN-012, RN-013, RN-014, US-018 pronto  
**DoD:** ✅ Entrega → WhatsApp entregue/lido < 10s, log completo no detalhe

---

#### US-020: Gerenciar Templates WhatsApp
**Como** Motorista  
**Quero** editar templates de mensagem com placeholders e preview  
**Para** personalizar comunicação  

**Critérios de Aceite:**
- [ ] Tela Config > WhatsApp > Templates: lista templates (entrega_confirmada, entrega_problema)
- [ ] Editor: textarea + chips placeholders (`{{pedido}}`, `{{endereco}}`, etc.)
- [ ] Validação: ≤ 1024 chars (RN-014), placeholders válidos, preview com dados mock
- [ ] Salvar → sync local + server
- [ ] Cloud API: aviso "Templates precisam aprovação Meta" + link Business Manager

**DoR:** ✅ RF-022, US-018 pronto  
**DoD:** ✅ Edita template → preview ok → salva → uso no envio real

---

### EPIC-008: Mapas Offline

#### US-021: Baixar Mapas Offline (MBTiles por Região)
**Como** Motorista  
**Quero** baixar mapa do meu estado/região (WiFi) para usar offline  
**Para** navegar sem sinal  

**Critérios de Aceite:**
- [ ] Tela Config > Mapas Offline: lista regiões (BR, SP, RJ, MG, etc.) com tamanho (MB)
- [ ] Botão "Baixar" → progresso real (bytes/total), pause/resume, cancel
- [ ] Download só WiFi (config `syncApenasWifi`), resume se interrompido
- [ ] Concluído: MapLibre recarrega style.json local + source `file://tiles/SP.mbtiles`
- [ ] Armazenamento mostra "Mapas: 450 MB", botão "Remover"
- [ ] Notificação se mapa > 60 dias desatualizado (RN-015)

**DoR:** ✅ RF-024, ADR-005, MinIO com tiles versionados, Planetiler pipeline  
**DoD:** ✅ Baixa SP 450MB WiFi → mapa offline 60fps, navegação funciona modo avião

---

### EPIC-009: Histórico & Relatórios

#### US-022: Listar Histórico de Rotas
**Como** Motorista  
**Quero** ver minhas rotas finalizadas com resumo (km, tempo, ganhos)  
**Para** acompanhar performance e ganhos  

**Critérios de Aceite:**
- [ ] Tela "Histórico": cards "Rota Centro - 17/11 | ✅ 12/12 | 42.3 km | 1h15m | R$ 185,00"
- [ ] Filtros: Última semana, Este mês, Com problemas, Status
- [ ] Pull-to-refresh → sync + atualiza lista
- [ ] Empty state: "Nenhuma rota finalizada" + CTA "Criar primeira rota"

**DoR:** ✅ RF-026, US-010 pronto (rota finalizada)  
**DoD:** ✅ 20 rotas → lista carrega < 1s, filtros funcionam

---

#### US-023: Detalhe Rota + Comprovações
**Como** Motorista  
**Quero** ver cada entrega da rota com foto, assinatura, observação, status WhatsApp  
**Para** auditar e resolver disputas  

**Critérios de Aceite:**
- [ ] Toca rota no histórico → lista waypoints: 10 ✅, 1 ⚠️, 1 ❌
- [ ] Toca waypoint → modal: foto fullscreen (zoom), assinatura, observação, mapa localização, log WhatsApp
- [ ] Log WhatsApp: status (enviado/entregue/lido/erro), timestamps, botão "Reenviar" se erro
- [ ] Botão "Copiar link foto/assinatura" (presigned URL MinIO 24h)

**DoR:** ✅ RF-027, US-015/016/019 prontos  
**DoD:** ✅ Detalhe mostra tudo, reenvio WhatsApp funciona

---

#### US-024: Exportar Relatório PDF/CSV
**Como** Motorista  
**Quero** exportar rota ou período em PDF profissional ou CSV  
**Para** enviar pro restaurante/contador  

**Critérios de Aceite:**
- [ ] Detalhe rota → "Exportar" → "PDF Completo" / "CSV" / "PDF Resumo"
- [ ] PDF: cabeçalho (logo, motorista, rota), resumo (km, tempo, ganhos), tabela endereços, grid fotos 3x3, rodapé hash validação
- [ ] CSV: colunas padrão (data, endereço, status, hora, km, ganho, foto_url, assinatura_url, whatsapp_status)
- [ ] Share Sheet nativo → WhatsApp, Email, Drive, Arquivos
- [ ] Geração background (não bloqueia UI), toast "PDF gerado"

**DoR:** ✅ RF-028, US-022/023 prontos, expo-print/react-native-pdf  
**DoD:** ✅ PDF 12 entregas + fotos → 2MB, abre correto no WhatsApp/Drive

---

### EPIC-010: Perfil & Configurações

#### US-025: Perfil Motorista + Veículo
**Como** Motorista  
**Quero** cadastrar meus dados (nome, CPF, foto, veículo placa/modelo)  
**Para** identificar nas entregas e relatórios  

**Critérios de Aceite:**
- [ ] Tela Perfil: nome, foto (câmera/galeria), CPF (mascarado input, validação algoritmo), telefone, email
- [ ] Veículo: placa (formato BR AAA-0000 ou AAA0A00), modelo, cor, ano, tipo (moto/carro/bike), CRLV foto
- [ ] Validações: CPF algoritmo, placa regex, email formato
- [ ] Salvamento local + sync + toast "Perfil atualizado"

**DoR:** ✅ RF-029, RN-017 (LGPD)  
**DoD:** ✅ Perfil completo → sync → aparece no relatório PDF

---

#### US-026: Preferências App (Tema, Voz, Luva, Sync, Notificações)
**Como** Motorista  
**Quero** personalizar o app pro meu jeito de trabalhar  
**Para** melhor experiência  

**Critérios de Aceite:**
- [ ] Tema: Claro / Escuro / Sistema (react-native-appearance + Context)
- [ ] Unidades: km/h / mph
- [ ] Voz navegação: Ativada/Desativada + Volume (slider)
- [ ] Modo luva: On/Off (touch targets 60dp, fonte 18sp+)
- [ ] Auto-iniciar navegação: On/Off
- [ ] Sync apenas WiFi: On/Off
- [ ] Notificações push: On/Off (expo-notifications)
- [ ] Persistência imediata + aplica sem restart

**DoR:** ✅ RF-030, RN-005, RN-006, RN-010, US-013/015 prontos  
**DoD:** ✅ Alterna tema → aplica instantâneo; modo luva → botões 60dp

---

### EPIC-011: Observabilidade & Qualidade

#### US-027: Sentry + Grafana Dashboards Operacionais
**Como** Tech Lead  
**Quero** monitorar erros, performance, sync, WhatsApp, rotas em produção  
**Para** detectar e resolver incidentes rápido  

**Critérios de Aceite:**
- [ ] Sentry DSN configurado (mobile + backend), source maps upload CI
- [ ] Grafana: Dashboards "Mobile Health" (crash-free, ANR, startup), "Sync" (queue size, latency, conflicts), "WhatsApp" (throughput, failure rate, latency), "Routing" (OSRM/GraphHopper latency, errors)
- [ ] Alertas: Crash-free < 99.5%, Sync failure rate > 5%, WhatsApp failure > 10%, OSRM down
- [ ] Logs estruturados (JSON) + correlation IDs (requestId, userId, routeId)

**DoR:** ✅ ADR-008, VPS Grafana Stack rodando  
**DoD:** ✅ Erro forçado → Sentry alerta < 1min; OSRM down → alerta PagerDuty

---

#### US-028: Testes E2E (Detox) + Acessibilidade (axe-core) + Performance
**Como** QA  
**Quero** suíte testes automatizados cobrindo fluxos críticos  
**Para** prevenir regressões  

**Critérios de Aceite:**
- [ ] Detox (iOS/Android): fluxos "Criar rota → Otimizar → Navegar → Entregar → WhatsApp → Sync"
- [ ] `axe-core` CI: 0 violações AA em todas telas
- [ ] Performance: `react-native-performance` CI benchmarks (startup < 3s, mapa 60fps, navegação battery < 15%/h)
- [ ] Device Farm (Firebase Test Lab): 5 devices (low/mid/high) Android + iOS
- [ ] Coverage: Unit > 80%, Integration > 70%, E2E critical paths 100%

**DoR:** ✅ US-001/004/011/015/018/022 prontos  
**DoD:** ✅ CI verde, Detox passa device farm, axe-core 0 AA, performance dentro target

---

#### US-029: Auditoria LGPD + Kalimaster SAST
**Como** Legal/Tech  
**Quero** garantir conformidade LGPD e zero segredos/vulnerabilidades no código  
**Para** evitar multas e vazamentos  

**Critérios de Aceite:**
- [ ] `kalimaster-sast` CI: 0 segredos (API keys, tokens), 0 vuln críticas/altas dependências
- [ ] Checklist LGPD `docs/lgpd-checklist.md`: consentimento, exclusão, portabilidade, minimização, DPO
- [ ] Onboarding: termo consentimento claro, opção "Não concordo" (encerra app)
- [ ] Config > Privacidade: "Exportar meus dados" (JSON completo), "Excluir conta" (anonimização RN-017)
- [ ] Retenção logs: 90 dias → anonimização automática job cron

**DoR:** ✅ RN-008, RN-017, LGPD lei  
**DoD:** ✅ `kalimaster-sast` limpo, checklist LGPD 100%, exportação/exclusão funcionam

---

## 4. Sprint Planning

### Sprint 1 (Semanas 1-2) — **Fundação**
**Objetivo:** Projeto rodando, CI/CD, Auth, Database, Sync Engine, Design System  
**Capacidade:** ~40 SP (2 devs × 2 semanas × 10 SP/semana)  

| Story | SP | Responsável |
|-------|----|-------------|
| US-001: Projeto Expo Bare + TS + CI | 8 | Dev Mobile |
| US-002: Backend API + DB + Auth | 13 | Dev Backend |
| US-003: Sync Engine (Offline + LWW) | 13 | Dev Fullstack |
| US-004: Design System + Componentes | 8 | Dev Mobile |
| **Total** | **42** | |

**Riscos Sprint 1:**
- Bare workflow complexidade → Mitigação: Pair programming first week
- Sync engine edge cases → Mitigação: Property-based tests desde dia 1

---

### Sprint 2 (Semanas 3-4) — **Endereços & Rotas Core**
**Objetivo:** CRUD endereços, import CSV/WhatsApp, criar rota, checklist draggable, status machine  
**Capacidade:** ~40 SP  

| Story | SP | Responsável |
|-------|----|-------------|
| US-005: CRUD Endereços + Autocomplete | 8 | Dev Mobile |
| US-006: Import CSV | 5 | Dev Mobile |
| US-007: WhatsApp Share Receive | 5 | Dev Mobile |
| US-008: Criar Rota do Dia | 5 | Dev Mobile |
| US-009: Checklist Drag & Drop | 8 | Dev Mobile |
| US-010: Status Machine Checklist | 8 | Dev Mobile |
| **Total** | **39** | |

**Riscos Sprint 2:**
- Drag & drop performance lista 50 itens → FlashList + virtualização
- Geocoding rate limit Nominatim → Cache local 24h + debounce

---

### Sprint 3 (Semanas 5-6) — **Roteirização & Navegação**
**Objetivo:** OSRM Trip otimização, recálculo desvio, navegação simples (polyline+steps+voz)  
**Capacidade:** ~40 SP  

| Story | SP | Responsável |
|-------|----|-------------|
| US-011: OSRM Trip Otimização | 13 | Dev Backend + Mobile |
| US-012: Recalcular Desvio Auto | 8 | Dev Mobile |
| US-013: Navegação Simples (Polyline + Voz) | 13 | Dev Mobile |
| **Total** | **34** | |

**Riscos Sprint 3:**
- OSRM VPS latência → Health check + fallback GraphHopper
- Navegação voz expo-speech iOS/Android diferenças → Testar ambos

---

### Sprint 4 (Semanas 7-8) — **Comprovação & WhatsApp**
**Objetivo:** Foto+validação, assinatura, problemas, offline queue, Evolution API config, envio auto  
**Capacidade:** ~40 SP  

| Story | SP | Responsável |
|-------|----|-------------|
| US-015: Foto Obrigatória + Validação | 8 | Dev Mobile |
| US-016: Assinatura + Problemas | 8 | Dev Mobile |
| US-017: Comprovação Offline + Sync | 8 | Dev Fullstack |
| US-018: Evolution API Config + QR | 8 | Dev Backend + Mobile |
| US-019: WhatsApp Auto Entrega | 8 | Dev Backend + Mobile |
| **Total** | **40** | |

**Riscos Sprint 4:**
- Baileys banimento → Cloud API primary desde início
- Foto validação ML Kit performance → Testar device low-end

---

### Sprint 5 (Semanas 9-10) — **Mapas Offline, Histórico, Perfil, Polish**
**Objetivo:** MBTiles download, histórico/relatórios, perfil/config, observabilidade, testes  
**Capacidade:** ~40 SP  

| Story | SP | Responsável |
|-------|----|-------------|
| US-020: Templates WhatsApp | 5 | Dev Mobile |
| US-021: Mapas Offline MBTiles | 13 | Dev Mobile + DevOps |
| US-022: Histórico Rotas | 5 | Dev Mobile |
| US-023: Detalhe Rota + Comprovações | 5 | Dev Mobile |
| US-024: Export PDF/CSV | 8 | Dev Mobile |
| US-025: Perfil Motorista + Veículo | 5 | Dev Mobile |
| US-026: Preferências App | 5 | Dev Mobile |
| **Total** | **46** | |

**Riscos Sprint 5:**
- MBTiles download grande → Resume support crítico, WiFi only
- PDF geração memory → Background thread, chunked

---

### Sprint 6 (Semanas 11-12) — **Hardening & Release** (Buffer)
**Objetivo:** Testes E2E, acessibilidade, performance, LGPD, SAST, bug bash, release candidate  
**Capacidade:** ~30 SP  

| Story | SP | Responsável |
|-------|----|-------------|
| US-027: Sentry + Grafana Dashboards | 8 | DevOps |
| US-028: Detox E2E + Axe-core + Performance | 13 | QA + Dev |
| US-029: LGPD Audit + Kalimaster SAST | 8 | Legal + Tech |
| Bug Bash + Polish | 8 | All |
| **Total** | **37** | |

---

## 5. Roadmap

| Release | Data Alvo | Épicos/Features Principais | Marco |
|---------|-----------|---------------------------|-------|
| **v0.1 (MVP)** | 2027-01-30 (10 semanas) | EPIC-001 a 010 core (sem US-014, US-027-029 completos) | Beta fechado 5 motoristas |
| **v0.2** | 2027-03-15 | US-014 (Navigation SDK), US-027-029, Dashboard Web Gestor (novo épico), Multi-veículo VRP | Beta aberto 50 motoristas |
| **v1.0 (GA)** | 2027-06-01 | Integração iFood/Uber (API parceiro), Gamificação, IA previsão demanda, Multi-idioma | Launch Play Store/App Store |

---

## 6. Riscos de Sprint

| Sprint | Risco | Prob. | Impacto | Mitigação |
|--------|-------|-------|---------|-----------|
| 1 | Bare workflow setup falha | Média | Alto | Spike 2 dias antes sprint; pair programming |
| 2 | Nominatim rate limit / qualidade | Alta | Médio | Cache 24h + Google Places fallback (se key) |
| 3 | OSRM VPS instável | Baixa | Alto | Health check + auto-restart + GraphHopper fallback |
| 4 | Baileys banimento WhatsApp | Alta | Crítico | Cloud API primary; monitoramento connectionState |
| 5 | MBTiles download falha (espaço/rede) | Média | Alto | Verificação espaço prévio, resume, WiFi only |
| 6 | App Store rejection (WhatsApp automation) | Média | Alto | Template aprovado Meta, botão "Enviar" visível, docs uso legítimo |

---

## 7. Métricas

| Métrica | Target | Ferramenta |
|---------|--------|------------|
| **Velocity** | 35-45 SP/sprint | GitHub Projects |
| **Bug Escape Rate** | < 5% | GitHub Issues (bug label) |
| **Lead Time** | < 3 dias | GitHub Actions (PR merged → deploy) |
| **Deploy Frequency** | 2/semana (staging) | GitHub Actions |
| **Crash-Free Sessions** | > 99.5% | Sentry / Play Console |
| **Sync Success Rate** | > 99.9% | Grafana (sync dashboard) |
| **WhatsApp Delivery Rate** | > 98% | Evolution API + Grafana |
| **Acessibilidade** | 0 violações AA | axe-core CI |
| **Performance Startup** | < 3s (p95) | Sentry Mobile Vitals |
| **Cobertura Testes** | Unit > 80%, Int > 70% | Codecov |

---

## 8. DoR / DoD Globais

### Definition of Ready (Global)
- [ ] Requisito claro e testável (RF + AC Gherkin no SRS)
- [ ] Dependências identificadas e resolvidas (ADRs, APIs, infra)
- [ ] UI/UX definido (Figma/Expo Snack) se tela nova
- [ ] Estimado pelo time (Planning Poker)
- [ ] Disponível no backlog priorizado (GitHub Projects)

### Definition of Done (Global)
- [ ] Código em `develop` (PR aprovado por 1+ dev)
- [ ] Testes passando: unit + integration + e2e crítico
- [ ] Cobertura unit > 80%
- [ ] `kalimaster-sast` limpo (0 segredos, 0 vuln crit/alta)
- [ ] Documentação atualizada: ADR (se decisão), README, CHANGELOG
- [ ] Deploy staging validado (health check + smoke test)
- [ ] Acessibilidade: `axe-core` 0 violações AA
- [ ] Performance dentro do target (SRS RNF)
- [ ] LGPD: consentimento, minimização, retenção ok

---

## 9. Próximos Passos (FASE 6)

Com backlog aprovado, a **FASE 6** gerará `docs/06-plano-de-entrega.md` com:
- Estrutura de pastas detalhada (`src/features/*`, `backend/*`, `infra/*`)
- Comandos setup por stack (Node, Expo, Docker, EAS)
- Estratégia branches: `develop` → `feature/*` → PR → `develop` → `release/*` → `main`
- Convenções commit (Conventional Commits pt-BR)
- CI mínimo (GitHub Actions matrix: lint, typecheck, test, build, validate-srs)
- Checklist anti-retrabalho final (SRS completo? ADRs? Backlog estimado? Riscos mapeados?)
- Handoff para squad: Product Owner, Tech Lead, Dev Mobile, Dev Backend, QA, DevOps

---

**Fim do Backlog v0.1**  
**Próximo:** FASE 6 — Plano de Entrega + Handoff