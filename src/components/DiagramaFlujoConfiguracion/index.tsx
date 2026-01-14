import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';

const DiagramaFlujoConfiguracion: React.FC = () => {
  const {
    zoom,
    pan,
    isDragging,
    svgRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetView,
    zoomIn,
    zoomOut
  } = useZoomPan();

  const viewBoxWidth = 800;
  const viewBoxHeight = 900;

  const pasos = [
    {
      id: 'Start',
      tipo: 'inicio',
      texto: 'Inicio: Crear Producto',
      x: 400,
      y: 50,
      color: '#4caf50'
    },
    {
      id: 'Channel',
      tipo: 'proceso',
      texto: '🔵 CANAL\nEstablecer Moneda y País',
      x: 400,
      y: 180,
      color: '#e1f5ff',
      detalles: ['Moneda (currency_id)', 'País (country_id)']
    },
    {
      id: 'Product',
      tipo: 'proceso',
      texto: '🟣 PRODUCTO\nConfigurar:',
      x: 400,
      y: 320,
      color: '#f3e5f5',
      detalles: ['Código', 'Pricing JSONB', 'Features', 'Lifecycle', 'Overrides']
    },
    {
      id: 'Package',
      tipo: 'proceso',
      texto: '🟠 PAQUETE\nConfigurar:',
      x: 400,
      y: 480,
      color: '#fff3e0',
      detalles: ['Nombre', 'Descripción', 'Pricing Rules']
    },
    {
      id: 'Variant',
      tipo: 'proceso',
      texto: '🟢 VARIANTE\nConfigurar:',
      x: 400,
      y: 620,
      color: '#e8f5e9',
      detalles: ['Gross Price', 'Taxes', 'Markup', 'Pricing Rules', 'Subject Schema', 'Claim Schema']
    },
    {
      id: 'Coverage',
      tipo: 'proceso',
      texto: '🔴 COBERTURA\nConfigurar:',
      x: 400,
      y: 750,
      color: '#fce4ec',
      detalles: ['Nombre', 'Tipo', 'Número Aseguradora']
    },
    {
      id: 'End',
      tipo: 'fin',
      texto: 'Producto Completo',
      x: 400,
      y: 850,
      color: '#4caf50'
    }
  ];

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Diagrama de Flujo de Configuración</h3>
        <p className={containerStyles.descripcion}>
          Flujo paso a paso para crear y configurar un producto completo en InsureHero.
        </p>
        <ZoomPanControls zoom={zoom} zoomIn={zoomIn} zoomOut={zoomOut} resetView={resetView} />
        <p className={containerStyles.instrucciones}>
          💡 Usa la rueda del mouse para hacer zoom. Arrastra con el botón izquierdo para mover el diagrama.
        </p>
      </div>
      <div className={containerStyles.svgContainer}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className={containerStyles.diagrama}
          xmlns="http://www.w3.org/2000/svg"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <defs>
            <marker
              id="arrowhead-flow"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#333" />
            </marker>
          </defs>

          {/* Fondo */}
          <rect width={viewBoxWidth} height={viewBoxHeight} fill="#f8f9fa" />

          {/* Título */}
          <text
            x={viewBoxWidth / 2}
            y="30"
            textAnchor="middle"
            fontSize="22"
            fontWeight="bold"
            fill="#333"
          >
            Flujo de Configuración de Productos
          </text>

          {/* Flechas entre pasos */}
          {pasos.slice(0, -1).map((paso, index) => {
            const siguiente = pasos[index + 1];
            return (
              <line
                key={`arrow-${index}`}
                x1={paso.x}
                y1={paso.y + (paso.tipo === 'inicio' ? 20 : paso.tipo === 'proceso' ? 60 : 20)}
                x2={siguiente.x}
                y2={siguiente.y}
                stroke="#333"
                strokeWidth="2"
                markerEnd="url(#arrowhead-flow)"
              />
            );
          })}

          {/* Pasos */}
          {pasos.map((paso) => {
            if (paso.tipo === 'inicio' || paso.tipo === 'fin') {
              return (
                <g key={paso.id}>
                  <ellipse
                    cx={paso.x}
                    cy={paso.y}
                    rx="80"
                    ry="20"
                    fill={paso.color}
                    stroke="#333"
                    strokeWidth="2"
                  />
                  <text
                    x={paso.x}
                    y={paso.y + 5}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fill="#fff"
                  >
                    {paso.texto}
                  </text>
                </g>
              );
            }

            const alto = 50 + (paso.detalles?.length || 0) * 15;
            return (
              <g key={paso.id}>
                <rect
                  x={paso.x - 120}
                  y={paso.y}
                  width="240"
                  height={alto}
                  rx="8"
                  fill={paso.color}
                  stroke="#333"
                  strokeWidth="2"
                />
                <text
                  x={paso.x}
                  y={paso.y + 20}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="bold"
                  fill="#333"
                >
                  {paso.texto.split('\n')[0]}
                </text>
                {paso.detalles?.map((detalle, idx) => (
                  <text
                    key={idx}
                    x={paso.x}
                    y={paso.y + 40 + idx * 15}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#555"
                  >
                    • {detalle}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default DiagramaFlujoConfiguracion;
