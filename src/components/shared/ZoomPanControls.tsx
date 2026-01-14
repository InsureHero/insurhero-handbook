import React from 'react';
import styles from './ZoomPanControls.module.css';

interface ZoomPanControlsProps {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

const ZoomPanControls: React.FC<ZoomPanControlsProps> = ({
  zoom,
  zoomIn,
  zoomOut,
  resetView
}) => {
  return (
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
  );
};

export default ZoomPanControls;
