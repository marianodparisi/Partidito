# 🚀 Deploy a Producción - Partidito

## Tu dominio: https://partidito.mparisi.dev

## 📋 Checklist de Deployment

### 1. Configurar Supabase para Producción

En tu dashboard de Supabase (https://supabase.com/dashboard):

1. Ve a **Authentication → URL Configuration**
2. Agrega estas URLs a **Redirect URLs**:
   ```
   https://partidito.mparisi.dev
   https://partidito.mparisi.dev/**
   http://localhost:3000
   http://localhost:3000/**
   ```
3. En **Site URL**, pon: `https://partidito.mparisi.dev`

### 2. Configurar Google OAuth (si lo usas)

En Google Cloud Console (https://console.cloud.google.com/apis/credentials):

1. Ve a tus OAuth 2.0 Client IDs
2. Agrega a **Authorized redirect URIs**:
   ```
   https://tu-proyecto.supabase.co/auth/v1/callback
   ```
3. Agrega a **Authorized JavaScript origins**:
   ```
   https://partidito.mparisi.dev
   ```

### 3. Variables de Entorno en Producción

Dependiendo de dónde esté hosteado, necesitas configurar estas variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

#### Si usas Vercel:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

#### Si usas Netlify:
En el dashboard: Site settings → Environment variables

#### Si usas cPanel o servidor propio:
Crea un archivo `.env.production` y súbelo al servidor (fuera del public_html si es posible)

### 4. Build para Producción

```bash
npm run build
```

Esto genera la carpeta `dist/` que debes subir a tu servidor.

### 5. Verificar PWA

Asegúrate que estos archivos estén en `dist/`:
- `manifest.webmanifest`
- `icons/` (con todos los iconos)
- `sw.js` o `service-worker.js`

### 6. Configurar Headers (Opcional pero recomendado)

Si tienes acceso a configurar headers, agrega:

```
# Headers para PWA
/manifest.webmanifest
  Content-Type: application/manifest+json

# Headers de seguridad
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

## 🧪 Testing Post-Deploy

Después del deploy, verifica:

1. ✅ El login con Google funciona
2. ✅ El login con Email funciona
3. ✅ Los datos se sincronizan correctamente
4. ✅ La PWA se puede instalar en mobile
5. ✅ Los service workers funcionan (check en DevTools → Application → Service Workers)

## 🐛 Troubleshooting

**Error: "Invalid login credentials"**
→ Verifica que las URLs de redirect estén configuradas en Supabase

**Error: "Failed to fetch"**
→ Verifica que las variables de entorno estén configuradas en producción

**PWA no se instala**
→ Verifica que estés usando HTTPS (required para PWA)
→ Verifica que manifest.webmanifest sea accesible

**Los cambios no se reflejan**
→ Limpia la caché del navegador
→ Desregistra el service worker viejo en DevTools

## 📱 Instalar en iOS/Android

Una vez deployed:

### iOS (Safari):
1. Abre https://partidito.mparisi.dev en Safari
2. Tap en el botón "Compartir"
3. Selecciona "Agregar a pantalla de inicio"

### Android (Chrome):
1. Abre https://partidito.mparisi.dev en Chrome
2. Verás un banner "Agregar a inicio"
3. O usa el menú → "Instalar app"

---

¿Dónde está hosteado tu sitio actual? Te ayudo con la configuración específica.
