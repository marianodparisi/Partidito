# 🚀 Partidito con Supabase - Guía Rápida

## ✅ Pasos Completados

1. ✅ Instalado `@supabase/supabase-js`
2. ✅ Creado servicio de autenticación (`utils/auth.ts`)
3. ✅ Creado servicio de base de datos con Supabase (`utils/db-supabase.ts`)
4. ✅ Creado pantalla de login (`components/AuthScreen.tsx`)
5. ✅ Integrado autenticación en App.tsx

## 📋 Lo que NECESITAS hacer ahora:

### 1. Configurar Supabase (Dashboard)

Sigue las instrucciones en `SUPABASE_SETUP.md`:

1. **Crear proyecto en Supabase**
2. **Configurar Google OAuth** (opcional pero recomendado)
3. **Ejecutar el SQL** para crear las tablas `players` y `matches`
4. **Configurar URLs permitidas**

### 2. Crear archivo `.env.local`

En la raíz del proyecto:

```bash
cp .env.local.example .env.local
```

Luego edita `.env.local` y agrega tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 3. Reiniciar el servidor

```bash
npm run dev
```

## 🎯 Cómo Funciona

### Autenticación
- **Google Sign-In**: Login con cuenta de Google (requiere configuración en Google Cloud Console)
- **Email Magic Link**: Envía un enlace mágico al email (sin contraseña)

### Sincronización de Datos
- **Automática**: Los datos se guardan en Supabase al crear/editar/eliminar
- **Multi-dispositivo**: Accede a tus jugadores y partidos desde cualquier dispositivo
- **Row Level Security**: Cada usuario solo ve sus propios datos

### Migración desde IndexedDB
Si ya tienes datos en IndexedDB local, se migrarán automáticamente la primera vez que inicies sesión.

## 🔒 Seguridad

- Las credenciales NUNCA se suben a Git (`.env.local` está en `.gitignore`)
- Row Level Security (RLS) activo en todas las tablas
- Tokens de sesión manejados automáticamente por Supabase

## 🐛 Troubleshooting

**Error: "Missing Supabase environment variables"**
→ Verifica que `.env.local` existe y tiene las variables correctas

**Error al hacer login con Google**
→ Verifica que configuraste Google OAuth en Supabase y Google Cloud Console

**Los datos no se sincronizan**
→ Verifica que ejecutaste el SQL para crear las tablas y las políticas RLS

## 📱 Para Producción

Cuando despliegues la app:
1. Agrega la URL de producción a **Authentication → URL Configuration** en Supabase
2. Configura las variables de entorno en tu plataforma de hosting (Vercel, Netlify, etc.)
3. Actualiza el `redirectTo` en Google Cloud Console si usas Google OAuth

---

¿Preguntas? Revisa `SUPABASE_SETUP.md` para instrucciones detalladas.
