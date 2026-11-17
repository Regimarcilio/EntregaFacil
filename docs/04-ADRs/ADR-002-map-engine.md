# ADR-002: Map Engine — MapLibre React Native (Primary) + Expo Maps (Fallback)

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
O app requer:
- Mapas offline funcionais (tiles vetoriais MBTiles)
- Navegação turn-by-turn com instruções de voz
- Performance 60fps em dispositivos de entrada (Snapdragon 680, 2GB RAM)
- Zero custo de licença (open source)
- Estilo customizável (tema escuro/claro, modo direção)

## Decisão
**MapLibre React Native** como engine principal + **Expo Maps** (Google Maps Android / Apple Maps iOS) apenas como fallback visual durante desenvolvimento.

## Alternativas Consideradas

| Opção | Offline | Turn-by-Turn | Licença | Performance | Veredito |
|-------|---------|--------------|---------|-------------|----------|
| **MapLibre React Native (Escolhido)** | ✅ MBTiles nativo | ✅ Navigation SDK | MIT | 60fps nativo | ✅ |
| **Expo Maps (Fallback)** | ❌ Sem offline real | ❌ Não | Grátis (quota) | Nativo 60fps | 🔄 Fallback |
| Google Maps SDK | ❌ Cache limitado | ✅ Navigation SDK | Pago (quota) | 60fps | ❌ Custo |
| Mapbox SDK | ⚠️ Offline pago | ✅ Navigation SDK | Pago (quota) | 60fps | ❌ Custo |
| Leaflet / React Native Maps | ❌ Raster tiles apenas | ❌ Não | MIT | 30fps (bridge) | ❌ |

## Consequências

### Positivas
- **MBTiles suporte nativo**: Carrega `.mbtiles` (SQLite) direto no device via `file://` protocol
- **Navigation SDK**: Turn-by-turn offline, recálculo automático, instruções voz (TTS), lanes guidance
- **Style JSON**: Customização total (cores, ícones, fontes, layers) — tema escuro nativo
- **60fps garantido**: Render nativo (Skia/Metal/Vulkan), sem bridge JS
- **Zero custo**: OpenStreetMap tiles, sem API key, sem quota

### Negativas/Riscos
- **Bare Workflow obrigatório**: `maplibre-navigation` requer módulos nativos (Kotlin/Swift)
- **Geração MBTiles**: Pipeline Planetiler/OpenMapTiles → build server → MinIO → App download
- **Tamanho tiles**: Brasil ~2GB (estados 200-500MB) — download só WiFi, resume support
- **Atualização tiles**: Mensal (Geofabrik PBF update) — job cron automatizado

## Estratégia de Implementação

### Fase 1 (MVP) — Navegação Simples
```
OSRM /trip → GeoJSON polyline + steps[] 
    → MapLibre: addLayer(LineString) + SymbolLayer(waypoints)
    → App: Instruções visuais (seta + distância + rua) + voz (expo-speech)
    → GPS: Proximidade waypoint (< 50m) → Próxima instrução
```

### Fase 2 — MapLibre Navigation SDK
```
@maplibre/maplibre-navigation-react-native
    → NavigationViewController (iOS) / NavigationService (Android)
    → Voice instructions nativas (TTS engine do OS)
    → Recalculation automática off-route
    → Lane guidance, speed limits, traffic (se online)
```

## Geração MBTiles (Pipeline Automatizado)

```bash
# Mensal via GitHub Actions / Cron VPS
1. wget https://download.geofabrik.de/south-america/brazil-latest.osm.pbf
2. planetiler --osm-path=brazil-latest.osm.pbf --output=brazil.mbtiles --boundary=brasil_boundary.geojson
3. aws s3 cp brazil.mbtiles s3://entregafacil-tiles/brazil-$(date +%Y%m).mbtiles
4. App: Verifica version → Download diferencial (resume) → Substitui local
```

## Validação
- [ ] PoC: MapLibre + MBTiles São Paulo (450MB) offline → pan/zoom 60fps
- [ ] PoC: Navigation SDK turn-by-turn 30min device real
- [ ] Benchmark: Cold start mapa < 2s, memória < 150MB
- [ ] Teste acessibilidade: TalkBack anuncia instruções navegação
- [ ] Fallback: Expo Maps funcionando em dev (sem MBTiles)

## Referências
- [Benchmarks](docs/02-benchmarks.md#4-mapas-offline--maplibre--mbtiles)
- [MapLibre React Native Docs](https://maplibre.org/maplibre-react-native/)
- [MapLibre Navigation SDK](https://github.com/maplibre/maplibre-navigation-android)
- [Planetiler](https://github.com/onthegomap/planetiler)
- [OpenMapTiles](https://openmaptiles.org/)