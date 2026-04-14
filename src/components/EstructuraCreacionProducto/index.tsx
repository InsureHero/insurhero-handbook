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
  const viewBoxHeight = 1300;

  // Organización por niveles verticales
  const niveles = [
    {
      id: 'Canal',
      titulo: 'CANAL',
      icono: '🔵',
      color: '#01579b',
      x: 590,
      y: 50,
      width: 220,
      height: 170,
      descripcion: 'Configuración Base',
      campos: [
        'Moneda de operación',
        'País de operación',
        'Zona horaria IANA (reportes/skills)',
        'API Key automática',
        'Estado del canal',
      ]
    },
    {
      id: 'Coverage',
      titulo: 'COBERTURA',
      icono: '🔴',
      color: '#880e4f',
      x: 200,
      y: 280,
      width: 280,
      height: 180,
      descripcion: 'Tipo básico de seguro',
      campos: ['Tipo básico de seguro', 'Número del asegurador', 'Categoría (Auto, Vida, etc.)', 'Vinculada a aseguradora', 'Identificador externo']
    },
    {
      id: 'Variant',
      titulo: 'VARIANTE',
      icono: '🟢',
      color: '#1b5e20',
      x: 920,
      y: 280,
      width: 280,
      height: 220,
      descripcion: 'Versión con precios y límites',
      campos: ['Precio dinámico (fórmulas)', 'Impuestos configurables', 'Margen de ganancia', 'Datos requeridos del cliente', 'Límites de cobertura', 'Datos para reclamos']
    },
    {
      id: 'Package',
      titulo: 'PAQUETE',
      icono: '🟠',
      color: '#e65100',
      x: 200,
      y: 540,
      width: 280,
      height: 180,
      descripcion: 'Agrupa variantes',
      campos: ['Agrupa múltiples variantes', 'Reglas de facturación', 'Pago único o recurrente', 'Puede incluir varias coberturas', 'Combo de servicios']
    },
    {
      id: 'Product',
      titulo: 'PRODUCTO',
      icono: '🟣',
      color: '#4a148c',
      x: 920,
      y: 540,
      width: 280,
      height: 200,
      descripcion: 'Listo para vender',
      campos: ['Código único identificador', 'Agrupa múltiples paquetes', 'Características especiales', 'Estados del ciclo de vida', 'Configuraciones personalizadas', 'Listo para vender']
    },
    {
      id: 'Policy',
      titulo: 'PÓLIZA',
      icono: '📄',
      color: '#4caf50',
      x: 200,
      y: 780,
      width: 1000,
      height: 200,
      descripcion: 'Contrato individual - Se crea cuando un cliente compra',
      campos: ['Número único de póliza', 'Cliente titular del seguro', 'Snapshot del producto', 'Precio total calculado', 'Datos reales del asegurado', 'Versión del contrato']
    }
  ];

  const relaciones = [
    { desde: 'Canal', hasta: 'Coverage', label: 'requiere', estilo: 'dashed', vertical: true },
    { desde: 'Coverage', hasta: 'Variant', label: '1:N', tipo: 'directa', vertical: false },
    { desde: 'Variant', hasta: 'Package', label: 'N:M', tipo: 'directa', vertical: true },
    { desde: 'Package', hasta: 'Product', label: 'N:M', tipo: 'directa', vertical: false },
    { desde: 'Product', hasta: 'Policy', label: '1:N', tipo: 'directa', vertical: true }
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
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 12 3, 0 6" fill="#01579b" />
            </marker>
            <linearGradient id="structureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#01579b" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#4a148c" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#4caf50" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Fondo con gradiente */}
          <rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#structureGradient)" />

          {/* Título */}
          <text
            x={viewBoxWidth / 2}
            y="35"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill="#333"
          >
            Estructura Completa de Creación de Productos
          </text>
          <text
            x={viewBoxWidth / 2}
            y="55"
            textAnchor="middle"
            fontSize="14"
            fill="#666"
          >
            Sigue el flujo de arriba hacia abajo → Niveles de configuración
          </text>

          {/* Relaciones */}
          {relaciones.map((rel, index) => {
            const desde = obtenerNivel(rel.desde);
            const hasta = obtenerNivel(rel.hasta);
            
            let startX, startY, endX, endY;
            
            if (rel.vertical) {
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
                {/* Sombra */}
                <line
                  x1={startX + 2}
                  y1={startY + 2}
                  x2={endX + 2}
                  y2={endY + 2}
                  stroke="#000"
                  strokeWidth="4"
                  markerEnd="url(#arrowhead-structure)"
                  strokeDasharray={rel.estilo === 'dashed' ? '10,5' : '0'}
                  opacity="0.1"
                />
                {/* Flecha principal */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={rel.estilo === 'dashed' ? '#01579b' : '#4caf50'}
                  strokeWidth="4"
                  markerEnd="url(#arrowhead-structure)"
                  strokeDasharray={rel.estilo === 'dashed' ? '10,5' : '0'}
                  opacity="0.8"
                />
                {/* Etiqueta */}
                <rect
                  x={rel.vertical ? (startX + endX) / 2 - 25 : (startX + endX) / 2 - 25}
                  y={rel.vertical ? (startY + endY) / 2 - 10 : startY - 15}
                  width="50"
                  height="20"
                  rx="4"
                  fill="#fff"
                  stroke={rel.estilo === 'dashed' ? '#01579b' : '#4caf50'}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x={(startX + endX) / 2}
                  y={rel.vertical ? (startY + endY) / 2 + 5 : startY}
                  textAnchor="middle"
                  fontSize="11"
                  fill={rel.estilo === 'dashed' ? '#01579b' : '#4caf50'}
                  fontWeight="bold"
                >
                  {rel.label}
                </text>
              </g>
            );
          })}

          {/* Niveles */}
          {niveles.map((nivel, index) => (
            <g key={nivel.id}>
              {/* Sombra */}
              <rect
                x={nivel.x + 5}
                y={nivel.y + 5}
                width={nivel.width}
                height={nivel.height}
                rx="12"
                fill="#000"
                opacity="0.1"
              />
              
              {/* Rectángulo principal */}
              <rect
                x={nivel.x}
                y={nivel.y}
                width={nivel.width}
                height={nivel.height}
                rx="12"
                fill={nivel.color}
                stroke="#fff"
                strokeWidth="3"
              />
              
              {/* Encabezado destacado */}
              <rect
                x={nivel.x}
                y={nivel.y}
                width={nivel.width}
                height="50"
                rx="12"
                fill="rgba(255,255,255,0.25)"
              />
              
              {/* Número de orden (solo para los primeros 5) */}
              {index < 5 && (
                <circle
                  cx={nivel.x + 35}
                  cy={nivel.y + 35}
                  r="18"
                  fill="#fff"
                  stroke={nivel.color}
                  strokeWidth="2"
                />
              )}
              {index < 5 && (
                <text
                  x={nivel.x + 35}
                  y={nivel.y + 40}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill={nivel.color}
                >
                  {index}
                </text>
              )}
              
              {/* Título */}
              <text
                x={nivel.x + nivel.width / 2}
                y={nivel.y + 32}
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
                y={nivel.y + 70}
                textAnchor="middle"
                fontSize="11"
                fill="#fff"
                opacity="0.95"
              >
                {nivel.descripcion}
              </text>
              
              {/* Separador */}
              <line
                x1={nivel.x + 15}
                y1={nivel.y + 80}
                x2={nivel.x + nivel.width - 15}
                y2={nivel.y + 80}
                stroke="#fff"
                strokeWidth="1"
                opacity="0.3"
              />
              
              {/* Campos */}
              {nivel.campos.flatMap((campo, idx) => {
                // Dividir texto largo en múltiples líneas si es necesario
                const maxLength = 38;
                const lines = campo.length > maxLength 
                  ? [campo.substring(0, maxLength), campo.substring(maxLength)]
                  : [campo];
                
                return lines.map((line, lineIdx) => {
                  // Calcular posición Y considerando todas las líneas anteriores
                  let yOffset = 100;
                  for (let i = 0; i < idx; i++) {
                    const prevCampo = nivel.campos[i];
                    const prevLines = prevCampo.length > maxLength ? 2 : 1;
                    yOffset += prevLines * 18;
                  }
                  yOffset += lineIdx * 14;
                  
                  return (
                    <text
                      key={`${idx}-${lineIdx}`}
                      x={nivel.x + 12}
                      y={nivel.y + yOffset}
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
          ))}

          {/* Leyenda de orden en la parte inferior */}
          <g>
            <rect
              x={50}
              y={viewBoxHeight - 200}
              width={viewBoxWidth - 100}
              height="180"
              rx="10"
              fill="#fff"
              stroke="#01579b"
              strokeWidth="2"
            />
            <text
              x={viewBoxWidth / 2}
              y={viewBoxHeight - 175}
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill="#01579b"
            >
              💡 Orden de Creación (de arriba hacia abajo)
            </text>
            <text x={80} y={viewBoxHeight - 145} fontSize="13" fill="#333">
              <tspan fontWeight="bold" fill="#01579b">0. Canal:</tspan> Configuración inicial (moneda, país) - <tspan fill="#999">Inmutable</tspan>
            </text>
            <text x={80} y={viewBoxHeight - 125} fontSize="13" fill="#333">
              <tspan fontWeight="bold" fill="#880e4f">1. Cobertura:</tspan> Define el tipo básico de seguro (ej: "Seguro de Auto")
            </text>
            <text x={80} y={viewBoxHeight - 105} fontSize="13" fill="#333">
              <tspan fontWeight="bold" fill="#1b5e20">2. Variante:</tspan> Crea versiones con precios específicos (ej: "Básico $500", "Premium $1000")
            </text>
            <text x={80} y={viewBoxHeight - 85} fontSize="13" fill="#333">
              <tspan fontWeight="bold" fill="#e65100">3. Paquete:</tspan> Agrupa varias variantes en un "combo" (ej: "Paquete Completo" con auto + robo)
            </text>
            <text x={700} y={viewBoxHeight - 145} fontSize="13" fill="#333">
              <tspan fontWeight="bold" fill="#4a148c">4. Producto:</tspan> Agrupa paquetes y define características generales (listo para vender)
            </text>
            <text x={700} y={viewBoxHeight - 125} fontSize="13" fill="#333">
              <tspan fontWeight="bold" fill="#4caf50">5. Póliza:</tspan> Se emite cuando un cliente compra el producto (contrato individual)
            </text>
            <text x={700} y={viewBoxHeight - 105} fontSize="12" fill="#666" fontStyle="italic">
              ⚠️ Importante: La moneda y país del canal no se pueden cambiar después de crearlo
            </text>
            <text x={700} y={viewBoxHeight - 85} fontSize="12" fill="#666" fontStyle="italic">
              📋 Las relaciones N:M usan tablas intermedias (packages_variants, products_packages)
            </text>
            <text x={700} y={viewBoxHeight - 65} fontSize="12" fill="#666" fontStyle="italic">
              💡 Usa el zoom para ver mejor los detalles de cada elemento
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default EstructuraCreacionProducto;
