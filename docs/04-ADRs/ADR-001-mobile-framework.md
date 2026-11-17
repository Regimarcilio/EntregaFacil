# ADR-001: Mobile Framework — React Native + Expo (Bare Workflow)

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
Precisamos desenvolver um app mobile (Android/iOS) para motoristas de entrega com requisitos:
- Mapas offline com navegação turn-by-turn
- Performance 60fps em dispositivos médios/baixos
- Build APK/AAB para distribuição (Play Store / side-load)
- Offline-first architecture com sync
- Time-to-market otimizado (MVP 8-10 semanas)
- Zero custo licença

## Decisão
**React Native 0.76 + Expo SDK 58** com migração para **Bare Workflow** quando necessário (MapLibre Navigation SDK, módulos nativos customizados).

## Alternativas Consideradas

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **React Native + Expo (Escolhido)** | Ecossistema enorme, MapLibre nativo, EAS Build cloud, OTA updates, TypeScript first | Bare workflow adiciona complexidade nativa | ✅ |
| Flutter + Dart | Performance nativa, single codebase, bom para mapas | MapLibre Flutter menos maduro, Navigation SDK não existe, pool devs menor | ❌ |
| Kotlin Multiplatform (KMP) | Compartilha lógica nativa, 100% nativo Android | Ecossistema mapas imaturo, iOS complexo, devs raros | ❌ |
| Capacitor/Ionic + Vue/React | Reuso web, devs web | WebView performance mapas, sem turn-by-turn nativo | ❌ |

## Consequências

### Positivas
- **MapLibre React Native** (676⭐, MIT): vetor tiles nativo, MBTiles offline, Navigation SDK turn-by-turn
- **Expo Maps**: fallback Google Maps (Android) / Apple Maps (iOS) nativo, zero config
- **EAS Build**: build cloud grátis (30/mês), não precisa Xcode/Android Studio local no managed workflow
- **OTA Updates**: correções críticas em produção sem review store
- **TypeScript end-to-end**: compartilha types com backend (Drizzle + API)
- **Maior pool de devs**: React Native #1 cross-platform

### Negativas/Riscos
- **Bare Workflow**: requer `expo prebuild`, config nativa (Xcode/Android Studio) para MapLibre Navigation SDK
- **Tamanho APK**: ~25-40MB base vs ~15-25MB Flutter (mitigado: `expo-optimize`, dynamic delivery)
- **Atualizações nativas**: breaking changes React Native/Expo exigem migração cuidadosa

## Plano de Mitigação
1. Iniciar no **Managed Workflow** (Expo Go para dev)
2. Migrar para **Bare** apenas quando: `maplibre-navigation` ou módulo nativo custom (Bluetooth térmica fase 2)
3. Scripts automatizados: `scripts/prebuild.sh`, `scripts/eas-build.sh`
4. Documentação onboarding: `docs/onboarding-mobile.md`
5. CI: `eas build --profile development` para testar bare em cloud

## Validação
- [ ] Prova de conceito: MapLibre + MBTiles + Navigation SDK em device real
- [ ] Benchmark: cold start < 3s, mapa 60fps, navegação 2h battery < 15%
- [ ] Build EAS: production APK < 80MB, AAB < 60MB
- [ ] OTA: expo-updates funcional em staging

## Referências
- [Benchmarks](docs/02-benchmarks.md#1-stack-mobile--comparativo)
- [MapLibre React Native](https://github.com/maplibre/maplibre-react-native)
- [Expo Bare Workflow](https://docs.expo.dev/bare/overview/)
- [EAS Build](https://docs.expo.dev/build/introduction/)