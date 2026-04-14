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

  const viewBoxWidth = 1400;
  const viewBoxHeight = 1300;

  // Organización por niveles verticales
  const pasos = [
    {
      id: 'Canal',
      numero: '0',
      titulo: 'CANAL',
      subtitulo: 'Configuración Base',
      descripcion: 'Establece moneda y país (inmutables)',
      icono: '🔵',
      color: '#01579b',
      x: 590,
      y: 50,
      width: 220,
      height: 200,
      detalles: [
        'Define moneda de operación',
        'Establece país de operación',
        '⚠️ Moneda y país NO se pueden cambiar',
        'Timezone IANA (hora local para reportes y skills)',
        'Genera API key automáticamente',
        'Configuración de contacto',
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
      x: 200,
      y: 320,
      width: 240,
      height: 220,
      detalles: [
        'Tipo básico de seguro',
        'Vinculada a una aseguradora',
        'Número único del asegurador',
        'Define categoría (Auto, Vida, etc.)',
        'Base para crear variantes'
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
      x: 960,
      y: 320,
      width: 240,
      height: 240,
      detalles: [
        'Versión específica de la cobertura',
        'Precio dinámico (fórmulas matemáticas)',
        'Impuestos configurables',
        'Margen de ganancia',
        'Límites de cobertura',
        'Define datos requeridos del cliente'
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
      x: 200,
      y: 620,
      width: 240,
      height: 220,
      detalles: [
        'Agrupa múltiples variantes',
        'Define reglas de facturación',
        'Pago único o recurrente',
        'Puede incluir varias coberturas',
        'Combo de servicios'
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
      x: 960,
      y: 620,
      width: 240,
      height: 240,
      detalles: [
        'Código único identificador',
        'Agrupa múltiples paquetes',
        'Características especiales',
        'Estados del ciclo de vida',
        'Configuraciones personalizadas',
        'Listo para vender a clientes'
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
      x: 590,
      y: 900,
      width: 220,
      height: 240,
      detalles: [
        'Número único de póliza',
        'Cliente titular del seguro',
        'Snapshot del producto al momento',
        'Datos reales del asegurado',
        'Precio total calculado',
        'Versión del contrato'
      ]
    }
  ];

  const flechas = [
    { desde: 'Canal', hasta: 'Coverage', label: 'requiere', estilo: 'dashed', vertical: true },
    { desde: 'Coverage', hasta: 'Variant', label: '1:N', estilo: 'solid', vertical: false },
    { desde: 'Variant', hasta: 'Package', label: 'N:M', estilo: 'solid', vertical: true },
    { desde: 'Package', hasta: 'Product', label: 'N:M', estilo: 'solid', vertical: false },
    { desde: 'Product', hasta: 'Policy', label: '1:N', estilo: 'solid', vertical: true }
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
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 12 3, 0 6" fill="#01579b" />
            </marker>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#01579b" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#4a148c" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#4caf50" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Fondo con gradiente de flujo */}
          <rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#flowGradient)" />

          {/* Título */}
          <text
            x={viewBoxWidth / 2}
            y="30"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#333"
          >
            Proceso de Creación: De la Cobertura a la Póliza
          </text>
          <text
            x={viewBoxWidth / 2}
            y="50"
            textAnchor="middle"
            fontSize="14"
            fill="#666"
          >
            Sigue el flujo de arriba hacia abajo → Orden secuencial de creación
          </text>

          {/* Flechas */}
          {flechas.map((flecha, index) => {
            const desde = obtenerPaso(flecha.desde);
            const hasta = obtenerPaso(flecha.hasta);
            
            let startX, startY, endX, endY;
            
            if (flecha.vertical) {
              // Flecha vertical
              startX = desde.x + desde.width / 2;
              startY = desde.y + desde.height;
              endX = hasta.x + hasta.width / 2;
              endY = hasta.y;
            } else {
              // Flecha horizontal
              startX = desde.x + desde.width;
              startY = desde.y + desde.height / 2;
              endX = hasta.x;
              endY = hasta.y + hasta.height / 2;
            }
            
            return (
              <g key={index}>
                {/* Sombra de la flecha */}
                <line
                  x1={startX + 2}
                  y1={startY + 2}
                  x2={endX + 2}
                  y2={endY + 2}
                  stroke="#000"
                  strokeWidth="4"
                  markerEnd="url(#arrowhead-creation)"
                  strokeDasharray={flecha.estilo === 'dashed' ? '8,4' : '0'}
                  opacity="0.1"
                />
                {/* Flecha principal */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={flecha.estilo === 'dashed' ? '#01579b' : '#4caf50'}
                  strokeWidth="3"
                  markerEnd="url(#arrowhead-creation)"
                  strokeDasharray={flecha.estilo === 'dashed' ? '8,4' : '0'}
                  opacity="0.8"
                />
                {/* Etiqueta de relación */}
                <rect
                  x={flecha.vertical ? (startX + endX) / 2 - 20 : (startX + endX) / 2 - 20}
                  y={flecha.vertical ? (startY + endY) / 2 - 10 : startY - 15}
                  width="40"
                  height="20"
                  rx="4"
                  fill="#fff"
                  stroke={flecha.estilo === 'dashed' ? '#01579b' : '#4caf50'}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x={(startX + endX) / 2}
                  y={flecha.vertical ? (startY + endY) / 2 + 5 : startY}
                  textAnchor="middle"
                  fontSize="11"
                  fill={flecha.estilo === 'dashed' ? '#01579b' : '#4caf50'}
                  fontWeight="bold"
                >
                  {flecha.label}
                </text>
              </g>
            );
          })}

          {/* Pasos */}
          {pasos.map((paso) => (
            <g key={paso.id}>
              {/* Sombra del rectángulo */}
              <rect
                x={paso.x + 4}
                y={paso.y + 4}
                width={paso.width}
                height={paso.height}
                rx="12"
                fill="#000"
                opacity="0.1"
              />
              
              {/* Rectángulo principal */}
              <rect
                x={paso.x}
                y={paso.y}
                width={paso.width}
                height={paso.height}
                rx="12"
                fill={paso.color}
                stroke="#fff"
                strokeWidth="3"
              />
              
              {/* Borde destacado superior */}
              <rect
                x={paso.x}
                y={paso.y}
                width={paso.width}
                height="50"
                rx="12"
                fill="rgba(255,255,255,0.2)"
              />
              
              {/* Número del paso en círculo destacado */}
              <circle
                cx={paso.x + 40}
                cy={paso.y + 40}
                r="25"
                fill="#fff"
                stroke={paso.color}
                strokeWidth="3"
              />
              <text
                x={paso.x + 40}
                y={paso.y + 48}
                textAnchor="middle"
                fontSize="20"
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
                fontSize="15"
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
                opacity="0.95"
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
                opacity="0.85"
              >
                {paso.descripcion}
              </text>

              {/* Detalles */}
              <g>
                <line
                  x1={paso.x + 15}
                  y1={paso.y + 85}
                  x2={paso.x + paso.width - 15}
                  y2={paso.y + 85}
                  stroke="#fff"
                  strokeWidth="1"
                  opacity="0.3"
                />
                {paso.detalles.flatMap((detalle, idx) => {
                  // Dividir texto largo en múltiples líneas si es necesario
                  const maxLength = 30;
                  const lines = detalle.length > maxLength 
                    ? [detalle.substring(0, maxLength), detalle.substring(maxLength)]
                    : [detalle];
                  
                  return lines.map((line, lineIdx) => {
                    // Calcular posición Y considerando todas las líneas anteriores
                    let yOffset = 105;
                    for (let i = 0; i < idx; i++) {
                      const prevDetalle = paso.detalles[i];
                      const prevLines = prevDetalle.length > maxLength ? 2 : 1;
                      yOffset += prevLines * 16;
                    }
                    yOffset += lineIdx * 14;
                    
                    return (
                      <text
                        key={`${idx}-${lineIdx}`}
                        x={paso.x + 12}
                        y={paso.y + yOffset}
                        fontSize="9"
                        fill="#fff"
                        opacity="0.9"
                      >
                        {lineIdx === 0 ? '• ' : '  '}{line}
                      </text>
                    );
                  });
                })}
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default FlujoCreacionProducto;
