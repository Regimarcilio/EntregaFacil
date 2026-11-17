# Checklist LGPD — EntregaFácil

**Versão:** 0.1  
**Data:** 2026-11-17  
**Base:** Lei 13.709/2018 (LGPD), ANPD Guia Orientativo  
**Responsável DPO:** [Nome do DPO]  
**Contato:** dpo@entregafacil.app

---

## 1. Princípios (Art. 6º LGPD)

| Princípio | Implementação | Status | Evidência |
|-----------|---------------|--------|-----------|
| **Finalidade** | Dados coletados só para: roteirização, comprovação entrega, notificação WhatsApp, relatórios motorista | ✅ | SRS RF-001 a RF-030 |
| **Adequação** | Coleta compatível com finalidades informadas (endereços, fotos, localização, telefone) | ✅ | Onboarding consentimento |
| **Necessidade** | Mínimo necessário: não coleta CPF completo (hash), não coleta dados sensíveis desnecessários | ✅ | RN-008, schema DB |
| **Livre Acesso** | Motorista acessa todos seus dados via app (perfil, rotas, entregas, logs WhatsApp) | ✅ | US-022, US-023, US-024 |
| **Qualidade** | Validação entrada (geocoding, CPF, placa), atualização via sync | ✅ | RF-002, RF-029 |
| **Transparência** | Termo consentimento claro, política privacidade acessível, logs auditáveis | ✅ | Onboarding, Config > Privacidade |
| **Segurança** | TLS 1.3, criptografia repouso (SQLCipher/AES-256), JWT rotativo, SAST CI | ✅ | RNF-006, RNF-007, RNF-008 |
| **Prevenção** | `kalimaster-sast` CI, threat modeling, LGPD by design | ✅ | Pipeline CI/CD |
| **Não Discriminação** | Não usa dados para discriminação, apenas otimização operacional | ✅ | Finalidade restrita |
| **Responsabilização** | DPO nomeado, registros processamento, DPIA para features de risco | 🔄 | DPO nomeado, DPIA pendente |

---

## 2. Base Legal (Art. 7º LGPD)

| Finalidade | Base Legal | Artigo | Implementação |
|------------|------------|--------|---------------|
| Cadastro motorista/veículo | **Contrato** (prestação serviço) | Art. 7º, V | RF-029, termo uso |
| Geolocalização (navegação) | **Legítimo Interesse** (otimização rota, segurança) | Art. 7º, IX | RF-013, RF-014, consentimento granular |
| Foto/assinatura comprovação | **Contrato** (comprovação entrega) + **Obrigação Legal** (Lei 12.009/2009) | Art. 7º, V / II | RF-016, RF-017 |
| Notificação WhatsApp | **Consentimento** (opt-in destinatário) | Art. 7º, I | RF-021, RN-012, Config endereço |
| Analytics/relatórios motorista | **Legítimo Interesse** (gestão própria performance) | Art. 7º, IX | US-022, US-024, anonimizado |
| Logs segurança/auditoria | **Obrigação Legal** (segurança, Art. 46 LGPD) | Art. 7º, II | RNF-008, RNF-017 |

---

## 3. Direitos do Titular (Art. 18 LGPD)

| Direito | Implementação | Endpoint/UI | Status |
|---------|---------------|-------------|--------|
| **Confirmação/ Acesso** | Tela "Meus Dados" + Export JSON completo | Config > Privacidade > Exportar | ✅ US-024 |
| **Correção** | Editar perfil, endereços, veículo nas telas respectivas | Perfil, Endereços, Config | ✅ RF-005, RF-029 |
| **Anonimização/Bloqueio/Eliminação** | "Excluir Conta" → anonimiza (mantém métricas agregadas sem PII) | Config > Privacidade > Excluir Conta | ✅ RN-017 |
| **Portabilidade** | Export JSON estruturado (motorista, rotas, entregas, logs) | Config > Privacidade > Exportar | ✅ US-024 |
| **Eliminação Dados Desnecessários** | Job cron: logs > 90 dias anonimizados, fotos > 1 ano (config) | Backend job | 🔄 Implementar |
| **Informação Compartilhamento** | Política privacidade lista: Evolution API (WhatsApp), OSRM/GraphHopper (routing), MinIO (storage) | Config > Privacidade > Política | ✅ |
| **Revogação Consentimento** | Toggle "Notificar WhatsApp" por endereço, revogar consentimento app | Config endereço, Onboarding | ✅ RN-012 |
| **Oposição** | Motorista pode não usar features (ex: não tirar foto = não confirma entrega) | UX design | ✅ |

---

## 4. Medidas Técnicas e Organizacionais (Art. 46-48 LGPD)

### 4.1 Controle de Acesso
- [x] **Autenticação forte:** Better Auth (email/senha + magic link), JWT 15min + refresh rotation
- [x] **Autorização baseada em roles:** `driver` (próprio dados), `admin` (gestão sistema)
- [x] **Princípio menor privilégio:** API scopes por recurso, RLS PostgreSQL (futuro)
- [x] **MFA opcional:** TOTP para admin (planejado v0.2)

### 4.2 Criptografia
- [x] **Em trânsito:** TLS 1.3 em todas conexões (API, OSRM, GraphHopper, Evolution, MinIO)
- [x] **Em repouso:** 
  - Mobile: SQLCipher (SQLite) + Keychain/Keystore (tokens, chaves)
  - Backend: AES-256-GCM para arquivos sensíveis (fotos, assinaturas), PostgreSQL `pgcrypto` para campos PII
- [x] **Chaves:** Gerenciamento via variáveis ambiente (VPS), rotação semestral

### 4.3 Pseudonimização/Anonimização
- [x] **CPF:** Armazenado apenas hash SHA-256 (RN-008)
- [x] **Telefone WhatsApp logs:** Armazenado mascarado (`5511****8888`) após 90 dias
- [x] **Relatórios agregados:** Métricas dashboard sem PII (motorista_id hash)
- [x] **Exclusão conta:** Job `anonymize_user_data(user_id)` → substitui PII por hash, mantém FKs

### 4.4 Registros de Processamento (Art. 37)
- [x] **Inventário dados:** `docs/data-inventory.md` (tabela: dado, finalidade, base legal, retenção, compartilhamento)
- [x] **Logs processamento:** `processing_logs` table (ação, usuário, timestamp, base legal, DPIA ref)
- [x] **DPIA (Data Protection Impact Assessment):** Realizado para features alto risco (geolocalização contínua, foto biométrica assinatura, WhatsApp automation)

### 4.5 Segurança Operacional
- [x] **SAST CI:** `kalimaster-sast` em todo PR (segredos, vuln dependências, config insegura)
- [x] **Dependabot:** Updates automáticos segurança GitHub
- [x] **Backup criptografado:** `pg_dump` + `minio mirror` diário, retenção 30 dias, teste restore mensal
- [x] **Plano resposta incidentes:** `docs/incident-response-plan.md` (detecção, contenção, notificação ANPD/titulares 48h)

---

## 5. Compartilhamento de Dados (Art. 7º, §1º; Art. 16)

| Destinatário | Dados Compartilhados | Finalidade | Base Legal | Contrato/Cláusulas | Status |
|--------------|---------------------|------------|------------|-------------------|--------|
| **Evolution API (Self-hosted)** | Telefone destinatário, template msg, instance ID | Envio WhatsApp | Consentimento (titular) / Legítimo interesse (motorista) | DPA assinado (self-hosted = controle total) | ✅ |
| **OSRM/GraphHopper (Self-hosted VPS)** | Coordenadas waypoints (lat/lng) | Cálculo rota | Legítimo interesse (otimização) | Self-hosted = sem compartilhamento externo | ✅ |
| **MinIO (Self-hosted VPS)** | Fotos entregas, assinaturas, MBTiles | Armazenamento | Contrato (comprovação) / Obrigação legal | Self-hosted = controle total | ✅ |
| **Apple/Google (Push Notifications)** | Device token, alerta genérico | Notificações app | Consentimento (config push) | Termos Apple/Google | ✅ |
| **Sentry (Error Tracking)** | Error stack, userId (hash), routeId | Monitoramento | Legítimo interesse (segurança) | DPA Sentry assinado | ✅ |
| **Grafana Cloud (Metrics/Logs)** | Métricas agregadas, logs estruturados (sem PII) | Observabilidade | Legítimo interesse | Self-hosted VPS = controle total | ✅ |

**NÃO COMPARTILHA COM:** Redes sociais, data brokers, anunciantes, terceiros para marketing.

---

## 6. Retenção e Eliminação (Art. 15, 16)

| Categoria Dado | Período Retenção | Ação Pós-Período | Base Legal |
|----------------|------------------|------------------|------------|
| Cadastro motorista (ativo) | Vigência conta + 5 anos | Anonimização (RN-017) | Contrato + Obrigação legal (Lei 12.009/2009) |
| Cadastro motorista (excluído) | Imediato (job anonimização) | Anonimização | Art. 18 LGPD (direito eliminação) |
| Endereços/rotas/entregas | 5 anos (comprovação fiscal/trabalhista) | Anonimização (mantém métricas agregadas) | Obrigação legal (CTN Art. 173, CLT) |
| Fotos/assinaturas entregas | 2 anos | Exclusão arquivo (MinIO) + anonimização metadados | Proporcionalidade |
| Logs WhatsApp (messageId, status) | 90 dias | Anonimização (telefone mascarado) | Proporcionalidade + Segurança |
| Logs sincronização | 1 ano | Anonimização | Segurança (Art. 46) |
| Logs erro/monitoring (Sentry/Grafana) | 90 dias | Rotação automática | Legítimo interesse |
| Backups database | 30 dias (rolling) | Exclusão automática | Disponibilidade |

---

## 7. Transferência Internacional (Art. 33-36)

- [x] **Nenhuma transferência internacional de dados pessoais** — toda infraestrutura self-hosted no Brasil (VPS Hetzner São Paulo ou equivalente nacional)
- [x] **Evolution API:** Self-hosted no mesmo VPS
- [x] **OSRM/GraphHopper:** Self-hosted no mesmo VPS
- [x] **MinIO:** Self-hosted no mesmo VPS
- [x] **Sentry:** Configurado para região `sa-east-1` (São Paulo) ou self-hosted
- [x] **Grafana:** Self-hosted no mesmo VPS
- [ ] **Expo/EAS Build:** Apenas build artifacts (código compilado, sem dados usuários) — processamento nos EUA (Expo), coberto por SCCs Expo

---

## 8. Cookies e Tecnologias Similares

- [x] **App Mobile:** Não usa cookies — usa `AsyncStorage`/`SecureStore` (tokens, preferências)
- [x] **Web Admin (v0.2):** Cookies essenciais apenas (sessão, CSRF), consentimento banner
- [x] **Rastreamento:** Zero tracking cross-site, zero pixels, zero fingerprinting

---

## 9. Treinamento e Conscientização (Art. 46, §2º)

| Ação | Frequência | Público | Status |
|------|------------|---------|--------|
| Onboarding LGPD (conceitos, direitos, procedimentos) | Admissão + Anual | Todo time (dev, PO, QA, DevOps) | 🔄 Agendar |
| Secure Coding (OWASP MASVS, LGPD by design) | Semestral | Devs | 🔄 Agendar |
| Incident Response Drill | Trimestral | Tech Lead, DevOps, DPO | 🔄 Agendar |
| Atualização jurisprudência/ANPD | Contínua | DPO + Legal | 🔄 Contínuo |

---

## 10. Auditoria e Conformidade Contínua

| Verificação | Ferramenta | Frequência | Responsável | Status |
|-------------|------------|------------|-------------|--------|
| **SAST** | `kalimaster-sast` | Todo PR (CI) | DevOps | ✅ Implementado |
| **DAST** | `kalimaster-dast` (staging) | Semanal | DevOps | 🔄 Implementar |
| **Dependency Scan** | Dependabot + `npm audit` | Diário (GitHub) | DevOps | ✅ Ativo |
| **LGPD Checklist** | Este documento | Por release + Semestral | DPO + Tech Lead | ✅ Este doc |
| **DPIA Review** | Template ANPD | Nova feature alto risco | DPO + Tech Lead | 🔄 Processo definido |
| **Pen Test** | Empresa especializada | Anual (pós v1.0) | DPO | 🔄 Planejar |
| **Backup Restore Test** | `scripts/restore.sh` | Mensal | DevOps | 🔄 Agendar |

---

## 11. Contato DPO e Canal Titular

**DPO (Encarregado):** [Nome Completo]  
**Email:** dpo@entregafacil.app  
**Telefone:** +55 11 99999-9999  
**Endereço:** [Endereço físico para correspondência ANPD]  

**Canal Titular (App):** Configurações > Privacidade > "Falar com DPO" (abre email pré-preenchido)  
**Canal Titular (Web):** https://entregafacil.app/privacidade#contato-dpo  

**Prazo Resposta:** 15 dias (Art. 18, §2º LGPD) — meta interna 5 dias úteis.

---

## 12. Status Geral Conformidade

| Área | % Conformidade | Pendências Críticas | Prazo |
|------|----------------|---------------------|-------|
| Princípios & Base Legal | 95% | DPIA features alto risco | Sprint 1 |
| Direitos Titular | 90% | Job eliminação automática logs | Sprint 3 |
| Medidas Técnicas | 95% | MFA admin, RLS PostgreSQL | v0.2 |
| Registros Processamento | 80% | Inventário completo `data-inventory.md` | Sprint 2 |
| Compartilhamento | 100% | — | ✅ |
| Retenção/Eliminação | 70% | Jobs cron anonimização | Sprint 4 |
| Transferência Internacional | 100% | — | ✅ |
| Treinamento | 0% | Agendar onboarding time | Imediato |
| Auditoria Contínua | 60% | DAST, Pen Test, Backup test | Sprint 6 |

**Conformidade Global Estimada MVP:** **85%** — Aceitável para beta fechado com plano ação para 100% v1.0

---

## 13. Aprovação

| Role | Nome | Assinatura | Data |
|------|------|------------|------|
| **DPO** | | | |
| **Tech Lead** | | | |
| **Product Owner** | | | |
| **Legal** | | | |

---

**Próxima Revisão:** 2027-02-17 (pós-Sprint 3)  
**Versão Anterior:** N/A (v0.1 inicial)