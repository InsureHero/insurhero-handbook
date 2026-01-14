import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';

const DiagramaJerarquiaVisual: React.FC = () => {
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

  const viewBoxWidth = 1000;
  const viewBoxHeight = 600;

  const nodos = [
    { id: 'A', nombre: 'CANAL', icono: '🔵', color: '#01579b', x: 500, y: 80 },
    { id: 'B', nombre: 'PRODUCTO', icono: '🟣', color: '#4a148c', x: 200, y: 250 },
    { id: 'C', nombre: 'PAQUETE', icono: '🟠', color: '#e65100', x: 800, y: 250 },
    { id: 'D', nombre: 'VARIANTE', icono: '🟢', color: '#1b5e20', x: 350, y: 450 },
    { id: 'E', nombre: 'COBERTURA', icono: '🔴', color: '#880e4f', x: 750, y: 450 },
    { id: 'F', nombre: 'MONEDA', icono: '💰', color: '#f57f17', x: 150, y: 80 },
    { id: 'G', nombre: 'PAÍS', icono: '🌍', color: '#f57f17', x: 850, y: 80 },
  ];

  const relaciones = [
    { desde: 'A', hasta: 'B', label: '1:N', color: '#666' },
    { desde: 'A', hasta: 'C', label: '1:N', color: '#666' },
    { desde: 'A', hasta: 'D', label: '1:N', color: '#666' },
    { desde: 'A', hasta: 'E', label: '1:N', color: '#666' },
    { desde: 'A', hasta: 'F', label: 'usa', color: '#f57f17', estilo: 'dashed' },
    { desde: 'A', hasta: 'G', label: 'opera_en', color: '#f57f17', estilo: 'dashed' },
    { desde: 'B', hasta: 'C', label: 'N:M', color: '#666' },
    { desde: 'C', hasta: 'D', label: 'N:M', color: '#666' },
    { desde: 'E', hasta: 'D', label: '1:N', color: '#666' },
  ];

  const obtenerNodo = (id: string) => nodos.find(n => n.id === id)!;

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Diagrama de Jerarquía Visual</h3>
        <p className={containerStyles.descripcion}>
          Vista gráfica de la estructura jerárquica mostrando las relaciones entre los diferentes niveles.
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
              id="arrowhead-hierarchy"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#666" />
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
            Jerarquía Visual - InsureHero
          </text>

          {/* Relaciones */}
          {relaciones.map((rel, index) => {
            const desde = obtenerNodo(rel.desde);
            const hasta = obtenerNodo(rel.hasta);
            return (
              <g key={index}>
                <line
                  x1={desde.x}
                  y1={desde.y + 30}
                  x2={hasta.x}
                  y2={hasta.y}
                  stroke={rel.color}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead-hierarchy)"
                  strokeDasharray={rel.estilo === 'dashed' ? '5,5' : '0'}
                  opacity="0.6"
                />
                <text
                  x={(desde.x + hasta.x) / 2}
                  y={(desde.y + hasta.y) / 2}
                  textAnchor="middle"
                  fontSize="10"
                  fill={rel.color}
                  fontWeight="bold"
                >
                  {rel.label}
                </text>
              </g>
            );
          })}

          {/* Nodos */}
          {nodos.map((nodo) => (
            <g key={nodo.id}>
              <rect
                x={nodo.x - 80}
                y={nodo.y}
                width="160"
                height="60"
                rx="8"
                fill={nodo.color}
                stroke="#333"
                strokeWidth="2"
              />
              <text
                x={nodo.x}
                y={nodo.y + 35}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#fff"
              >
                {nodo.icono} {nodo.nombre}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default DiagramaJerarquiaVisual;
