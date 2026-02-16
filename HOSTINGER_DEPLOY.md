# 🚀 Deploy a Hostinger - Guía Paso a Paso

## Tu Setup:
- **Dominio**: https://partidito.mparisi.dev
- **Repositorio**: GitHub
- **Hosting**: Hostinger con auto-deploy
- **Build**: Automático con `npm run build`

---

## ⚙️ Configuración de Variables de Entorno en Hostinger

### Opción A: Desde el Panel de Hostinger (Recomendado)

1. **Entra a tu panel de Hostinger**
2. **Ve a la sección de tu aplicación Node.js/Vite**
3. **Busca "Environment Variables" o "Variables de Entorno"**
4. **Agrega estas variables:**

   ```
   Variable: VITE_SUPABASE_URL
   Valor: https://fbuavoarrevnmkwfxlxi.supabase.co
   ```

   ```
   Variable: VITE_SUPABASE_ANON_KEY
   Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidWF2b2FycmV2bm1rd2Z4bHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzAzODg1MzUsImV4cCI6MjA4NTk2NDUzNX0.L6uCf9bjd9iCr-gBxVUS48w-h3TACCRMszlAw5jCfSY
   ```

5. **Guarda los cambios**
6. **Redeploy** la aplicación (puede ser automático)

### Opción B: Via FTP (Si no encuentras la opción en el panel)

Si Hostinger no tiene una interfaz para variables de entorno:

1. **Conecta por FTP** a tu servidor
2. **Crea un archivo `.env.production`** en la raíz del proyecto (mismo nivel que package.json)
3. **Agrega el contenido:**
   ```env
   VITE_SUPABASE_URL=https://fbuavoarrevnmkwfxlxi.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidWF2b2FycmV2bm1rd2Z4bHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzAzODg1MzUsImV4cCI6MjA4NTk2NDUzNX0.L6uCf9bjd9iCr-gBxVUS48w-h3TACCRMszlAw5jCfSY
   ```
4. **Asegúrate que `.env.production` esté en `.gitignore`**

---

## 📝 Workflow de Deploy

### Cada vez que quieras hacer deploy:

```bash
# 1. Haz tus cambios
git add .
git commit -m "tu mensaje"

# 2. Push a GitHub
git push origin main

# 3. Hostinger automáticamente:
#    - Detecta el cambio
#    - Hace npm install (si hay cambios en package.json)
#    - Ejecuta npm run build
#    - Despliega la carpeta dist/
```

---

## 🔍 Verificar que todo funcione

### Después del primer deploy con variables:

1. **Abre** https://partidito.mparisi.dev
2. **Deberías ver la pantalla de login** (no un error)
3. **Abre DevTools** (F12) → Console
4. **Verifica que NO hay errores** tipo "Missing Supabase environment variables"

### Si ves errores:

**Error: "Missing Supabase environment variables"**
→ Las variables no se cargaron en el build
→ Verifica que las configuraste en Hostinger
→ Fuerza un rebuild (puede ser necesario hacer un commit dummy)

**Error: "Failed to fetch" o errores de CORS**
→ Ve a tu Supabase dashboard
→ Authentication → URL Configuration
→ Agrega `https://partidito.mparisi.dev` a las URLs permitidas

---

## 🎯 Configuración Adicional en Supabase

1. **Ve a tu Supabase Dashboard**: https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **Ve a Authentication → URL Configuration**
4. **Agrega estas URLs**:

   **Site URL:**
   ```
   https://partidito.mparisi.dev
   ```

   **Redirect URLs:**
   ```
   https://partidito.mparisi.dev
   https://partidito.mparisi.dev/**
   http://localhost:3000
   http://localhost:3000/**
   ```

5. **Guarda**

---

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en Hostinger
- [ ] `.env.local` NO está en el repositorio de Git
- [ ] URLs configuradas en Supabase
- [ ] Tablas creadas en Supabase (ejecutar SQL de SUPABASE_SETUP.md)
- [ ] Push a GitHub realizado
- [ ] Sitio cargando en https://partidito.mparisi.dev
- [ ] Login funciona (prueba con email magic link primero)
- [ ] Datos se guardan correctamente en Supabase

---

## 🐛 Troubleshooting Específico de Hostinger

**El build falla en Hostinger:**
→ Revisa los logs en el panel de Hostinger
→ Puede ser que falten dependencias o que Node.js sea una versión antigua

**Las variables no se cargan:**
→ Intenta hacer un "Force Rebuild" desde el panel
→ O haz un commit dummy para forzar el rebuild

**El servicio worker causa problemas:**
→ Puede ser porque la versión vieja está cacheada
→ Limpia el cache del service worker: DevTools → Application → Service Workers → Unregister

---

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs en el panel de Hostinger
2. Verifica las variables de entorno están bien escritas (sin espacios extra)
3. Confirma que las tablas existen en Supabase (ve al SQL Editor)

¡Listo! Una vez configurado, cada push será automático 🚀
