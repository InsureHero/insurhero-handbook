import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';

const DiagramaCamposPorNivel: React.FC = () => {
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

  const viewBoxWidth = 1400;
  const viewBoxHeight = 1100;

  const niveles = [
    {
      nombre: 'CANAL',
      icono: '🔵',
      color: '#01579b',
      x: 700,
      y: 150,
      campos: [
        { texto: 'currency_id 🔑', x: 450, y: 250 },
        { texto: 'country_id 🌍', x: 650, y: 250 },
        { texto: 'name', x: 550, y: 300 },
        { texto: 'api_key', x: 500, y: 350 },
        { texto: 'status', x: 600, y: 350 },
        { texto: 'email', x: 550, y: 400 }
      ]
    },
    {
      nombre: 'PRODUCTO',
      icono: '🟣',
      color: '#4a148c',
      x: 200,
      y: 550,
      campos: [
        { texto: 'code', x: 80, y: 650 },
        { texto: 'pricing JSONB 💰', x: 200, y: 650 },
        { texto: 'features JSONB ⚙️', x: 80, y: 700 },
        { texto: 'lifecycle JSONB 🔄', x: 200, y: 700 },
        { texto: 'overrides JSONB 🔧', x: 140, y: 750 }
      ]
    },
    {
      nombre: 'PAQUETE',
      icono: '🟠',
      color: '#e65100',
      x: 700,
      y: 550,
      campos: [
        { texto: 'name', x: 600, y: 650 },
        { texto: 'description', x: 700, y: 650 },
        { texto: 'pricing_rules JSONB 📋', x: 650, y: 700 },
        { texto: 'pricing_type', x: 600, y: 750 },
        { texto: 'interval', x: 700, y: 750 },
        { texto: 'billing_cycle', x: 650, y: 800 }
      ]
    },
    {
      nombre: 'VARIANTE',
      icono: '🟢',
      color: '#1b5e20',
      x: 1200,
      y: 550,
      campos: [
        { texto: 'gross_price 💰', x: 1100, y: 650 },
        { texto: 'taxes JSONB 💸', x: 1200, y: 650 },
        { texto: 'markup JSONB 📈', x: 1300, y: 650 },
        { texto: 'pricing_rules JSONB', x: 1100, y: 700 },
        { texto: 'coverage_limits', x: 1200, y: 700 },
        { texto: 'deductible', x: 1300, y: 700 },
        { texto: 'conditions', x: 1100, y: 750 },
        { texto: 'exclusions', x: 1200, y: 750 },
        { texto: 'subject_schema 📝', x: 1100, y: 800 },
        { texto: 'claim_schema 📋', x: 1200, y: 800 }
      ]
    },
    {
      nombre: 'COVERAGE',
      icono: '🔴',
      color: '#880e4f',
      x: 700,
      y: 900,
      campos: [
        { texto: 'name', x: 600, y: 1000 },
        { texto: 'type', x: 700, y: 1000 },
        { texto: 'insurer_coverage_number', x: 800, y: 1000 },
        { texto: 'metadata JSONB', x: 700, y: 1050 }
      ]
    }
  ];

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Diagrama de Campos por Nivel</h3>
        <p className={containerStyles.descripcion}>
          Vista de todos los campos organizados por nivel jerárquico en la estructura de InsureHero.
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
            Campos por Nivel - Estructura InsureHero
          </text>

          {/* Nodo raíz */}
          <g>
            <circle
              cx={viewBoxWidth / 2}
              cy="80"
              r="40"
              fill="#01579b"
              stroke="#333"
              strokeWidth="3"
            />
            <text
              x={viewBoxWidth / 2}
              y="88"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#fff"
            >
              Estructura
              <tspan x={viewBoxWidth / 2} dy="14">InsureHero</tspan>
            </text>
          </g>

          {/* Niveles y campos */}
          {niveles.map((nivel, nivelIndex) => (
            <g key={nivelIndex}>
              {/* Línea desde raíz */}
              <line
                x1={viewBoxWidth / 2}
                y1="120"
                x2={nivel.x}
                y2={nivel.y - 30}
                stroke="#666"
                strokeWidth="2"
                opacity="0.4"
              />
              
              {/* Nodo del nivel */}
              <rect
                x={nivel.x - 80}
                y={nivel.y - 30}
                width="160"
                height="60"
                rx="8"
                fill={nivel.color}
                stroke="#333"
                strokeWidth="2"
              />
              <text
                x={nivel.x}
                y={nivel.y + 5}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#fff"
              >
                {nivel.icono} {nivel.nombre}
              </text>

              {/* Campos del nivel */}
              {nivel.campos.map((campo, campoIndex) => (
                <g key={campoIndex}>
                  {/* Línea desde nivel a campo */}
                  <line
                    x1={nivel.x}
                    y1={nivel.y + 30}
                    x2={campo.x}
                    y2={campo.y - 10}
                    stroke="#999"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                  
                  {/* Campo */}
                  <rect
                    x={campo.x - 60}
                    y={campo.y - 10}
                    width="120"
                    height="20"
                    rx="4"
                    fill="#fff"
                    stroke="#999"
                    strokeWidth="1"
                  />
                  <text
                    x={campo.x}
                    y={campo.y + 5}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#333"
                  >
                    {campo.texto}
                  </text>
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default DiagramaCamposPorNivel;
