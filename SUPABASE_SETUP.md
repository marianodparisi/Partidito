# Configuración de Supabase para Partidito

## Paso 1: Configurar el Proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota los siguientes datos de **Settings → API**:
   - `Project URL` (ejemplo: https://xxxxx.supabase.co)
   - `anon public` key

## Paso 2: Configurar Autenticación

### Google OAuth:
1. Ve a **Authentication → Providers → Google**
2. Habilita Google provider
3. Necesitarás crear OAuth credentials en Google Cloud Console:
   - Ve a https://console.cloud.google.com/apis/credentials
   - Crea un proyecto nuevo o usa uno existente
   - Crea "OAuth 2.0 Client ID"
   - Tipo: Web application
   - **Authorized redirect URIs**: Copia el URL que te da Supabase (algo como `https://xxxxx.supabase.co/auth/v1/callback`)
4. Copia el Client ID y Client Secret a Supabase

### Email Magic Link:
1. Ve a **Authentication → Providers → Email**
2. Asegúrate que "Enable Email provider" esté activado
3. Habilita "Confirm email" si quieres verificación

## Paso 3: Crear las Tablas en la Base de Datos

Ve a **SQL Editor** y ejecuta este script:

```sql
-- Tabla de jugadores
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill DECIMAL(3,1) NOT NULL,
  positions TEXT[] NOT NULL,
  position_skills JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de partidos guardados
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  skill_difference DECIMAL(3,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_matches_user_id ON matches(user_id);
CREATE INDEX idx_matches_timestamp ON matches(timestamp DESC);

-- Row Level Security (RLS) - Los usuarios solo ven sus propios datos
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Políticas para players
CREATE POLICY "Users can view their own players"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own players"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own players"
  ON players FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own players"
  ON players FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para matches
CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own matches"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches"
  ON matches FOR DELETE
  USING (auth.uid() = user_id);
```

## Paso 4: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=tu_project_url_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## Paso 5: Configurar el Redirect URL en Supabase

1. Ve a **Authentication → URL Configuration**
2. Agrega tus URLs permitidas:
   - Para desarrollo: `http://localhost:3000`
   - Para producción: tu dominio real cuando lo despliegues

¡Listo! Una vez completados estos pasos, avísame y continúo con el código.
