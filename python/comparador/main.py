"""
Microservicio de comparación de imágenes vehiculares — v5.

Score compuesto de 3 componentes (mismo vehículo sin daños debe dar >80%):

  A. Histograma HSV (peso 35%)
     - Compara la distribución de color en el espacio HSV
     - Invariante a perspectiva, posición y pequeñas diferencias de escala
     - Muy robusto a cambios de iluminación cuando se normaliza el canal V

  B. Score de matches SIFT (peso 30%)
     - Mide la calidad y cantidad de correspondencias de puntos clave
     - Normalizado al número de features detectados
     - No depende de alineación píxel a píxel

  C. SSIM sobre zona erosionada (peso 35%)
     - Se aplica SOLO sobre el interior de la máscara del vehículo (erosión 20px)
     - Descarta los bordes donde la homografía introduce artefactos
     - Usa imagen alineada con SIFT para minimizar el error de perspectiva

Puerto: 5001
"""

import os
import base64
import traceback

import cv2
import numpy as np
from flask import Flask, request, jsonify
from skimage.metrics import structural_similarity as compare_ssim

app = Flask(__name__)

NEXTJS_PUBLIC = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "public")
)

TARGET_W, TARGET_H = 640, 640

# Pesos del score compuesto
W_HIST  = 0.35
W_MATCH = 0.30
W_SSIM  = 0.35

# Umbrales del score compuesto final
UMBRAL_NORMAL      = 0.72
UMBRAL_ADVERTENCIA = 0.55

# SIFT / alineación
MIN_INLIERS    = 8
RATIO_LOWE     = 0.72
MAX_REPROJ_ERR = 12.0

CLASES_VEHICULO = {2, 3, 5, 7}

MARCO = {
    "FRONTAL":           {"x": 0.05, "y": 0.08, "w": 0.90, "h": 0.78},
    "TRASERA":           {"x": 0.05, "y": 0.08, "w": 0.90, "h": 0.78},
    "LATERAL_IZQUIERDA": {"x": 0.02, "y": 0.22, "w": 0.96, "h": 0.52},
    "LATERAL_DERECHA":   {"x": 0.02, "y": 0.22, "w": 0.96, "h": 0.52},
    "INTERIOR":          {"x": 0.08, "y": 0.12, "w": 0.84, "h": 0.72},
}

# ── YOLO lazy ─────────────────────────────────────────────────────────────────
_yolo = None
def get_yolo():
    global _yolo
    if _yolo is None:
        try:
            from ultralytics import YOLO
            _yolo = YOLO("yolov8n-seg.pt")
            print("✅ YOLOv8-seg listo")
        except Exception as e:
            print(f"⚠️  YOLO no disponible: {e}")
            _yolo = "unavailable"
    return None if _yolo == "unavailable" else _yolo


# ── Helpers básicos ───────────────────────────────────────────────────────────

def cargar_bytes(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Imagen no decodificable")
    return img


def recortar_marco(img: np.ndarray, vista: str) -> np.ndarray:
    if vista not in MARCO:
        return img
    m = MARCO[vista]
    h, w = img.shape[:2]
    y1, y2 = int(m["y"] * h), int((m["y"] + m["h"]) * h)
    x1, x2 = int(m["x"] * w), int((m["x"] + m["w"]) * w)
    crop = img[y1:y2, x1:x2]
    return crop if crop.size > 0 else img


def fit_cuadrado(img: np.ndarray, size=TARGET_W) -> np.ndarray:
    """Redimensiona al tamaño objetivo manteniendo aspect ratio con padding negro."""
    h, w = img.shape[:2]
    scale = min(size / w, size / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((size, size) + img.shape[2:], dtype=img.dtype) if img.ndim == 3 \
             else np.zeros((size, size), dtype=img.dtype)
    yo, xo = (size - nh) // 2, (size - nw) // 2
    canvas[yo:yo + nh, xo:xo + nw] = resized
    return canvas


def normalizar_iluminacion(img_bgr: np.ndarray) -> np.ndarray:
    """
    LAB + CLAHE solo en canal L.
    Devuelve BGR normalizado (necesario para histograma de color correcto).
    """
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_eq  = clahe.apply(l)
    lab_eq = cv2.merge([l_eq, a, b])
    return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)


def a_gris_suave(img_bgr: np.ndarray) -> np.ndarray:
    """Gris + blur gaussiano para suavizar micro-bordes."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return cv2.GaussianBlur(gray, (7, 7), 0)


# ── Segmentación ──────────────────────────────────────────────────────────────

def generar_mascara(img_bgr: np.ndarray) -> np.ndarray:
    """
    YOLO → máscara del vehículo.
    Fallback GrabCut → fallback zona no-negra.
    """
    h, w = img_bgr.shape[:2]
    mascara = np.zeros((h, w), dtype=np.uint8)
    model   = get_yolo()

    if model is not None:
        try:
            results = model(img_bgr, verbose=False, conf=0.20)
            for r in results:
                if r.masks is None:
                    continue
                for i, cls_id in enumerate(r.boxes.cls.cpu().numpy()):
                    if int(cls_id) not in CLASES_VEHICULO:
                        continue
                    m   = r.masks.data[i].cpu().numpy()
                    m_r = cv2.resize(m, (w, h), interpolation=cv2.INTER_NEAREST)
                    mascara = cv2.bitwise_or(mascara, (m_r > 0.5).astype(np.uint8) * 255)
        except Exception as e:
            print(f"Error YOLO: {e}")

    if cv2.countNonZero(mascara) < (h * w * 0.05):
        # GrabCut centrado
        mask_gc = np.zeros((h, w), dtype=np.uint8)
        rect    = (int(w * 0.05), int(h * 0.05), int(w * 0.90), int(h * 0.90))
        bgd     = np.zeros((1, 65), np.float64)
        fgd     = np.zeros((1, 65), np.float64)
        try:
            cv2.grabCut(img_bgr, mask_gc, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
            mascara = np.where(
                (mask_gc == cv2.GC_FGD) | (mask_gc == cv2.GC_PR_FGD), 255, 0
            ).astype(np.uint8)
        except Exception:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            _, mascara = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)

    kern    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
    return cv2.dilate(mascara, kern, iterations=1)


# ── COMPONENTE A: Histograma HSV ──────────────────────────────────────────────

def score_histograma(img_a: np.ndarray, img_b: np.ndarray,
                     mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    """
    Compara histogramas HSV con máscara.
    Método Bhattacharyya (0=idéntico, 1=completamente diferente) → convertido a similitud.
    """
    hsv_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2HSV)
    hsv_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2HSV)

    # Asegurar que las máscaras sean uint8 del mismo tamaño que las imágenes
    h_a, w_a = img_a.shape[:2]
    h_b, w_b = img_b.shape[:2]

    m_a = cv2.resize(mask_a, (w_a, h_a), interpolation=cv2.INTER_NEAREST)
    m_b = cv2.resize(mask_b, (w_b, h_b), interpolation=cv2.INTER_NEAREST)

    # Combinar máscara con zona no-negra (uint8 explícito)
    gray_a = cv2.cvtColor(img_a, cv2.COLOR_BGR2GRAY)
    gray_b = cv2.cvtColor(img_b, cv2.COLOR_BGR2GRAY)
    valid_a = cv2.bitwise_and(m_a, (gray_a > 10).astype(np.uint8) * 255)
    valid_b = cv2.bitwise_and(m_b, (gray_b > 10).astype(np.uint8) * 255)

    ranges   = [0, 180, 0, 256, 0, 256]
    sizes    = [50, 60, 60]
    channels = [0, 1, 2]

    hist_a = cv2.calcHist([hsv_a], channels, valid_a, sizes, ranges)
    hist_b = cv2.calcHist([hsv_b], channels, valid_b, sizes, ranges)

    cv2.normalize(hist_a, hist_a)
    cv2.normalize(hist_b, hist_b)

    dist  = cv2.compareHist(hist_a, hist_b, cv2.HISTCMP_BHATTACHARYYA)
    return float(max(0.0, 1.0 - dist))


# ── COMPONENTE B: Score de matches SIFT ──────────────────────────────────────

def alinear_sift(patron_g: np.ndarray, captura_g: np.ndarray) -> dict:
    """
    SIFT + FLANN + ratio test + RANSAC.
    Devuelve imagen alineada, número de inliers y score de calidad de matches.
    """
    h, w = patron_g.shape
    sift = cv2.SIFT_create(nfeatures=6000, contrastThreshold=0.03)
    kp1, des1 = sift.detectAndCompute(patron_g,  None)
    kp2, des2 = sift.detectAndCompute(captura_g, None)

    base = {"imagen": captura_g, "alineada": False, "matches": 0,
            "inliers": 0, "reproj_error": -1.0, "score_matches": 0.0, "motivo": ""}

    if des1 is None or des2 is None or len(kp1) < 4 or len(kp2) < 4:
        return {**base, "motivo": "sin_descriptores"}

    flann  = cv2.FlannBasedMatcher({"algorithm": 1, "trees": 5}, {"checks": 50})
    knn    = flann.knnMatch(des1, des2, k=2)
    buenos = [m for m, n in knn if m.distance < RATIO_LOWE * n.distance]

    if len(buenos) < MIN_INLIERS:
        return {**base, "motivo": "pocos_matches", "matches": len(buenos)}

    # Score de calidad de matches: proporción de buenos matches respecto al total detectado
    score_matches = min(1.0, len(buenos) / max(len(kp1), len(kp2)) * 8.0)

    src = np.float32([kp2[m.trainIdx].pt for m in buenos]).reshape(-1, 1, 2)
    dst = np.float32([kp1[m.queryIdx].pt for m in buenos]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)

    if H is None:
        return {**base, "motivo": "homografia_nula", "matches": len(buenos),
                "score_matches": score_matches}

    n_in = int(mask.sum()) if mask is not None else 0
    det  = H[0, 0] * H[1, 1] - H[0, 1] * H[1, 0]

    # Validar homografía: determinante positivo y esquinas dentro del rango
    if det <= 0 or n_in < MIN_INLIERS:
        return {**base, "motivo": "homografia_invalida", "matches": len(buenos),
                "inliers": n_in, "score_matches": score_matches}

    corners = np.float32([[0,0],[w,0],[w,h],[0,h]]).reshape(-1,1,2)
    trans   = cv2.perspectiveTransform(corners, H)
    margen  = max(w, h) * 0.65
    if trans is None or any(
        not (-margen < p[0] < w + margen and -margen < p[1] < h + margen)
        for p in trans.reshape(-1, 2)
    ):
        return {**base, "motivo": "homografia_fuera_rango", "matches": len(buenos),
                "inliers": n_in, "score_matches": score_matches}

    inlier_mask = mask.ravel().astype(bool)
    proj  = cv2.perspectiveTransform(src[inlier_mask], H).reshape(-1, 2)
    err   = float(np.mean(np.linalg.norm(proj - dst[inlier_mask].reshape(-1, 2), axis=1)))

    if err > MAX_REPROJ_ERR:
        return {**base, "motivo": f"reproj_alta({err:.1f}px)", "matches": len(buenos),
                "inliers": n_in, "reproj_error": round(err, 2), "score_matches": score_matches}

    alineada = cv2.warpPerspective(captura_g, H, (w, h),
                                   flags=cv2.INTER_LINEAR,
                                   borderMode=cv2.BORDER_REFLECT_101)

    # Score de inliers: normalizado
    score_inliers = min(1.0, n_in / 60.0)
    score_matches_final = (score_matches + score_inliers) / 2.0

    return {"imagen": alineada, "alineada": True, "motivo": "ok",
            "matches": len(buenos), "inliers": n_in, "reproj_error": round(err, 2),
            "score_matches": round(score_matches_final, 4)}


# ── COMPONENTE C: SSIM sobre zona interior del vehículo ──────────────────────

def score_ssim_interior(patron_g: np.ndarray, alineada_g: np.ndarray,
                        mascara: np.ndarray) -> tuple[float, np.ndarray]:
    """
    SSIM sobre la zona erosionada de la máscara.
    Erosionar 20px elimina los bordes donde la homografía introduce artefactos.
    """
    kern_erosion = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))
    mascara_int  = cv2.erode(mascara, kern_erosion, iterations=1)

    # Si la erosión elimina demasiado, usar la máscara sin erodar
    if cv2.countNonZero(mascara_int) < (mascara.size * 0.05):
        mascara_int = mascara

    validos = (mascara_int > 0) & (patron_g > 8) & (alineada_g > 8)
    n_val   = int(validos.sum())

    _, mapa = compare_ssim(patron_g, alineada_g, full=True, data_range=255)

    mapa_vis = mapa.copy()
    mapa_vis[~validos] = 0.85   # zonas excluidas → color neutro en visualización

    if n_val < 500:
        return float(np.mean(mapa[validos])) if n_val > 0 else 0.5, mapa_vis

    return float(np.mean(mapa[validos])), mapa_vis


# ── Hallazgos ─────────────────────────────────────────────────────────────────

def detectar_hallazgos(mapa: np.ndarray, mascara: np.ndarray,
                       patron_g: np.ndarray, alineada_g: np.ndarray) -> list:
    h, w = mapa.shape
    diff = ((1.0 - mapa) > 0.30).astype(np.uint8) * 255
    val  = ((mascara > 0) & (patron_g > 8) & (alineada_g > 8)).astype(np.uint8) * 255
    diff = cv2.bitwise_and(diff, val)
    diff = cv2.GaussianBlur(diff, (5, 5), 0)
    _, diff = cv2.threshold(diff, 127, 255, cv2.THRESH_BINARY)

    kern_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,  5))
    kern_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19))
    diff = cv2.morphologyEx(diff, cv2.MORPH_OPEN,  kern_open,  iterations=2)
    diff = cv2.morphologyEx(diff, cv2.MORPH_CLOSE, kern_close, iterations=1)

    cnts, _ = cv2.findContours(diff, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = []
    for c in cnts:
        area = cv2.contourArea(c)
        if area < (h * w) * 0.005:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        cx, cy = (x + bw / 2) / w, (y + bh / 2) / h
        out.append({
            "componente": _comp(cx, cy),
            "tipo":       "DIFERENCIA_VISUAL",
            "confianza":  round(min(1.0, area / (h * w) * 10), 3),
            "region":     {"x": int(x), "y": int(y), "w": int(bw), "h": int(bh)},
        })
    return out


def _comp(cx: float, cy: float) -> str:
    if cy < 0.30: return "LOGO_FRONTAL"
    if cy > 0.75: return "DEFENSA"
    if cx < 0.20: return "ESPEJO_IZQUIERDO" if cy < 0.55 else "FARO_IZQUIERDO"
    if cx > 0.80: return "ESPEJO_DERECHO"   if cy < 0.55 else "FARO_DERECHO"
    return "OTRO"


def diff_base64(patron_g: np.ndarray, alineada_g: np.ndarray,
                mapa: np.ndarray, mascara: np.ndarray) -> str:
    diff    = ((1.0 - mapa) * 255).astype(np.uint8)
    diff[mascara == 0] = 127
    colored = cv2.applyColorMap(diff, cv2.COLORMAP_JET)
    base    = cv2.cvtColor(alineada_g, cv2.COLOR_GRAY2BGR)
    overlay = cv2.addWeighted(base, 0.55, colored, 0.45, 0)
    _, buf  = cv2.imencode(".jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buf).decode("utf-8")


# ── Pipeline principal ────────────────────────────────────────────────────────

@app.route("/comparar", methods=["POST"])
def comparar():
    try:
        if "foto" not in request.files:
            return jsonify({"error": "Campo 'foto' requerido."}), 400

        foto_bytes  = request.files["foto"].read()
        ruta_patron = request.form.get("ruta_patron", "")
        vista       = request.form.get("vista", "")
        if not ruta_patron:
            return jsonify({"error": "Campo 'ruta_patron' requerido."}), 400

        img_captura = cargar_bytes(foto_bytes)

        ruta_abs = os.path.normpath(os.path.join(NEXTJS_PUBLIC, ruta_patron.lstrip("/")))
        if not os.path.isfile(ruta_abs):
            return jsonify({"error": f"Patrón no encontrado: {ruta_patron}"}), 404
        img_patron = cv2.imread(ruta_abs)
        if img_patron is None:
            return jsonify({"error": "No se pudo leer la imagen patrón."}), 500

        # 1. Recortar patrón al encuadre de la vista
        patron_crop = recortar_marco(img_patron, vista)

        # 2. Normalizar iluminación antes de cualquier otra operación
        patron_norm  = normalizar_iluminacion(patron_crop)
        captura_norm = normalizar_iluminacion(img_captura)

        # 3. Generar máscaras del vehículo
        mascara_p = generar_mascara(patron_norm)
        mascara_c = generar_mascara(captura_norm)

        # 4. fit_con_padding → mismo tamaño cuadrado
        patron_fit   = fit_cuadrado(patron_norm)
        captura_fit  = fit_cuadrado(captura_norm)
        mascara_p_fit = fit_cuadrado(mascara_p)
        mascara_c_fit = fit_cuadrado(mascara_c)
        mascara_comb  = cv2.bitwise_and(mascara_p_fit, mascara_c_fit)

        # 5. COMPONENTE A: Histograma HSV (invariante a perspectiva)
        sa = score_histograma(patron_fit, captura_fit, mascara_p_fit, mascara_c_fit)

        # 6. Preprocesamiento para alineación y SSIM
        gray_patron  = a_gris_suave(patron_fit)
        gray_captura = a_gris_suave(captura_fit)

        # 7. COMPONENTE B: Alineación SIFT + score de matches
        info_alin     = alinear_sift(gray_patron, gray_captura)
        gray_alineada = info_alin["imagen"]
        sb = info_alin["score_matches"]

        # 8. COMPONENTE C: SSIM sobre zona interior del vehículo
        sc, mapa = score_ssim_interior(gray_patron, gray_alineada, mascara_comb)

        # 9. Score compuesto ponderado
        score_final = W_HIST * sa + W_MATCH * sb + W_SSIM * sc

        estado = (
            "NORMAL"      if score_final >= UMBRAL_NORMAL      else
            "ADVERTENCIA" if score_final >= UMBRAL_ADVERTENCIA else
            "CRITICO"
        )

        hallazgos = detectar_hallazgos(mapa, mascara_comb, gray_patron, gray_alineada)
        diff_b64  = diff_base64(gray_patron, gray_alineada, mapa, mascara_comb)

        cobertura = float(cv2.countNonZero(mascara_comb)) / mascara_comb.size

        return jsonify({
            "similitud":   round(score_final, 4),
            "estado":      estado,
            "hallazgos":   hallazgos,
            "imagen_diff": diff_b64,
            "debug": {
                "score_histograma": round(sa, 4),
                "score_matches":    round(sb, 4),
                "score_ssim":       round(sc, 4),
                "alineacion_ok":    info_alin["alineada"],
                "motivo":           info_alin.get("motivo", ""),
                "matches_orb":      info_alin["matches"],
                "inliers":          info_alin["inliers"],
                "reproj_error_px":  info_alin["reproj_error"],
                "cobertura_mascara": round(cobertura, 3),
                "yolo_activo":      get_yolo() is not None,
            },
        })

    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Error interno del comparador."}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "yolo": get_yolo() is not None})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
