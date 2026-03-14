# Resumen del Proyecto: TimerPersonal / Time Tracker App

Este documento sirve como la **fuente de la verdad y resumen completo** del estado actual de la aplicación. Su propósito es permitir a cualquier persona nueva (o a agentes de IA) comprender rápidamente de qué se trata el proyecto, su arquitectura, y sus funcionalidades clave.

---

## 1. Visión General del Producto

La aplicación es un **Tracker Inteligente y Gamificado de Hábitos y Tiempo**. Comenzó como un rastreador manual y ha evolucionado hacia un sistema gamificado con un asistente inteligente (IA) que analiza patrones y ofrece recomendaciones.
El objetivo central es que el usuario registre "Acciones" (positivas o negativas), las cuales se traducen en **Puntos** o **Tiempo Ganado/Perdido**, promoviendo un balance de vida productivo.

## 2. Stack Tecnológico y Arquitectura

El proyecto es una aplicación web moderna basada fuertemente en el ecosistema de React, Next.js y Supabase.

*   **Framework Principal:** Next.js 14 (App Router)
*   **Librería UI:** React 18
*   **Base de Datos y Autenticación:** Supabase (PostgreSQL + Supabase Auth)
*   **Gestión del Estado:** Zustand
*   **Estilos:** CSS Modules y variables CSS (sin Tailwind, manteniendo una estética cuidada y moderna)
*   **Inteligencia Artificial:** Interacción con la API de OpenAI (para la generación de insights, notificaciones "Smart" y análisis de texto libre).
*   **Visualización de Datos:** Recharts para construir gráficas y reportes de progreso.
*   **Utilidades:** `date-fns` (y `date-fns-tz`) para gestión del tiempo y zonas horarias.

## 3. Entidades y Modelaje de Datos (Core)

El dominio central de la aplicación se encuentra en el archivo `src/core/types.ts`. Sus entidades clave son:

1.  **User (Usuario):** Contiene el nivel, la experiencia (XP), el rol, las preferencias, el avatar y los ítems cosméticos adquiridos.
2.  **Action (Acción):** Una actividad base que puede ser `positive` (ej. estudiar) o `negative` (ej. ver TikTok). Define los `pointsPerMinute`.
3.  **DailyRecord (Registro Diario):** La instancia específica en que un usuario ejecutó una `Action`, con su fecha, duración, valor métrico y `pointsCalculated`.
4.  **Goal (Objetivo/Meta):** Metas que los usuarios se proponen (`points`, `duration`, `count`) bajo ciertos periodos (`weekly`, `monthly`, `annual`, `milestone`).
5.  **Strike:** Sistema punitivo. Un strike se registra cuando un usuario falla o comete un "error" en su racha de hábitos diarios. Afecta el balance.
6.  **Balance:** Resultado neto (`totalPoints` y `timeGainedMinutes`) en los periodos configurados.
7.  **DailyMission (Misión Diaria):** Retos generados a los usuarios por niveles de dificultad (`easy`, `medium`, `hard`) que otorgan puntos extras si son completados.
8.  **GachaPrize / ActiveBuff:** Recompensas estilo "Ruleta Gacha" que otorgan multiplicadores de puntos, con diferentes rarezas.
9.  **ShopItem / UserActivePower:** Tienda donde los puntos del usuario se gastan en mejoras o "ataques". Introduce elementos competitivos tipo *multiplayer* y bonificadores (`escudo`, `sabotaje`, etc).
10. **League (Liga):** Sistema de progreso competitivo (Bronce, Plata, Oro, Platino, Diamante, Élite) basado en la cantidad de puntos del usuario.

## 4. Estructura del Código

La estructura de carpetas sigue un patrón muy bien definido de separación de responsabilidades:

*   `/src/app/`: Define las rutas del frontend bajo el paradigma Next.js App Router (rutas: dashboard, login, registro, historial, IA, estadísticas, tienda, leaderboard).
*   `/src/core/`: Toda la lógica "ciega" e interfaces (Tipos, Servicios Puros y Calculadoras de la lógica del juego o balances). Incluye motores importantes como:
    *   `BalanceCalculator.ts` o `PointsCalculator.ts`
    *   `GachaEngine.ts` y `DailyMissionEngine.ts` (motores de gamificación)
    *   `NotificationEngine.ts` (manejo de la IA y alertas "sarcásticas")
    *   `StrikeDetector.ts` y `WeeklySummaryEngine.ts`
*   `/src/ui/`: Todos los componentes visuales divididos. La UI es "tonta", no maneja lógica compleja ni se acopla excesivamente al backend si se puede evitar.
*   `/src/app/api/`: Las rutas de backend (endpoints Serverless) para interacciones con la AI (`/api/ai`), procesos de cron, ruleta gacha (`/api/gacha`), etc.

## 5. Listado de Funcionalidades Principales

1.  **Registro Inteligente y Manual de Hábitos:** Permite agregar qué estás haciendo y contar tus horas ganadas o perdidas.
2.  **Sistema de IA y Notificaciones "Smart":** La IA analiza el balance de un usuario y puede enviar mensajes que van desde amigables hasta "brutalmente sarcásticos" (`NotificationEngine.ts`) según la situación.
3.  **Gamificación Competitiva (Leaderboard y Ligas):** Puntuación que avanza según acciones positivas, posicionándote entre un ecosistema de ligas elitistas.
4.  **Sistema "Strike" y Vacaciones:** Maneja el concepto de fallos sucesivos y castigos (strikes), permitiendo desactivarlo en "Modo Vacaciones" de manera controlada para no perder progreso.
5.  **Misiones y Tienda:** Los usuarios ganan puntos no solo con tiempo y hábitos, sino cumpliendo "Misiones Diarias", que luego se gastan en una Tienda para compras cosméticas, defensivas o agresivas (hacia otros usuarios).
6.  **Historial y Dashboard con Analíticas:** Presentación limpia mediante gráficos (Recharts) indicando si la semana es un éxito o un fracaso.

---

*(Última actualización: Marzo 2026. Este archivo debe ser actualizado de forma consistente cada que se suba una función vital, componente o nuevo microservicio en la app.)*
