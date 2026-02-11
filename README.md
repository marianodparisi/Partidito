<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/12mG8VYgNlkvEXQqLCHz22szsCcbW0aMi

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Run the app in development mode: `npm run dev`
3. Execute the IndexedDB test suite: `npm test`

## Progressive Web App

- Android: abre la aplicación en Chrome, pulsa el menú de tres puntos y selecciona **Añadir a la pantalla principal**.
- iOS: abre la app en Safari, pulsa **Compartir** → **Añadir a pantalla de inicio**.

Una vez instalada, la aplicación funciona como una app nativa y puede trabajar sin conexión gracias a la caché del service worker y a IndexedDB para persistir jugadores y partidos.

## Producción

- Genera un build optimizado con `npm run build`.
- Sirve la carpeta `dist` con tu hosting preferido o `npm run preview`.
