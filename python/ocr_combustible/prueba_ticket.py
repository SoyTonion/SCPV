from paddleocr import PaddleOCR
import sys
import os
import re

def main():
    print("\n[1/3] Cargando la IA de PaddleOCR (Versión Estable 2.8.1)...")
    try:
        # use_angle_cls=True ayuda a detectar texto rotado en v2.8.1
        ocr = PaddleOCR(use_angle_cls=True, lang='es')
    except Exception as e:
        print("\nERROR: No se pudo cargar PaddleOCR.")
        print(e)
        sys.exit(1)

    image_path = "ticket.jpg"

    if not os.path.exists(image_path):
        print(f"\nERROR: No encontré la foto del ticket.")
        print(f"Por favor, guarda tu foto como '{image_path}' en esta misma carpeta.")
        sys.exit(1)

    print(f"\n[2/3] Analizando imagen '{image_path}'...")
    
    # Ejecutar OCR
    result = ocr.ocr(image_path, cls=True)

    print("\n[3/3] --- RESULTADO DEL ESCANEO ---\n")
    if not result or not result[0]:
        print("No se detectó texto, la imagen está muy borrosa o es completamente negra.")
    else:
        textos_detectados = []
        for idx, line in enumerate(result[0]):
            texto = line[1][0]
            confianza = line[1][1]
            textos_detectados.append(texto)
            print(f"[{confianza:.2f}] {texto}")
            
        print("\n--- 🎣 EXTRACCIÓN DE DATOS CLAVE ---")
        
        # 1. Buscar Litros (ej: "70.000LTR" o "70.00 Lts")
        litros_encontrados = None
        for t in textos_detectados:
            match_litros = re.search(r'(\d+(?:\.\d+)?)\s*(LTR|LTS|LTS\.|LITROS)', t.upper())
            if match_litros:
                litros_encontrados = match_litros.group(1)
                break
                
        # 2. Buscar Total (generalmente es el número grande después de la palabra TOTAL)
        total_encontrado = None
        for i, t in enumerate(textos_detectados):
            if "TOTAL" in t.upper():
                # Revisar si el número está en la misma línea (ej: "TOTAL: 1749.30")
                match_total = re.search(r'\$?(\d+(?:\.\d{2}))', t)
                if match_total:
                    total_encontrado = match_total.group(1)
                    break
                # O si está en la siguiente línea
                elif i + 1 < len(textos_detectados):
                    match_siguiente = re.search(r'\$?(\d+(?:\.\d{2}))', textos_detectados[i+1])
                    if match_siguiente:
                        total_encontrado = match_siguiente.group(1)
                        break

        print(f"✅ Litros Extraídos: {litros_encontrados if litros_encontrados else 'No encontrado'}")
        print(f"✅ Importe Total Extraído: ${total_encontrado if total_encontrado else 'No encontrado'}")
        
    print("\n-----------------------------------\n")

if __name__ == "__main__":
    main()
