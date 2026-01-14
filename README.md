# InsureHero - Documentación

Documentación completa de la plataforma InsureHero construida con [Docusaurus](https://docusaurus.io/).

## Estructura de la Documentación

La documentación está organizada en cuatro secciones principales:

### 📐 Arquitectura
- Visión general del sistema
- Estructura del monorepo
- Autenticación y autorización
- Decisiones de diseño

### 🔌 API Reference
- tRPC API (interna)
- Shield API (REST - externa)
- Autenticación y versionado
- Ejemplos de uso

### 💻 Guías de Desarrollo
- Configuración del entorno
- Guía de componentes
- Guía de tRPC
- Mejores prácticas

### 📦 Documentación de Producto
- Funcionalidades del producto
- Módulos del sistema
- Flujos de trabajo
- Usuarios y roles

## Instalación

```bash
yarn install
```

## Desarrollo Local

```bash
yarn start
```

Este comando inicia un servidor de desarrollo local y abre una ventana del navegador. La mayoría de los cambios se reflejan en vivo sin necesidad de reiniciar el servidor.

## Construcción

```bash
yarn build
```

Este comando genera contenido estático en el directorio `build` y puede ser servido usando cualquier servicio de hosting de contenido estático.

## Despliegue

### Usando SSH:

```bash
USE_SSH=true yarn deploy
```

### Sin usar SSH:

```bash
GIT_USER=<Tu usuario de GitHub> yarn deploy
```

Si estás usando GitHub Pages para hosting, este comando es una forma conveniente de construir el sitio web y hacer push a la rama `gh-pages`.

## Estructura de Directorios

```
docs/
├── arquitectura/          # Documentación de arquitectura
├── api-reference/         # Referencia de APIs
├── guias-desarrollo/      # Guías para desarrolladores
└── producto/              # Documentación de producto
```

## Contribuir

Para contribuir a la documentación:

1. Crea una nueva rama
2. Realiza tus cambios
3. Verifica que la documentación se construya correctamente: `yarn build`
4. Crea un Pull Request

## Licencia

Copyright © InsureHero. Todos los derechos reservados.
