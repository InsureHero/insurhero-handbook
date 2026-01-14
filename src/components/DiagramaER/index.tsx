import React, { useState, useRef, useEffect } from 'react';
import styles from './styles.module.css';

interface Campo {
  nombre: string;
  tipo: string;
  descripcion?: string;
  esPK?: boolean;
  esFK?: boolean;
  referencia?: string;
}

interface Entidad {
  nombre: string;
  campos: Campo[];
  posicion: { x: number; y: number };
  color: string;
  icono?: string;
}

interface Relacion {
  desde: string;
  hasta: string;
  tipo: string;
  label: string;
  estilo?: 'solid' | 'dashed';
  color?: string;
}

const DiagramaER: React.FC = () => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const entidades: Entidad[] = [
    {
      nombre: 'CHANNEL',
      icono: '🔵',
      color: '#01579b',
      posicion: { x: 100, y: 100 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'currency_id', tipo: 'uuid', esFK: true, referencia: 'CURRENCY', descripcion: '🔑 Moneda (no modificable)' },
        { nombre: 'country_id', tipo: 'uuid', esFK: true, referencia: 'COUNTRY', descripcion: '🌍 País (no modificable)' },
        { nombre: 'name', tipo: 'text' },
        { nombre: 'api_key', tipo: 'uuid' },
        { nombre: 'status', tipo: 'text' },
        { nombre: 'email', tipo: 'text' },
        { nombre: 'phone_number', tipo: 'text' },
        { nombre: 'is_broker', tipo: 'boolean' },
        { nombre: 'allow_handshake', tipo: 'boolean' },
        { nombre: 'allow_ia', tipo: 'boolean' },
      ]
    },
    {
      nombre: 'PRODUCT',
      icono: '🟣',
      color: '#4a148c',
      posicion: { x: 500, y: 100 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'channel_id', tipo: 'uuid', esFK: true, referencia: 'CHANNEL' },
        { nombre: 'code', tipo: 'text', descripcion: 'Código único' },
        { nombre: 'pricing', tipo: 'jsonb', descripcion: '💰 Configuración de precios' },
        { nombre: 'features', tipo: 'jsonb', descripcion: '⚙️ Características' },
        { nombre: 'lifecycle', tipo: 'jsonb', descripcion: '🔄 Ciclo de vida' },
        { nombre: 'overrides', tipo: 'jsonb', descripcion: '🔧 Modificaciones' },
      ]
    },
    {
      nombre: 'PACKAGE',
      icono: '🟠',
      color: '#e65100',
      posicion: { x: 900, y: 100 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'channel_id', tipo: 'uuid', esFK: true, referencia: 'CHANNEL' },
        { nombre: 'name', tipo: 'text' },
        { nombre: 'description', tipo: 'text' },
        { nombre: 'pricing_rules', tipo: 'jsonb', descripcion: '📋 Reglas de precios' },
      ]
    },
    {
      nombre: 'PRODUCT_PACKAGE',
      icono: '🔷',
      color: '#546e7a',
      posicion: { x: 700, y: 350 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'product_id', tipo: 'uuid', esFK: true, referencia: 'PRODUCT' },
        { nombre: 'package_id', tipo: 'uuid', esFK: true, referencia: 'PACKAGE' },
        { nombre: 'channel_id', tipo: 'uuid', esFK: true, referencia: 'CHANNEL' },
      ]
    },
    {
      nombre: 'VARIANT',
      icono: '🟢',
      color: '#1b5e20',
      posicion: { x: 100, y: 600 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'channel_id', tipo: 'uuid', esFK: true, referencia: 'CHANNEL' },
        { nombre: 'coverage_id', tipo: 'uuid', esFK: true, referencia: 'COVERAGE' },
        { nombre: 'name', tipo: 'text' },
        { nombre: 'gross_price', tipo: 'text', descripcion: '💰 Expresión matemática' },
        { nombre: 'taxes', tipo: 'jsonb', descripcion: '💸 Impuestos' },
        { nombre: 'pricing_rules', tipo: 'jsonb', descripcion: '📋 Reglas de precios' },
        { nombre: 'pricing_type', tipo: 'text', descripcion: 'one_time | recurring' },
        { nombre: 'markup', tipo: 'jsonb', descripcion: '📈 Margen de ganancia' },
        { nombre: 'coverage_limits', tipo: 'numeric' },
        { nombre: 'deductible', tipo: 'text' },
        { nombre: 'conditions', tipo: 'text' },
        { nombre: 'exclusions', tipo: 'text' },
        { nombre: 'subject_schema', tipo: 'jsonb', descripcion: '📝 Esquema del sujeto' },
        { nombre: 'claim_schema', tipo: 'jsonb', descripcion: '📋 Esquema de reclamos' },
      ]
    },
    {
      nombre: 'COVERAGE',
      icono: '🔴',
      color: '#880e4f',
      posicion: { x: 500, y: 600 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'channel_id', tipo: 'uuid', esFK: true, referencia: 'CHANNEL' },
        { nombre: 'insurer_id', tipo: 'uuid', esFK: true, referencia: 'INSURER' },
        { nombre: 'name', tipo: 'text' },
        { nombre: 'description', tipo: 'text' },
        { nombre: 'insurer_coverage_number', tipo: 'text' },
        { nombre: 'type', tipo: 'text' },
        { nombre: 'metadata', tipo: 'jsonb' },
      ]
    },
    {
      nombre: 'PACKAGE_VARIANT',
      icono: '🔶',
      color: '#6d4c41',
      posicion: { x: 900, y: 600 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'package_id', tipo: 'uuid', esFK: true, referencia: 'PACKAGE' },
        { nombre: 'variant_id', tipo: 'uuid', esFK: true, referencia: 'VARIANT' },
        { nombre: 'channel_id', tipo: 'uuid', esFK: true, referencia: 'CHANNEL' },
      ]
    },
    {
      nombre: 'CURRENCY',
      icono: '💰',
      color: '#f57f17',
      posicion: { x: 100, y: 1100 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'code', tipo: 'text' },
        { nombre: 'name', tipo: 'text' },
        { nombre: 'symbol', tipo: 'text' },
      ]
    },
    {
      nombre: 'COUNTRY',
      icono: '🌍',
      color: '#f57f17',
      posicion: { x: 500, y: 1100 },
      campos: [
        { nombre: 'id', tipo: 'uuid', esPK: true },
        { nombre: 'code', tipo: 'text' },
        { nombre: 'name', tipo: 'text' },
      ]
    },
  ];

  const relaciones: Relacion[] = [
    { desde: 'CHANNEL', hasta: 'PRODUCT', tipo: '1:N', label: 'tiene', color: '#666' },
    { desde: 'CHANNEL', hasta: 'PACKAGE', tipo: '1:N', label: 'tiene', color: '#666' },
    { desde: 'CHANNEL', hasta: 'VARIANT', tipo: '1:N', label: 'tiene', color: '#666' },
    { desde: 'CHANNEL', hasta: 'COVERAGE', tipo: '1:N', label: 'tiene', color: '#666' },
    { desde: 'CHANNEL', hasta: 'CURRENCY', tipo: 'N:1', label: 'usa', color: '#f57f17', estilo: 'dashed' },
    { desde: 'CHANNEL', hasta: 'COUNTRY', tipo: 'N:1', label: 'opera_en', color: '#f57f17', estilo: 'dashed' },
    { desde: 'PRODUCT', hasta: 'PRODUCT_PACKAGE', tipo: '1:N', label: 'contiene', color: '#666' },
    { desde: 'PACKAGE', hasta: 'PRODUCT_PACKAGE', tipo: '1:N', label: 'pertenece_a', color: '#666' },
    { desde: 'PACKAGE', hasta: 'PACKAGE_VARIANT', tipo: '1:N', label: 'incluye', color: '#666' },
    { desde: 'VARIANT', hasta: 'PACKAGE_VARIANT', tipo: '1:N', label: 'pertenece_a', color: '#666' },
    { desde: 'COVERAGE', hasta: 'VARIANT', tipo: '1:N', label: 'tiene', color: '#666' },
  ];

  const calcularCentro = (entidad: Entidad) => {
    const ancho = 320;
    const alto = 60 + entidad.campos.length * 22;
    return {
      x: entidad.posicion.x + ancho / 2,
      y: entidad.posicion.y + alto / 2
    };
  };

  const obtenerEntidad = (nombre: string) => entidades.find(e => e.nombre === nombre)!;

  const renderEntidad = (entidad: Entidad) => {
    const ancho = 320;
    const alto = 60 + entidad.campos.length * 22;

    return (
      <g key={entidad.nombre}>
        {/* Rectángulo principal */}
        <rect
          x={entidad.posicion.x}
          y={entidad.posicion.y}
          width={ancho}
          height={alto}
          rx="8"
          fill={entidad.color}
          stroke="#333"
          strokeWidth="2"
          className={styles.entidadBox}
        />
        
        {/* Título */}
        <rect
          x={entidad.posicion.x}
          y={entidad.posicion.y}
          width={ancho}
          height="40"
          rx="8"
          fill="rgba(0,0,0,0.2)"
        />
        <text
          x={entidad.posicion.x + ancho / 2}
          y={entidad.posicion.y + 28}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#fff"
        >
          {entidad.icono} {entidad.nombre}
        </text>
        
        {/* Campos */}
        {entidad.campos.map((campo, index) => {
          const y = entidad.posicion.y + 60 + index * 22;
          const esPK = campo.esPK;
          const esFK = campo.esFK;
          
          return (
            <g key={index}>
              <text
                x={entidad.posicion.x + 10}
                y={y}
                fontSize="11"
                fill="#fff"
                fontWeight={esPK ? 'bold' : 'normal'}
              >
                {esPK && '🔑 '}
                {esFK && '🔗 '}
                <tspan fontWeight="bold">{campo.nombre}</tspan>
                <tspan opacity="0.8">: {campo.tipo}</tspan>
                {campo.descripcion && (
                  <tspan opacity="0.7"> - {campo.descripcion}</tspan>
                )}
                {campo.referencia && (
                  <tspan opacity="0.6" fontSize="9"> → {campo.referencia}</tspan>
                )}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderRelacion = (relacion: Relacion) => {
    const desde = obtenerEntidad(relacion.desde);
    const hasta = obtenerEntidad(relacion.hasta);
    const centroDesde = calcularCentro(desde);
    const centroHasta = calcularCentro(hasta);

    // Calcular punto de conexión en el borde de las entidades
    const dx = centroHasta.x - centroDesde.x;
    const dy = centroHasta.y - centroDesde.y;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    const radio = 160; // Radio aproximado de la entidad
    
    const puntoDesde = {
      x: centroDesde.x + (dx / distancia) * radio,
      y: centroDesde.y + (dy / distancia) * radio
    };
    
    const puntoHasta = {
      x: centroHasta.x - (dx / distancia) * radio,
      y: centroHasta.y - (dy / distancia) * radio
    };

    return (
      <g key={`${relacion.desde}-${relacion.hasta}`}>
        <line
          x1={puntoDesde.x}
          y1={puntoDesde.y}
          x2={puntoHasta.x}
          y2={puntoHasta.y}
          stroke={relacion.color || '#666'}
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          strokeDasharray={relacion.estilo === 'dashed' ? '5,5' : '0'}
          opacity="0.7"
        />
        <text
          x={(puntoDesde.x + puntoHasta.x) / 2}
          y={(puntoDesde.y + puntoHasta.y) / 2 - 5}
          textAnchor="middle"
          fontSize="10"
          fill={relacion.color || '#666'}
          fontWeight="bold"
          className={styles.labelRelacion}
        >
          {relacion.label}
        </text>
        <text
          x={(puntoDesde.x + puntoHasta.x) / 2}
          y={(puntoDesde.y + puntoHasta.y) / 2 + 10}
          textAnchor="middle"
          fontSize="9"
          fill={relacion.color || '#666'}
          opacity="0.8"
        >
          ({relacion.tipo})
        </text>
      </g>
    );
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(2, zoom * delta));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) { // Botón izquierdo
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(2, prev * 1.2));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(0.5, prev * 0.8));
  };

  // Calcular el viewBox dinámicamente basado en las posiciones de las entidades
  const maxX = Math.max(...entidades.map(e => e.posicion.x + 320));
  const maxY = Math.max(...entidades.map(e => e.posicion.y + 60 + e.campos.length * 22));
  const viewBoxWidth = Math.max(1400, maxX + 100);
  const viewBoxHeight = Math.max(1300, maxY + 200);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h3>Diagrama de Relaciones (Entity Relationship)</h3>
        <p className={styles.descripcion}>
          Este diagrama muestra todas las tablas de la base de datos, sus campos, tipos de datos y las relaciones entre ellas.
          Las relaciones están etiquetadas con su cardinalidad (1:N, N:M, N:1).
        </p>
        <div className={styles.controls}>
          <button onClick={zoomIn} className={styles.controlButton} title="Acercar">
            🔍+
          </button>
          <button onClick={zoomOut} className={styles.controlButton} title="Alejar">
            🔍-
          </button>
          <button onClick={resetView} className={styles.controlButton} title="Restablecer vista">
            🏠
          </button>
          <span className={styles.zoomLevel}>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
        <p className={styles.instrucciones}>
          💡 Usa la rueda del mouse para hacer zoom. Arrastra con el botón izquierdo para mover el diagrama.
        </p>
      </div>
      <div className={styles.svgContainer}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className={styles.diagrama}
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
        <rect width="1200" height="900" fill="#f8f9fa" />
        
        {/* Título */}
        <text
          x="600"
          y="30"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fill="#333"
        >
          Modelo de Datos - InsureHero
        </text>
        
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
        
        {/* Renderizar relaciones primero (para que queden detrás) */}
        {relaciones.map(renderRelacion)}
        
        {/* Renderizar entidades */}
        {entidades.map(renderEntidad)}
        
        {/* Leyenda */}
        <g>
          <rect
            x="50"
            y={viewBoxHeight - 100}
            width="1100"
            height="80"
            rx="8"
            fill="#fff"
            stroke="#ddd"
            strokeWidth="1"
          />
          <text
            x="600"
            y={viewBoxHeight - 75}
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill="#333"
          >
            Leyenda
          </text>
          <text x="80" y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">🔑</tspan> - Primary Key (PK)
          </text>
          <text x="250" y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">🔗</tspan> - Foreign Key (FK)
          </text>
          <text x="450" y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">1:N</tspan> - Uno a Muchos
          </text>
          <text x="600" y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">N:M</tspan> - Muchos a Muchos
          </text>
          <text x="750" y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold">N:1</tspan> - Muchos a Uno
          </text>
          <text x="900" y={viewBoxHeight - 50} fontSize="12" fill="#666">
            <tspan fontWeight="bold" fill="#f57f17">---</tspan> - Relación con CURRENCY/COUNTRY
          </text>
        </g>
      </svg>
      </div>
      
      {/* Descripción detallada de relaciones */}
      <div className={styles.detalles}>
        <h4>Descripción de Relaciones</h4>
        <ul>
          <li><strong>CHANNEL → PRODUCT (1:N):</strong> Un canal puede tener múltiples productos.</li>
          <li><strong>CHANNEL → PACKAGE (1:N):</strong> Un canal puede tener múltiples paquetes.</li>
          <li><strong>CHANNEL → VARIANT (1:N):</strong> Un canal puede tener múltiples variantes.</li>
          <li><strong>CHANNEL → COVERAGE (1:N):</strong> Un canal puede tener múltiples coberturas.</li>
          <li><strong>CHANNEL → CURRENCY (N:1):</strong> Un canal usa una moneda específica (no modificable después de la creación).</li>
          <li><strong>CHANNEL → COUNTRY (N:1):</strong> Un canal opera en un país específico (no modificable después de la creación).</li>
          <li><strong>PRODUCT ↔ PACKAGE (N:M):</strong> Un producto puede tener múltiples paquetes y un paquete puede pertenecer a múltiples productos (a través de PRODUCT_PACKAGE).</li>
          <li><strong>PACKAGE ↔ VARIANT (N:M):</strong> Un paquete puede incluir múltiples variantes y una variante puede pertenecer a múltiples paquetes (a través de PACKAGE_VARIANT).</li>
          <li><strong>COVERAGE → VARIANT (1:N):</strong> Una cobertura puede tener múltiples variantes.</li>
        </ul>
      </div>
    </div>
  );
};

export default DiagramaER;
