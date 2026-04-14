import React from 'react';
import { useZoomPan } from '../shared/useZoomPan';
import ZoomPanControls from '../shared/ZoomPanControls';
import containerStyles from '../shared/DiagramaContainer.module.css';
import styles from './styles.module.css';

interface NivelProps {
  titulo: string;
  icono: string;
  color: string;
  campos: string[];
  posicion: { x: number; y: number };
}

const Nivel: React.FC<NivelProps> = ({ titulo, icono, color, campos, posicion }) => {
  const ancho = 280;
  const alto = 120 + campos.length * 25;

  return (
    <g>
      {/* Rectángulo principal */}
      <rect
        x={posicion.x}
        y={posicion.y}
        width={ancho}
        height={alto}
        rx="12"
        fill={color}
        stroke="#333"
        strokeWidth="2"
        className={styles.nivelBox}
      />
      
      {/* Título */}
      <text
        x={posicion.x + ancho / 2}
        y={posicion.y + 30}
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#fff"
        className={styles.titulo}
      >
        {icono} {titulo}
      </text>
      
      {/* Línea divisoria */}
      <line
        x1={posicion.x + 10}
        y1={posicion.y + 45}
        x2={posicion.x + ancho - 10}
        y2={posicion.y + 45}
        stroke="#fff"
        strokeWidth="1"
        opacity="0.3"
      />
      
      {/* Campos */}
      {campos.map((campo, index) => (
        <text
          key={index}
          x={posicion.x + 15}
          y={posicion.y + 70 + index * 25}
          fontSize="12"
          fill="#fff"
          className={styles.campo}
        >
          • {campo}
        </text>
      ))}
    </g>
  );
};

const EstructuraJerarquica: React.FC = () => {
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

  const niveles = [
    {
      titulo: 'CANAL',
      icono: '🔵',
      color: '#01579b',
      campos: [
        'Moneda (currency_id)',
        'País (country_id)',
        'API Key',
        'Status',
        'Email',
        'Timezone (IANA) · reportes/skills',
      ],
      posicion: { x: 400, y: 100 }
    },
    {
      titulo: 'PRODUCTO',
      icono: '🟣',
      color: '#4a148c',
      campos: ['Código (code)', 'Pricing (JSONB)', 'Features (JSONB)', 'Lifecycle (JSONB)', 'Overrides (JSONB)'],
      posicion: { x: 100, y: 300 }
    },
    {
      titulo: 'PAQUETE',
      icono: '🟠',
      color: '#e65100',
      campos: ['Nombre', 'Descripción', 'Pricing Rules (JSONB)', 'Tipo: one_time/recurring'],
      posicion: { x: 700, y: 300 }
    },
    {
      titulo: 'VARIANTE',
      icono: '🟢',
      color: '#1b5e20',
      campos: ['Gross Price (expresión)', 'Taxes (JSONB)', 'Markup (JSONB)', 'Pricing Rules', 'Subject Schema', 'Claim Schema'],
      posicion: { x: 250, y: 550 }
    },
    {
      titulo: 'COBERTURA',
      icono: '🔴',
      color: '#880e4f',
      campos: ['Nombre', 'Tipo', 'Número Aseguradora', 'Metadata (JSONB)'],
      posicion: { x: 700, y: 550 }
    }
  ];

  // Calcular posiciones centrales de cada nivel para las relaciones
  const calcularCentro = (nivel: typeof niveles[0]) => ({
    x: nivel.posicion.x + 280 / 2,
    y: nivel.posicion.y + (120 + nivel.campos.length * 25) / 2
  });

  const centroCanal = calcularCentro(niveles[0]);
  const centroProducto = calcularCentro(niveles[1]);
  const centroPaquete = calcularCentro(niveles[2]);
  const centroVariante = calcularCentro(niveles[3]);
  const centroCobertura = calcularCentro(niveles[4]);

  const relaciones = [
    { desde: centroCanal, hasta: centroProducto, label: '1:N' },
    { desde: centroCanal, hasta: centroPaquete, label: '1:N' },
    { desde: centroProducto, hasta: centroVariante, label: 'N:M' },
    { desde: centroPaquete, hasta: centroVariante, label: 'N:M' },
    { desde: centroCobertura, hasta: centroVariante, label: '1:N' },
    { desde: centroCanal, hasta: centroCobertura, label: '1:N', estilo: 'dashed' },
  ];

  const maxX = Math.max(...niveles.map(n => n.posicion.x + 280));
  const maxY = Math.max(...niveles.map(n => n.posicion.y + 120 + n.campos.length * 25));
  const viewBoxWidth = Math.max(800, maxX + 100);
  const viewBoxHeight = Math.max(700, maxY + 200);

  return (
    <div className={containerStyles.container}>
      <div className={containerStyles.header}>
        <h3>Vista General de la Estructura</h3>
        <p className={containerStyles.descripcion}>
          Diagrama jerárquico mostrando la relación entre Canal, Producto, Paquete, Variante y Cobertura.
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
          fontSize="24"
          fontWeight="bold"
          fill="#333"
        >
          Estructura Jerárquica InsureHero
        </text>
        
        {/* Relaciones */}
        {relaciones.map((relacion, index) => (
          <g key={index}>
            <line
              x1={relacion.desde.x}
              y1={relacion.desde.y}
              x2={relacion.hasta.x}
              y2={relacion.hasta.y}
              stroke="#666"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              strokeDasharray={relacion.estilo === 'dashed' ? '5,5' : '0'}
              opacity="0.6"
            />
            {relacion.label && (
              <text
                x={(relacion.desde.x + relacion.hasta.x) / 2}
                y={(relacion.desde.y + relacion.hasta.y) / 2 - 5}
                textAnchor="middle"
                fontSize="11"
                fill="#666"
                fontWeight="bold"
                className={styles.labelRelacion}
              >
                {relacion.label}
              </text>
            )}
          </g>
        ))}
        
        {/* Flecha para Moneda */}
        <g>
          <line
            x1={centroCanal.x}
            y1={centroCanal.y - 60}
            x2={110}
            y2={80}
            stroke="#f57f17"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            strokeDasharray="3,3"
            opacity="0.7"
          />
          <text
            x={(centroCanal.x + 110) / 2}
            y={(centroCanal.y - 60 + 80) / 2}
            fontSize="11"
            fill="#f57f17"
            fontWeight="bold"
          >
            usa
          </text>
        </g>
        
        {/* Moneda */}
        <g>
          <rect
            x={100}
            y={20}
            width="120"
            height="60"
            rx="8"
            fill="#fff9c4"
            stroke="#f57f17"
            strokeWidth="2"
          />
          <text
            x={160}
            y={45}
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="#f57f17"
          >
            💰 MONEDA
          </text>
          <text
            x={160}
            y={65}
            textAnchor="middle"
            fontSize="11"
            fill="#666"
          >
            Currency
          </text>
        </g>
        
        {/* País */}
        <g>
          <rect
            x={780}
            y={20}
            width="120"
            height="60"
            rx="8"
            fill="#fff9c4"
            stroke="#f57f17"
            strokeWidth="2"
          />
          <text
            x={840}
            y={45}
            textAnchor="middle"
            fontSize="14"
            fontWeight="bold"
            fill="#f57f17"
          >
            🌍 PAÍS
          </text>
          <text
            x={840}
            y={65}
            textAnchor="middle"
            fontSize="11"
            fill="#666"
          >
            Country
          </text>
        </g>
        
        {/* Flecha para País */}
        <g>
          <line
            x1={centroCanal.x}
            y1={centroCanal.y - 60}
            x2={840}
            y2={80}
            stroke="#f57f17"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            strokeDasharray="3,3"
            opacity="0.7"
          />
          <text
            x={(centroCanal.x + 840) / 2}
            y={(centroCanal.y - 60 + 80) / 2}
            fontSize="11"
            fill="#f57f17"
            fontWeight="bold"
          >
            opera en
          </text>
        </g>
        
        {/* Flecha para Moneda */}
        <g>
          <line
            x1={centroCanal.x}
            y1={centroCanal.y - 60}
            x2={160}
            y2={80}
            stroke="#f57f17"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            strokeDasharray="3,3"
            opacity="0.7"
          />
          <text
            x={(centroCanal.x + 160) / 2}
            y={(centroCanal.y - 60 + 80) / 2}
            fontSize="11"
            fill="#f57f17"
            fontWeight="bold"
          >
            usa
          </text>
        </g>
        
        {/* Definición de flecha */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#666" />
          </marker>
        </defs>
        
        {/* Niveles */}
        {niveles.map((nivel, index) => (
          <Nivel key={index} {...nivel} />
        ))}
        
        {/* Leyenda de relaciones */}
        <g>
          <rect
            x={50}
            y={viewBoxHeight - 100}
            width={viewBoxWidth - 100}
            height="80"
            rx="8"
            fill="#fff"
            stroke="#ddd"
            strokeWidth="1"
          />
          <text
            x={viewBoxWidth / 2}
            y={viewBoxHeight - 75}
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill="#333"
          >
            Leyenda de Relaciones
          </text>
          <text x={80} y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">1:N</tspan> - Uno a Muchos
          </text>
          <text x={250} y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">N:M</tspan> - Muchos a Muchos
          </text>
          <text x={450} y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">1:1</tspan> - Uno a Uno
          </text>
          <text x={600} y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">---</tspan> - Relación directa
          </text>
        </g>
      </svg>
      </div>
    </div>
  );
};

export default EstructuraJerarquica;
