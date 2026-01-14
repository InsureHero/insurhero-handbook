import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';

const EstructuraCreacionProducto: React.FC = () => {
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
  const viewBoxHeight = 1000;

  const niveles = [
    {
      id: 'Canal',
      titulo: 'CANAL',
      icono: '🔵',
      color: '#01579b',
      x: 600,
      y: 50,
      width: 200,
      height: 80,
      descripcion: 'Configuración Base',
      campos: ['currency_id (uuid)', 'country_id (uuid)', 'api_key (uuid)', 'status (text)']
    },
    {
      id: 'Coverage',
      titulo: 'COBERTURA',
      icono: '🔴',
      color: '#880e4f',
      x: 200,
      y: 200,
      width: 250,
      height: 120,
      descripcion: 'Tipo básico de seguro',
      campos: ['name (text)', 'insurer_coverage_number (text)', 'type (text)', 'uid (text)']
    },
    {
      id: 'Variant',
      titulo: 'VARIANTE',
      icono: '🟢',
      color: '#1b5e20',
      x: 550,
      y: 200,
      width: 300,
      height: 180,
      descripcion: 'Versión con precios y límites',
      campos: ['gross_price (text)', 'taxes (jsonb)', 'markup (jsonb)', 'subject_schema (jsonb)', 'coverage_limits (numeric)']
    },
    {
      id: 'Package',
      titulo: 'PAQUETE',
      icono: '🟠',
      color: '#e65100',
      x: 950,
      y: 200,
      width: 250,
      height: 120,
      descripcion: 'Agrupa variantes',
      campos: ['name (text)', 'pricing_rules (jsonb)', 'uid (text)', 'N:M con variantes']
    },
    {
      id: 'Product',
      titulo: 'PRODUCTO',
      icono: '🟣',
      color: '#4a148c',
      x: 400,
      y: 450,
      width: 300,
      height: 120,
      descripcion: 'Listo para vender',
      campos: ['code (text)', 'pricing (jsonb)', 'features (jsonb)', 'lifecycle (jsonb)', 'N:M con paquetes']
    },
    {
      id: 'Policy',
      titulo: 'PÓLIZA',
      icono: '📄',
      color: '#4caf50',
      x: 400,
      y: 650,
      width: 300,
      height: 100,
      descripcion: 'Contrato individual',
      campos: ['policy_number (text)', 'holder_id (uuid)', 'product (jsonb snapshot)', 'total_gross_price (text)']
    }
  ];

  const relaciones = [
    { desde: 'Canal', hasta: 'Coverage', label: 'requiere', estilo: 'dashed' },
    { desde: 'Coverage', hasta: 'Variant', label: '1:N', tipo: 'directa' },
    { desde: 'Variant', hasta: 'Package', label: 'N:M', tipo: 'directa' },
    { desde: 'Package', hasta: 'Product', label: 'N:M', tipo: 'directa' },
    { desde: 'Product', hasta: 'Policy', label: '1:N', tipo: 'directa' }
  ];

  const obtenerNivel = (id: string) => niveles.find(n => n.id === id)!;

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Estructura de Creación: Canal → Cobertura → Variante → Paquete → Producto → Póliza</h3>
        <p className={containerStyles.descripcion}>
          Vista completa de cómo se relacionan todos los elementos en el proceso de creación de un producto de seguro.
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
              id="arrowhead-structure"
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
            Estructura Completa de Creación de Productos
          </text>

          {/* Relaciones */}
          {relaciones.map((rel, index) => {
            const desde = obtenerNivel(rel.desde);
            const hasta = obtenerNivel(rel.hasta);
            const centroDesde = {
              x: desde.x + desde.width / 2,
              y: desde.y + desde.height
            };
            const centroHasta = {
              x: hasta.x + hasta.width / 2,
              y: hasta.y
            };
            
            return (
              <g key={index}>
                <line
                  x1={centroDesde.x}
                  y1={centroDesde.y}
                  x2={centroHasta.x}
                  y2={centroHasta.y}
                  stroke="#666"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead-structure)"
                  strokeDasharray={rel.estilo === 'dashed' ? '5,5' : '0'}
                  opacity="0.6"
                />
                <text
                  x={(centroDesde.x + centroHasta.x) / 2}
                  y={(centroDesde.y + centroHasta.y) / 2}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                  fontWeight="bold"
                  className={containerStyles.labelRelacion}
                >
                  {rel.label}
                </text>
              </g>
            );
          })}

          {/* Niveles */}
          {niveles.map((nivel) => (
            <g key={nivel.id}>
              <rect
                x={nivel.x}
                y={nivel.y}
                width={nivel.width}
                height={nivel.height}
                rx="12"
                fill={nivel.color}
                stroke="#333"
                strokeWidth="2"
              />
              
              {/* Título */}
              <rect
                x={nivel.x}
                y={nivel.y}
                width={nivel.width}
                height="40"
                rx="12"
                fill="rgba(0,0,0,0.2)"
              />
              <text
                x={nivel.x + nivel.width / 2}
                y={nivel.y + 28}
                textAnchor="middle"
                fontSize="16"
                fontWeight="bold"
                fill="#fff"
              >
                {nivel.icono} {nivel.titulo}
              </text>
              
              {/* Descripción */}
              <text
                x={nivel.x + nivel.width / 2}
                y={nivel.y + 60}
                textAnchor="middle"
                fontSize="11"
                fill="#fff"
                opacity="0.9"
              >
                {nivel.descripcion}
              </text>
              
              {/* Campos */}
              {nivel.campos.map((campo, idx) => (
                <text
                  key={idx}
                  x={nivel.x + 10}
                  y={nivel.y + 80 + idx * 18}
                  fontSize="10"
                  fill="#fff"
                  opacity="0.85"
                >
                  • {campo}
                </text>
              ))}
            </g>
          ))}

          {/* Nota explicativa */}
          <g>
            <rect
              x={50}
              y={viewBoxHeight - 150}
              width={viewBoxWidth - 100}
              height="130"
              rx="8"
              fill="#fff"
              stroke="#01579b"
              strokeWidth="2"
            />
            <text
              x={viewBoxWidth / 2}
              y={viewBoxHeight - 125}
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#01579b"
            >
              💡 Importante: Orden de Creación
            </text>
            <text x={80} y={viewBoxHeight - 100} fontSize="12" fill="#333">
              <tspan fontWeight="bold">1. Canal:</tspan> Primero configura tu canal con moneda y país (esto no se puede cambiar después)
            </text>
            <text x={80} y={viewBoxHeight - 80} fontSize="12" fill="#333">
              <tspan fontWeight="bold">2. Cobertura:</tspan> Crea el tipo básico de seguro (ej: "Seguro de Auto")
            </text>
            <text x={80} y={viewBoxHeight - 60} fontSize="12" fill="#333">
              <tspan fontWeight="bold">3. Variante:</tspan> Crea versiones de la cobertura con precios específicos (ej: "Básico $500", "Premium $1000")
            </text>
            <text x={700} y={viewBoxHeight - 100} fontSize="12" fill="#333">
              <tspan fontWeight="bold">4. Paquete:</tspan> Agrupa varias variantes en un "combo" (ej: "Paquete Completo" con auto + robo)
            </text>
            <text x={700} y={viewBoxHeight - 80} fontSize="12" fill="#333">
              <tspan fontWeight="bold">5. Producto:</tspan> Agrupa paquetes y define características generales (listo para vender)
            </text>
            <text x={700} y={viewBoxHeight - 60} fontSize="12" fill="#333">
              <tspan fontWeight="bold">6. Póliza:</tspan> Se emite cuando un cliente compra el producto (contrato individual)
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default EstructuraCreacionProducto;
