import { VistaVehiculo } from '@prisma/client';

export type Vista = VistaVehiculo;

/**
 * Resolución estándar unificada para toma, guardado y comparación de imágenes.
 * 1280 × 960 px (proporción 4:3) — estándar de fotografía e inspección vehicular.
 */
export const RESOLUCION_FOTOS = {
  ancho: 1280,
  alto: 960,
  aspectRatio: '4/3',
  calidadJpeg: 0.92,
} as const;

export const INSTRUCCION_VISTA: Record<Vista, string> = {
  FRONTAL:           'Centra el frente del vehículo',
  TRASERA:           'Centra la parte trasera del vehículo',
  LATERAL_IZQUIERDA: 'Alinea el costado completo del vehículo',
  LATERAL_DERECHA:   'Alinea el costado completo del vehículo',
  INTERIOR:          'Enfoca el habitáculo',
};

/**
 * Calcula un marco de encuadre con relación de aspecto exactamente 4:3 (1280×960)
 * ajustado dinámicamente al contenedor de la pantalla para nunca recortar la imagen.
 */
export function obtenerMarco43(cw: number, ch: number) {
  if (cw <= 0 || ch <= 0) {
    return { x: 4, y: 25, w: 92, h: 50 };
  }

  const marginX = 16; // Margen lateral de 16px para aprovechar el ancho del teléfono
  let w = Math.max(100, cw - marginX * 2);
  let h = w * (3 / 4); // 4:3 -> altura = ancho * 0.75

  // Si por la altura del contenedor sobrepasa el 78% del alto disponible:
  if (h > ch * 0.78) {
    h = ch * 0.78;
    w = h * (4 / 3);
  }

  const x = (cw - w) / 2;
  const y = (ch - h) / 2;

  return {
    x: (x / cw) * 100,
    y: (y / ch) * 100,
    w: (w / cw) * 100,
    h: (h / ch) * 100,
  };
}

/**
 * Configuración estática por defecto para fallback
 */
export const marcoConfig: Record<Vista, {
  rect: { x: number; y: number; w: number; h: number };
  instruccion: string;
}> = {
  FRONTAL:           { rect: { x: 4,  y: 25,  w: 92, h: 50 }, instruccion: INSTRUCCION_VISTA.FRONTAL },
  TRASERA:           { rect: { x: 4,  y: 25,  w: 92, h: 50 }, instruccion: INSTRUCCION_VISTA.TRASERA },
  LATERAL_IZQUIERDA: { rect: { x: 4,  y: 25,  w: 92, h: 50 }, instruccion: INSTRUCCION_VISTA.LATERAL_IZQUIERDA },
  LATERAL_DERECHA:   { rect: { x: 4,  y: 25,  w: 92, h: 50 }, instruccion: INSTRUCCION_VISTA.LATERAL_DERECHA },
  INTERIOR:          { rect: { x: 4,  y: 25,  w: 92, h: 50 }, instruccion: INSTRUCCION_VISTA.INTERIOR },
};

/**
 * Calcula qué región del buffer nativo del video es la que realmente se ve en pantalla
 * bajo `object-cover`.
 */
export function calcularAreaVisible(video: HTMLVideoElement, contenedor: HTMLElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = contenedor.clientWidth;
  const ch = contenedor.clientHeight;

  const escala        = Math.max(cw / vw, ch / vh);
  const anchoVisible   = cw / escala;
  const altoVisible    = ch / escala;
  const offsetX        = (vw - anchoVisible) / 2;
  const offsetY        = (vh - altoVisible) / 2;

  return { offsetX, offsetY, anchoVisible, altoVisible };
}

/**
 * Extrae el área encuadrada del video y genera un Blob JPEG a la resolución estándar 1280×960.
 */
export async function capturarFotoEstandar(
  video: HTMLVideoElement,
  contenedor: HTMLElement | null,
  rect: { x: number; y: number; w: number; h: number },
  canvasExistente?: HTMLCanvasElement | null
): Promise<Blob> {
  let cropX: number, cropY: number, cropW: number, cropH: number;

  if (contenedor && video.videoWidth && video.videoHeight) {
    const { offsetX, offsetY, anchoVisible, altoVisible } = calcularAreaVisible(video, contenedor);
    cropX = Math.round(offsetX + (rect.x / 100) * anchoVisible);
    cropY = Math.round(offsetY + (rect.y / 100) * altoVisible);
    cropW = Math.round((rect.w / 100) * anchoVisible);
    cropH = Math.round((rect.h / 100) * altoVisible);
  } else {
    const vw = video.videoWidth  || RESOLUCION_FOTOS.ancho;
    const vh = video.videoHeight || RESOLUCION_FOTOS.alto;
    cropX = Math.round((rect.x / 100) * vw);
    cropY = Math.round((rect.y / 100) * vh);
    cropW = Math.round((rect.w / 100) * vw);
    cropH = Math.round((rect.h / 100) * vh);
  }

  // Asegurar límites dentro del buffer
  cropX = Math.max(0, cropX);
  cropY = Math.max(0, cropY);
  if (video.videoWidth) cropW = Math.min(cropW, video.videoWidth - cropX);
  if (video.videoHeight) cropH = Math.min(cropH, video.videoHeight - cropY);

  const canvas = canvasExistente ?? document.createElement('canvas');
  canvas.width  = RESOLUCION_FOTOS.ancho;
  canvas.height = RESOLUCION_FOTOS.alto;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    video,
    cropX, cropY, cropW, cropH,
    0, 0, RESOLUCION_FOTOS.ancho, RESOLUCION_FOTOS.alto
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Fallo al generar Blob de la imagen')),
      'image/jpeg',
      RESOLUCION_FOTOS.calidadJpeg
    );
  });
}

/**
 * Normaliza cualquier archivo de imagen (ej. subido desde archivo en PC)
 * a la resolución estándar 1280×960 px en formato JPEG sin distorsión.
 */
export async function normalizarArchivoA1280x960(archivo: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(archivo);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width  = RESOLUCION_FOTOS.ancho;
      canvas.height = RESOLUCION_FOTOS.alto;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto 2D'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Ajuste "contain" con fondo negro o escala ajustada
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = RESOLUCION_FOTOS.ancho / RESOLUCION_FOTOS.alto; // 4/3

      let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
      if (imgRatio > targetRatio) {
        srcW = img.naturalHeight * targetRatio;
        srcX = (img.naturalWidth - srcW) / 2;
      } else {
        srcH = img.naturalWidth / targetRatio;
        srcY = (img.naturalHeight - srcH) / 2;
      }

      ctx.drawImage(
        img,
        srcX, srcY, srcW, srcH,
        0, 0, RESOLUCION_FOTOS.ancho, RESOLUCION_FOTOS.alto
      );

      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Error al generar blob normalizado')),
        'image/jpeg',
        RESOLUCION_FOTOS.calidadJpeg
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen para normalizarla'));
    };

    img.src = objectUrl;
  });
}
