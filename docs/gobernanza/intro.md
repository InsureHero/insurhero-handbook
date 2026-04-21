---
id: intro
title: Introducción
sidebar_position: 1
---

# Gobernanza Técnica en InsureHero

**Versión:** 1.0
**Alcance:** Monorepo InsureHero (Next.js, Turborepo, Supabase)

## Propósito

Este documento establece el **marco de gobernanza técnica** del monorepo InsureHero. Cubre la arquitectura obligatoria, las convenciones de Git y commits, las reglas que el agente de IA debe respetar, el ciclo de vida del desarrollo asistido y los protocolos de protección de datos.

Aplica tanto al desarrollo humano como al código generado por agentes autónomos (Cursor, Claude Code).

## ¿Por qué gobernanza?

> _"La IA nos da la velocidad, pero la gobernanza nos da la dirección. Sin reglas, solo escalamos el desorden."_
> — Lead Architecture Team, InsureHero

El uso de agentes autónomos (Cursor, Claude Code) en el desarrollo de las tecnologías de InsurHero introduce velocidad pero también riesgo: alucinaciones, violaciones de capas arquitectónicas, exposición de datos sensibles, inconsistencia de estilo. Esta sección define los **raíles operativos** que mantienen la calidad del código asistido por IA al nivel del código humano.

## Estructura de esta sección

La gobernanza se documenta en cinco bloques:

1. **[Arquitectura de 6 Capas (A-F)](./arquitectura-6-capas)** — el marco arquitectónico que todo código (humano o generado) debe respetar.
2. **[Git](./git/conventional-commits)** — Conventional Commits, convenciones de ramas, ambientes y pre-commit hooks.
3. **[Reglas de Cursor](./reglas-cursor/intro)** — los archivos `.mdc` que actúan como restricciones automáticas para el agente.
4. **[Ciclo de Vida del Desarrollo](./ciclo-de-vida)** — el flujo Auditoría → Plan → Review → Build.
5. **[Privacidad y Datos](./privacidad-y-datos)** — Privacy Mode y datos sintéticos obligatorios.

## A quién va dirigido

- **Desarrolladores** que usan Cursor o Claude Code en el monorepo.
- **Tech Leads** que revisan código generado por IA.
- **Nuevos miembros del equipo** durante onboarding técnico.
