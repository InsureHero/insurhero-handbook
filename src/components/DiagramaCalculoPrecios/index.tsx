import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';

const DiagramaCalculoPrecios: React.FC = () => {
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
  const viewBoxHeight = 450;

  const pasos = [
    {
      id: 'A',
      texto: 'Sujeto Asegurado\nsubject_schema',
      x: 150,
      y: 200,
      color: '#e3f2fd',
      width: 160
    },
    {
      id: 'B',
      texto: 'Evaluar\ngross_price\nexpresión matemática',
      x: 350,
      y: 200,
      color: '#fff3e0',
      width: 160
    },
    {
      id: 'C',
      texto: 'Precio Base\nEj: 1000 + age*50',
      x: 550,
      y: 200,
      color: '#fff3e0',
      width: 160
    },
    {
      id: 'D',
      texto: 'Aplicar\nImpuestos\ntaxes JSONB',
      x: 750,
      y: 200,
      color: '#f3e5f5',
      width: 160
    },
    {
      id: 'E',
      texto: 'Precio + Impuestos',
      x: 950,
      y: 200,
      color: '#f3e5f5',
      width: 160
    },
    {
      id: 'F',
      texto: 'Aplicar\nMarkup\nmarkup JSONB',
      x: 950,
      y: 80,
      color: '#e8f5e9',
      width: 160
    },
    {
      id: 'G',
      texto: '💰 Precio Final Bruto',
      x: 1150,
      y: 80,
      color: '#e8f5e9',
      width: 160
    },
    {
      id: 'H',
      texto: 'Precio Neto\nBruto - Impuestos',
      x: 1150,
      y: 320,
      color: '#e8f5e9',
      width: 160
    }
  ];

  const flechas = [
    { desde: 'A', hasta: 'B' },
    { desde: 'B', hasta: 'C' },
    { desde: 'C', hasta: 'D' },
    { desde: 'D', hasta: 'E' },
    { desde: 'E', hasta: 'F' },
    { desde: 'F', hasta: 'G' },
    { desde: 'E', hasta: 'H' }
  ];

  const obtenerPaso = (id: string) => pasos.find(p => p.id === id)!;

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Diagrama de Cálculo de Precios</h3>
        <p className={containerStyles.descripcion}>
          Proceso paso a paso para calcular el precio final de un producto, desde el sujeto asegurado hasta el precio neto y bruto.
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
              id="arrowhead-price"
              markerWidth="10"
              markerHeight="10"
              refX="9"
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
            Cálculo de Precios - InsureHero
          </text>

          {/* Flechas */}
          {flechas.map((flecha, index) => {
            const desde = obtenerPaso(flecha.desde);
            const hasta = obtenerPaso(flecha.hasta);
            return (
              <line
                key={index}
                x1={desde.x + desde.width / 2}
                y1={desde.y}
                x2={hasta.x - hasta.width / 2}
                y2={hasta.y}
                stroke="#333"
                strokeWidth="2"
                markerEnd="url(#arrowhead-price)"
              />
            );
          })}

          {/* Pasos */}
          {pasos.map((paso) => (
            <g key={paso.id}>
              <rect
                x={paso.x - paso.width / 2}
                y={paso.y - 40}
                width={paso.width}
                height="80"
                rx="8"
                fill={paso.color}
                stroke="#333"
                strokeWidth="2"
              />
              <text
                x={paso.x}
                y={paso.y}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#333"
              >
                {paso.texto.split('\n').map((line, idx) => (
                  <tspan key={idx} x={paso.x} dy={idx === 0 ? 0 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default DiagramaCalculoPrecios;
