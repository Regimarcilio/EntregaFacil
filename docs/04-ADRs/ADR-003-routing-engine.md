# ADR-003: Routing Engine — OSRM Self-Hosted (Primary) + GraphHopper (Fallback VRP)

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
O app precisa calcular rotas otimizadas para 10-50 waypoints (entregas) com:
- Algoritmo TSP (Traveling Salesman Problem) para ordem ótima
- Futuro: VRP com restrições (capacidade, janelas tempo, prioridade)
- Funcionamento offline (rota calculada server, JSON polyline cached no app)
- Latência < 3s para 30 waypoints
- Zero custo licença

## Decisão
**OSRM (Open Source Routing Machine)** self-hosted via Docker como primary para Trip/TSP guloso. **GraphHopper** com **jsprit** como fallback para VRP complexo (fase 2).

## Alternativas Consideradas

| Opção | TSP/VRP | Offline | Custo | Latência 30 wp | Veredito |
|-------|---------|---------|-------|----------------|----------|
| **OSRM (Escolhido Primary)** | ✅ Trip (TSP guloso) | ✅ Server local | $0 | ~60ms (MLD) | ✅ |
| **GraphHopper (Fallback)** | ✅ jsprit (VRP completo) | ✅ Server local | $0 | ~250ms (CH) | 🔄 Fase 2 |
| Google Routes API | ❌ Apenas Directions | ❌ Cloud only | $5-30/1k req | ~400ms | ❌ |
| Mapbox Optimization | ✅ VRP | ❌ Cloud only | $5-30/1k req | ~300ms | ❌ |
| Valhalla | ✅ TSP/VRP | ✅ Local | $0 | ~200ms | ❌ Complexo |

## Consequências

### Positivas
- **OSRM Trip endpoint**: Resolve TSP guloso (source=first, destination=last, roundtrip=false) — ideal para motoboy single route
- **MLD Pipeline**: Multi-Level Dijkstra, pré-processamento ~8min Brasil, query < 100ms
- **GraphHopper jsprit**: VRP real com capacity, time windows, skills, multiple vehicles — fase 2
- **Self-hosted**: Controle total, zero custo, dados OSM atualizados mensalmente
- **Clients TypeScript**: `@project-osrm/osrm` (oficial), `graphhopper-client` (community)

### Negativas/Riscos
- **RAM OSRM**: ~2-4GB para Brasil inteiro (mitigado: VPS 16GB, MLD mais leve que CH)
- **RAM GraphHopper**: ~4-8GB para Brasil + jsprit (mitigado: VPS 16GB, ou rodar sob demanda)
- **Pré-processamento**: Cron mensal baixar Geofabrik PBF → OSRM extract/partition/customize → GraphHopper import
- **Manutenção**: Docker containers, health checks, alertas se down

## Arquitetura Híbrida

```
App (React Native)
    │
    ├── Primary: OSRM /trip/v1/driving/{waypoints}?steps=true&source=first&destination=last
    │       └── Retorna: waypoints[waypoint_index], geometry, legs[], duration, distance
    │
    ├── Fallback VRP: GraphHopper /vrp/optimize (jobs, vehicles, relations)
    │       └── Retorna: routes[], unassigned[], cost
    │
    └── Recalculation: OSRM /route/v1/driving/{current};{next_wps} (desvio detectado)
```

## Parâmetros OSRM Trip (MVP)

```typescript
interface OSRMTripRequest {
  coordinates: [number, number][];  // [lng, lat] x N waypoints
  source: 'first';                   // Começa no primeiro
  destination: 'last';               // Termina no último
  roundtrip: false;                  // Não volta ao início
  steps: true;                       // Instruções turn-by-turn
  annotations: 'duration,distance';  // Métricas por trecho
  overview: 'simplified';            // Polyline simplificada
  geometries: 'polyline6';           // Google encoded polyline
}
```

## Pipeline Atualização Mensal (GitHub Actions / Cron VPS)

```yaml
# .github/workflows/update-routing.yml
on:
  schedule:
    - cron: '0 3 1 * *'  # Todo dia 1 às 03:00 UTC
jobs:
  update-osrm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download Brazil PBF
        run: wget -O brazil.osm.pbf https://download.geofabrik.de/south-america/brazil-latest.osm.pbf
      - name: OSRM Extract (MLD)
        run: |
          docker run -v ${PWD}:/data ghcr.io/project-osrm/osrm-backend \
            osrm-extract -p /opt/car.lua /data/brazil.osm.pbf
          docker run -v ${PWD}:/data ghcr.io/project-osrm/osrm-backend \
            osrm-partition /data/brazil.osrm
          docker run -v ${PWD}:/data ghcr.io/project-osrm/osrm-backend \
            osrm-customize /data/brazil.osrm
      - name: Deploy to VPS
        run: rsync -avz brazil.osrm.* user@vps:/data/osrm/
      - name: Reload OSRM
        run: ssh user@vps 'docker compose restart osrm'
  
  update-graphhopper:
    runs-on: ubuntu-latest
    steps:
      - name: Download & Import GraphHopper
        run: |
          wget -O brazil.osm.pbf https://download.geofabrik.de/south-america/brazil-latest.osm.pbf
          docker run -v ${PWD}:/data ghcr.io/graphhopper/graphhopper:11.1 \
            java -Xmx8g -jar graphhopper-web-11.1.jar import /data/brazil.osm.pbf
      - name: Deploy & Reload
        run: |
          rsync -avz gh-data/ user@vps:/data/graphhopper/
          ssh user@vps 'docker compose restart graphhopper'
```

## Validação
- [ ] Benchmark OSRM: 10/20/30 waypoints SP capital < 3s p95
- [ ] Benchmark GraphHopper jsprit: 20 jobs + 2 vehicles + time windows < 5s
- [ ] Health check: `/health` endpoints monitorados (Prometheus + Grafana)
- [ ] Fallback automático: Se OSRM 5xx/timeout → GraphHopper /route (simplificado)
- [ ] Cache local: App salva última rota calculada (JSON) para navegação offline

## Referências
- [Benchmarks](docs/02-benchmarks.md#2-engine-de-roteiriza%C3%A7%C3%A3o-vrptsp--comparativo)
- [OSRM HTTP API](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md)
- [GraphHopper jsprit VRP](https://github.com/graphhopper/jsprit)
- [OSRM MLD vs CH](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/technical.md)