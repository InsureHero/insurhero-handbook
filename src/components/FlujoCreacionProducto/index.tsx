import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';

const FlujoCreacionProducto: React.FC = () => {
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
  const viewBoxHeight = 900;

  const pasos = [
    {
      id: 'Canal',
      numero: '0',
      titulo: 'CANAL',
      subtitulo: 'Configuración Base',
      descripcion: 'Establece la moneda y país donde operarás',
      icono: '🔵',
      color: '#01579b',
      x: 500,
      y: 80,
      width: 200,
      height: 100,
      detalles: [
        'currency_id (uuid) - Inmutable',
        'country_id (uuid) - Inmutable',
        'api_key (uuid) - Auto-generado',
        'status, email, phone_number'
      ]
    },
    {
      id: 'Coverage',
      numero: '1',
      titulo: 'COBERTURA',
      subtitulo: 'Paso 1: La Base',
      descripcion: 'Define el tipo básico de seguro',
      icono: '🔴',
      color: '#880e4f',
      x: 100,
      y: 250,
      width: 200,
      height: 140,
      detalles: [
        'name (text) - Requerido',
        'insurer_coverage_number (text) - Requerido',
        'type (text) - Opcional',
        'insurer_id (uuid) - FK',
        'uid (text) - Opcional'
      ]
    },
    {
      id: 'Variant',
      numero: '2',
      titulo: 'VARIANTE',
      subtitulo: 'Paso 2: Define Precios',
      descripcion: 'Crea versiones con precios y límites',
      icono: '🟢',
      color: '#1b5e20',
      x: 400,
      y: 250,
      width: 200,
      height: 180,
      detalles: [
        'name (text) - Requerido',
        'gross_price (text) - Expresión matemática',
        'taxes (jsonb) - Array de impuestos',
        'markup (jsonb) - Margen de ganancia',
        'coverage_limits (numeric)',
        'subject_schema (jsonb) - Requerido',
        'claim_schema (jsonb) - Opcional'
      ]
    },
    {
      id: 'Package',
      numero: '3',
      titulo: 'PAQUETE',
      subtitulo: 'Paso 3: Agrupa Variantes',
      descripcion: 'Combina variantes en un "combo"',
      icono: '🟠',
      color: '#e65100',
      x: 700,
      y: 250,
      width: 200,
      height: 140,
      detalles: [
        'name (text) - Requerido',
        'pricing_rules (jsonb) - Reglas',
        'uid (text) - Opcional',
        'Relación N:M con variantes',
        'Tabla: packages_variants'
      ]
    },
    {
      id: 'Product',
      numero: '4',
      titulo: 'PRODUCTO',
      subtitulo: 'Paso 4: Producto Final',
      descripcion: 'Agrupa paquetes para vender',
      icono: '🟣',
      color: '#4a148c',
      x: 400,
      y: 500,
      width: 200,
      height: 140,
      detalles: [
        'code (text) - Requerido, único',
        'pricing (jsonb) - Configuración',
        'features (jsonb) - Características',
        'lifecycle (jsonb) - Estados',
        'overrides (jsonb) - Modificaciones',
        'Relación N:M con paquetes'
      ]
    },
    {
      id: 'Policy',
      numero: '5',
      titulo: 'PÓLIZA',
      subtitulo: 'Paso 5: Contrato Individual',
      descripcion: 'Emite póliza para un cliente',
      icono: '📄',
      color: '#4caf50',
      x: 400,
      y: 700,
      width: 200,
      height: 120,
      detalles: [
        'policy_number (text) - Requerido, único',
        'holder_id (uuid) - FK a users',
        'product (jsonb) - Snapshot completo',
        'subject_schema (jsonb) - Datos reales',
        'total_gross_price (text) - Calculado',
        'version (smallint) - Versión de póliza'
      ]
    }
  ];

  const flechas = [
    { desde: 'Canal', hasta: 'Coverage', label: 'requiere', estilo: 'dashed' },
    { desde: 'Coverage', hasta: 'Variant', label: '1:N' },
    { desde: 'Variant', hasta: 'Package', label: 'N:M' },
    { desde: 'Package', hasta: 'Product', label: 'N:M' },
    { desde: 'Product', hasta: 'Policy', label: '1:N' }
  ];

  const obtenerPaso = (id: string) => pasos.find(p => p.id === id)!;

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Flujo de Creación de Producto</h3>
        <p className={containerStyles.descripcion}>
          Proceso paso a paso para crear un producto de seguro completo, desde la cobertura base hasta la emisión de una póliza.
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
              id="arrowhead-creation"
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
            Proceso de Creación: De la Cobertura a la Póliza
          </text>

          {/* Flechas */}
          {flechas.map((flecha, index) => {
            const desde = obtenerPaso(flecha.desde);
            const hasta = obtenerPaso(flecha.hasta);
            return (
              <g key={index}>
                <line
                  x1={desde.x + desde.width / 2}
                  y1={desde.y + desde.height}
                  x2={hasta.x + hasta.width / 2}
                  y2={hasta.y}
                  stroke="#333"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead-creation)"
                  strokeDasharray={flecha.estilo === 'dashed' ? '5,5' : '0'}
                  opacity="0.6"
                />
                <text
                  x={(desde.x + hasta.x) / 2 + desde.width / 4}
                  y={(desde.y + hasta.y) / 2 + desde.height / 2}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                  fontWeight="bold"
                  className={containerStyles.labelRelacion}
                >
                  {flecha.label}
                </text>
              </g>
            );
          })}

          {/* Pasos */}
          {pasos.map((paso) => (
            <g key={paso.id}>
              {/* Rectángulo principal */}
              <rect
                x={paso.x}
                y={paso.y}
                width={paso.width}
                height={paso.height}
                rx="12"
                fill={paso.color}
                stroke="#333"
                strokeWidth="2"
              />
              
              {/* Número del paso */}
              <circle
                cx={paso.x + 30}
                cy={paso.y + 30}
                r="20"
                fill="#fff"
                stroke="#333"
                strokeWidth="2"
              />
              <text
                x={paso.x + 30}
                y={paso.y + 35}
                textAnchor="middle"
                fontSize="16"
                fontWeight="bold"
                fill={paso.color}
              >
                {paso.numero}
              </text>

              {/* Título */}
              <text
                x={paso.x + paso.width / 2}
                y={paso.y + 35}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#fff"
              >
                {paso.icono} {paso.titulo}
              </text>

              {/* Subtítulo */}
              <text
                x={paso.x + paso.width / 2}
                y={paso.y + 55}
                textAnchor="middle"
                fontSize="11"
                fill="#fff"
                opacity="0.9"
              >
                {paso.subtitulo}
              </text>

              {/* Descripción */}
              <text
                x={paso.x + paso.width / 2}
                y={paso.y + 75}
                textAnchor="middle"
                fontSize="10"
                fill="#fff"
                opacity="0.8"
              >
                {paso.descripcion}
              </text>

              {/* Detalles */}
              {paso.detalles.map((detalle, idx) => (
                <text
                  key={idx}
                  x={paso.x + 10}
                  y={paso.y + 95 + idx * 15}
                  fontSize="9"
                  fill="#fff"
                  opacity="0.85"
                >
                  • {detalle}
                </text>
              ))}
            </g>
          ))}

          {/* Leyenda de orden */}
          <g>
            <rect
              x={50}
              y={viewBoxHeight - 120}
              width={viewBoxWidth - 100}
              height="100"
              rx="8"
              fill="#fff"
              stroke="#ddd"
              strokeWidth="1"
            />
            <text
              x={viewBoxWidth / 2}
              y={viewBoxHeight - 95}
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#333"
            >
              Orden de Creación
            </text>
            <text x={100} y={viewBoxHeight - 70} fontSize="12" fill="#666">
              <tspan fontWeight="bold">0. Canal:</tspan> Configuración inicial (moneda, país)
            </text>
            <text x={100} y={viewBoxHeight - 50} fontSize="12" fill="#666">
              <tspan fontWeight="bold">1. Cobertura:</tspan> Define el tipo básico de seguro
            </text>
            <text x={100} y={viewBoxHeight - 30} fontSize="12" fill="#666">
              <tspan fontWeight="bold">2. Variante:</tspan> Define precios, límites y condiciones
            </text>
            <text x={550} y={viewBoxHeight - 70} fontSize="12" fill="#666">
              <tspan fontWeight="bold">3. Paquete:</tspan> Agrupa variantes en un "combo"
            </text>
            <text x={550} y={viewBoxHeight - 50} fontSize="12" fill="#666">
              <tspan fontWeight="bold">4. Producto:</tspan> Agrupa paquetes, listo para vender
            </text>
            <text x={550} y={viewBoxHeight - 30} fontSize="12" fill="#666">
              <tspan fontWeight="bold">5. Póliza:</tspan> Contrato individual para un cliente
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default FlujoCreacionProducto;
