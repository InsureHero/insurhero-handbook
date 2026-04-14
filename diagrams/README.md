# Diagramas (Mermaid → SVG)

Los archivos `.mmd` son la **fuente** de los gráficos que se muestran como imágenes en la documentación (`static/img/diagrams/*.svg`). Incluye el **mapa de arquitectura** (`arquitectura-plataforma-integraciones.mmd`: partners → core → orquestador → adaptadores → contrato / errores).

Tras editar un `.mmd`, regenera los SVG:

```bash
yarn diagrams:build
```

Requisitos: `@mermaid-js/mermaid-cli` y `puppeteer` (ya declarados en `package.json`).

Los diagramas usan **colores explícitos** en `themeVariables` (actores, señales, fondo) para buen contraste. En la documentación publicada, **clic en la imagen** amplía el diagrama (zoom).
