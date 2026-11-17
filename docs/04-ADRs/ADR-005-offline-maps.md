# ADR-005: Offline Maps — MBTiles (OpenMapTiles/Planetiler) + MapLibre Local Style

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
Motoristas atuam em áreas com sinal instável/inexistente. Requisitos:
- Mapa base funcional 100% offline (pan, zoom, rota renderizada)
- Tiles vetoriais (performance, estilo customizável)
- Download sob demanda (WiFi), resumível
- Atualização mensal automática
- Zero custo licença

## Decisão
**MBTiles** gerados via **Planetiler** (ou OpenMapTiles) a partir de **Geofabrik Brazil PBF**, servidos via **MinIO (S3-compat)**, baixados pelo app (**expo-file-system**), renderizados pelo **MapLibre React Native** com **style.json local**.

## Alternativas Consideradas

| Opção | Offline Real | Vetor Tiles | Custo | Atualização | Veredito |
|-------|--------------|-------------|-------|-------------|----------|
| **MBTiles + Planetiler (Escolhido)** | ✅ | ✅ | $0 | Mensal cron | ✅ |
| Mapbox Offline | ✅ | ✅ | Pago (quota) | Automático | ❌ Custo |
| GraphHopper Offline | ⚠️ Legacy | ❌ Raster | $0 | Manual | ❌ |
| TileServer-GL (Server) | ❌ Requer rede | ✅ | $0 | Automático | ❌ |
| MapLibre + Raster Tiles | ✅ | ❌ | $0 | Manual | ❌ Performance |

## Consequências

### Positivas
- **100% Offline**: Após download, mapa funciona sem internet (pan, zoom, rota, busca local via Nominatim offline opcional)
- **Vetor Tiles**: 60fps, estilo JSON customizável (tema escuro/claro, modo direção, ícones custom)
- **Tamanho Controlado**: Brasil ~2GB total, estados individuais 200-500MB — download por região
- **Atualização Mensal**: Job cron Geofabrik → Planetiler → MinIO → App notifica "Mapas desatualizados > 60 dias"
- **Zero Custo**: OpenStreetMap + Planetiler (open source) + MinIO (self-hosted)

### Negativas/Riscos
- **Download Grande**: 450MB (SP) só WiFi — resume support obrigatório
- **Geração MBTiles**: Planetiler multi-thread requer CPU/RAM (mitigado: VPS build dedicado ou GitHub Actions large runner)
- **Busca Offline**: Nominatim não roda mobile (mitigado: cache geocoding recentes + fallback online)
- **Storage Device**: 2GB+ mapas + fotos + app — verificar espaço antes download

## Pipeline Geração MBTiles (Automatizado)

```bash
# 1. Download Geofabrik Brazil PBF (~2.5GB)
wget -O brazil-latest.osm.pbf https://download.geofabrik.de/south-america/brazil-latest.osm.pbf

# 2. Planetiler (multi-thread, ~15min em 16 vCPU)
# Requer boundary GeoJSON para recortar Brasil
planetiler \
  --osm-path=brazil-latest.osm.pbf \
  --output=brazil.mbtiles \
  --boundary=brasil_boundary.geojson \
  --area=brasil \
  --threads=16 \
  --max-zoom=16 \
  --min-zoom=0

# 3. Estados individuais (para download por região)
for state in SP RJ MG RS PR SC BA CE PE GO; do
  planetiler \
    --osm-path=brazil-latest.osm.pbf \
    --output=${state}.mbtiles \
    --boundary=estados/${state}.geojson \
    --area=${state} \
    --threads=8
done

# 4. Upload MinIO (versionado por data)
aws s3 cp brazil.mbtiles s3://entregafacil-tiles/brazil-$(date +%Y%m).mbtiles
aws s3 cp SP.mbtiles s3://entregafacil-tiles/SP-$(date +%Y%m).mbtiles
# ...

# 5. Manifest JSON para app
cat > tiles-manifest.json << EOF
{
  "version": "$(date +%Y%m)",
  "generatedAt": "$(date -Iseconds)",
  "regions": {
    "BR": { "name": "Brasil Completo", "size": 2048576000, "url": "https://cdn.entregafacil.app/tiles/brazil-$(date +%Y%m).mbtiles" },
    "SP": { "name": "São Paulo", "size": 472446402, "url": "https://cdn.entregafacil.app/tiles/SP-$(date +%Y%m).mbtiles" },
    ...
  }
}
EOF
aws s3 cp tiles-manifest.json s3://entregafacil-tiles/manifest.json
```

## Integração App (React Native)

```typescript
// hooks/useOfflineMaps.ts
interface MapRegion {
  id: string;
  name: string;
  size: number;
  url: string;
  downloadedAt?: string;
  version?: string;
}

const useOfflineMaps = () => {
  const [manifest, setManifest] = useState<MapRegion[]>([]);
  const [downloading, setDownloading] = useState<{ regionId: string; progress: number } | null>(null);

  // 1. Fetch manifest (cached 24h)
  const fetchManifest = async () => {
    const resp = await fetch('https://cdn.entregafacil.app/tiles/manifest.json');
    setManifest(await resp.json());
  };

  // 2. Download com progresso real + resume
  const downloadRegion = async (region: MapRegion) => {
    const fileUri = `${FileSystem.documentDirectory}tiles/${region.id}.mbtiles`;
    const resumeOffset = await FileSystem.getInfoAsync(fileUri).then(i => i.exists ? i.size : 0);
    
    setDownloading({ regionId: region.id, progress: 0 });
    
    const download = FileSystem.createDownloadResumable(
      region.url,
      fileUri,
      { headers: resumeOffset > 0 ? { 'Range': `bytes=${resumeOffset}-` } : {} }
    );
    
    const result = await download.downloadAsync(
      (progress) => setDownloading({ 
        regionId: region.id, 
        progress: (progress.totalBytesWritten + resumeOffset) / (progress.totalBytesExpectedToWrite + resumeOffset)
      })
    );
    
    if (result.status === 200) {
      // Atualiza MapLibre source
      mapRef.current?.getMap()?.getStyle()?.sources['offline-tiles']?.setTiles([`file://${result.uri}`]);
      // Salva metadados
      await AsyncStorage.setItem(`map_${region.id}`, JSON.stringify({ 
        version: region.version, 
        downloadedAt: new Date().toISOString() 
      }));
    }
    setDownloading(null);
  };

  // 3. Verificar atualizações (background)
  const checkUpdates = async () => {
    const newManifest = await fetchManifest();
    for (const region of newManifest) {
      const local = await AsyncStorage.getItem(`map_${region.id}`);
      if (!local || JSON.parse(local).version !== region.version) {
        // Notificar: "Mapas de ${region.name} desatualizados"
      }
    }
  };

  return { manifest, downloading, downloadRegion, checkUpdates };
};
```

## MapLibre Style JSON (Local)

```json
{
  "version": 8,
  "name": "EntregaFácil Offline",
  "sources": {
    "offline-tiles": {
      "type": "vector",
      "tiles": ["file:///data/user/0/com.entregafacil/files/tiles/SP.mbtiles/{z}/{x}/{y}.pbf"],
      "minzoom": 0,
      "maxzoom": 16
    }
  },
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#1a1a1a" } },
    { "id": "land", "source": "offline-tiles", "source-layer": "land", "type": "fill", "paint": { "fill-color": "#2d2d2d" } },
    { "id": "roads", "source": "offline-tiles", "source-layer": "roads", "type": "line", "paint": { "line-color": "#444", "line-width": 1.5 } },
    { "id": "route-layer", "type": "line", "source": "route-source", "paint": { "line-color": "#00d4aa", "line-width": 4, "line-dasharray": [0, 0] } },
    { "id": "waypoints", "type": "symbol", "source": "waypoints-source", "layout": { "icon-image": "delivery-marker", "icon-size": 1.2 } }
  ],
  "glyphs": "file:///data/user/0/com.entregafacil/files/fonts/{fontstack}/{range}.pbf",
  "sprite": "file:///data/user/0/com.entregafacil/files/sprites/sprite"
}
```

## Validação
- [ ] PoC: Download SP (450MB) WiFi → resume após interrupção → mapa 60fps offline
- [ ] Teste: Modo avião + navegação 10 waypoints SP → rota renderizada, instruções funcionam
- [ ] Benchmark: Cold start mapa offline < 2s, memória < 150MB
- [ ] Teste atualização: Manifest v202611 → v202612 → notificação + download diferencial
- [ ] Teste storage: Device 4GB livre → baixar SP + RJ → alerta se < 500MB livre

## Referências
- [Benchmarks](docs/02-benchmarks.md#4-mapas-offline--maplibre--mbtiles)
- [Planetiler](https://github.com/onthegomap/planetiler)
- [OpenMapTiles](https://openmaptiles.org/)
- [MBTiles Spec](https://github.com/mapbox/mbtiles-spec)
- [MapLibre Style Spec](https://maplibre.org/maplibre-style-spec/)