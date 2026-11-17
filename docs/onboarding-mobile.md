# Onboarding Mobile — EntregaFácil

**Versão:** 0.1  
**Público:** Dev Mobile (React Native + Expo)  
**Pré-requisitos:** Node 20+, Yarn 4+, Git, Android Studio / Xcode (para Bare)

---

## 1. Setup Inicial

```bash
# Clone
git clone git@github.com:seu-org/entregafacil.git
cd entregafacil/mobile

# Install dependencies (Yarn Berry zero-installs)
yarn install

# Variáveis de ambiente
cp .env.example .env
# Editar .env:
# EXPO_PUBLIC_API_URL=https://api.entregafacil.app
# EXPO_PUBLIC_EVOLUTION_URL=https://evolution.entregafacil.app
# EXPO_PUBLIC_MAPBOX_TOKEN=  # opcional, se usar Mapbox fallback

# Verificar setup
yarn doctor
```

---

## 2. Desenvolvimento (Managed Workflow — Expo Go)

```bash
# Inicia Metro bundler
yarn start

# Abre no device físico (Expo Go app)
# Escaneia QR code no terminal

# Ou emulador/simulador
yarn android    # Android emulator
yarn ios        # iOS simulator

# Logs
yarn logs:android
yarn logs:ios
```

### Estrutura de Rotas (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── onboarding.tsx
│   └── whatsapp-config.tsx
├── (tabs)/
│   ├── _layout.tsx          # Tab navigator
│   ├── index.tsx            # Home / Rotas do dia
│   ├── routes.tsx           # Lista rotas
│   ├── history.tsx          # Histórico
│   ├── profile.tsx          # Perfil
│   └── settings.tsx         # Configurações
├── route/
│   ├── _layout.tsx          # Stack navigator rota
│   ├── checklist.tsx        # Checklist draggable
│   ├── map.tsx              # Mapa + rota
│   ├── navigation.tsx       # Turn-by-turn
│   └── proof.tsx            # Comprovação entrega
└── _layout.tsx              # Root layout + providers
```

---

## 3. Bare Workflow (Para MapLibre Navigation SDK)

```bash
# Prebuild (gera pastas android/ ios/ nativas)
yarn prebuild

# Limpar cache se necessário
yarn prebuild --clean

# Desenvolvimento nativo
yarn run:android    # npx expo run:android
yarn run:ios        # npx expo run:ios

# Build local (requer Android Studio / Xcode)
cd android && ./gradlew assembleDebug
cd ios && xcodebuild -workspace EntregaFacil.xcworkspace -scheme EntregaFacil -configuration Debug
```

### Configurações Nativas Importantes

**android/app/src/main/AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

**ios/EntregaFacil/Info.plist:**
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>EntregaFácil precisa da sua localização para navegação e comprovação de entregas</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>EntregaFácil precisa da localização em background para navegação contínua</string>
<key>NSCameraUsageDescription</key>
<string>EntregaFácil usa a câmera para capturar fotos de comprovação de entrega</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
</array>
```

---

## 4. Comandos Úteis

```bash
# Lint + Typecheck
yarn lint
yarn typecheck

# Testes
yarn test:unit              # Jest
yarn test:e2e               # Detox (requer device)

# Build EAS (Cloud)
eas login
eas build --profile development --platform android
eas build --profile production --platform all

# Sync types com backend
yarn generate:types         # Roda scripts/generate-types.sh

# Debug
yarn start --clear          # Limpa cache Metro
npx expo-doctor             # Diagnóstico projeto
```

---

## 5. Arquitetura de Estado (Zustand)

```typescript
// src/shared/store/index.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  // Auth
  user: Motorista | null;
  token: string | null;
  setAuth: (user: Motorista, token: string) => void;
  logout: () => void;
  
  // Rotas
  routes: Rota[];
  currentRouteId: string | null;
  setRoutes: (routes: Rota[]) => void;
  setCurrentRoute: (id: string) => void;
  
  // Endereços
  addresses: Endereco[];
  setAddresses: (addresses: Endereco[]) => void;
  
  // Sync Queue
  syncQueue: SyncOperation[];
  enqueue: (op: SyncOperation) => void;
  dequeue: (id: string) => void;
  
  // Config
  preferences: Preferencias;
  setPreferences: (prefs: Partial<Preferencias>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ... implementação
    }),
    {
      name: 'entregafacil-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        preferences: state.preferences,
        // Não persistir routes/addresses/queue (vêm do server)
      }),
    }
  )
);
```

---

## 6. API Client (Axios + Offline Queue)

```typescript
// src/shared/api/client.ts
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '@/shared/store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
});

// Interceptor: adiciona token
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: trata 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAppStore.getState().logout();
      // Redirect para login
    }
    return Promise.reject(error);
  }
);

// Offline Queue Middleware
let isOnline = true;
NetInfo.addEventListener((state) => {
  isOnline = state.isInternetReachable ?? false;
  if (isOnline) syncEngine.flushQueue();
});

export const apiWithQueue = {
  ...api,
  async request(config) {
    if (!isOnline) {
      // Enqueue operation
      const op = { id: uuidv4(), ...config, timestamp: Date.now() };
      useAppStore.getState().enqueue(op);
      return { data: { queued: true } };
    }
    return api.request(config);
  }
};
```

---

## 7. Debugging Comum

| Problema | Solução |
|----------|---------|
| Metro não inicia | `yarn start --clear`, verificar porta 8081 livre |
| Build nativo falha | `yarn prebuild --clean`, verificar `android/gradle.properties` |
| MapLibre não renderiza | Verificar style.json local, source MBTiles path `file://` |
| Câmera não abre | Permissões AndroidManifest/Info.plist, `expo-camera` permissions |
| GPS não atualiza | `expo-location` foreground/background, `enableHighAccuracy: true` |
| Sync não funciona | Verificar NetInfo listener, queue local SQLite, server `/sync/batch` |

---

## 8. Performance Tips

- **FlashList** para listas grandes (checklist, histórico) — virtualização
- **React.memo** + **useCallback** em componentes de lista
- **Imagens:** `expo-image` com `useImage` + cache, WebP quality 80%
- **MapLibre:** `maxZoom: 16`, `minZoom: 0`, layers só quando necessários
- **Bundle:** `expo-optimize` assets, remover imports não usados
- **State:** Zustand selectors granulares (evita re-renders)

---

## 9. Acessibilidade Checklist

- [ ] Todos botões: `accessibilityRole="button"`, `accessibilityLabel`
- [ ] Inputs: `accessibilityLabel`, `accessibilityHint` se necessário
- [ ] Imagens decorativas: `accessibilityElementsHidden={true}`
- [ ] Contraste: ≥ 4.5:1 (verificar `axe-core` CI)
- [ ] Touch targets: ≥ 48dp (60dp modo luva)
- [ ] Ordem foco: lógica (topo → baixo, esquerda → direita)
- [ ] TalkBack/VoiceOver: anuncia mudanças estado (loading, sucesso, erro)
- [ ] Modo luva: fonte ≥ 18sp, botões 60x60dp, espaçamento ≥ 8dp

---

## 10. Referências Rápidas

- [Expo Docs](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [MapLibre React Native](https://maplibre.org/maplibre-react-native/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/)