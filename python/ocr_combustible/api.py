from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import re
import os
import uuid
import shutil

app = FastAPI(title="API OCR Combustible CFE")

# Configurar CORS para permitir que Next.js le hable a este servidor
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Iniciando servidor y cargando la IA en memoria...")
# Cargamos la IA UNA SOLA VEZ al arrancar, así las respuestas serán instantáneas
try:
    ocr = PaddleOCR(use_angle_cls=True, lang='es')
except Exception as e:
    print("Error crítico al cargar PaddleOCR:", e)

@app.post("/extract-ticket")
async def extract_ticket(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se envió ningún archivo")

    # Guardar el archivo temporalmente
    temp_filename = f"temp_{uuid.uuid4().hex}.jpg"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Ejecutar OCR
        result = ocr.ocr(temp_filename, cls=True)
        
        if not result or not result[0]:
            return {"exito": False, "mensaje": "No se detectó texto en la imagen"}

        textos_detectados = [line[1][0] for line in result[0]]
        
        # --- EXTRACCIÓN DE LITROS ---
        litros_encontrados = None
        for t in textos_detectados:
            match_litros = re.search(r'(\d+(?:\.\d+)?)\s*(LTR|LTS|LTS\.|LITROS)', t.upper())
            if match_litros:
                litros_encontrados = float(match_litros.group(1))
                break
                
        # --- EXTRACCIÓN DE TOTAL ---
        total_encontrado = None
        for i, t in enumerate(textos_detectados):
            if "TOTAL" in t.upper():
                match_total = re.search(r'\$?(\d+(?:\.\d{2}))', t)
                if match_total:
                    total_encontrado = float(match_total.group(1))
                    break
                elif i + 1 < len(textos_detectados):
                    match_siguiente = re.search(r'\$?(\d+(?:\.\d{2}))', textos_detectados[i+1])
                    if match_siguiente:
                        total_encontrado = float(match_siguiente.group(1))
                        break

        # Limpiar el archivo temporal
        os.remove(temp_filename)

        return {
            "exito": True,
            "litros": litros_encontrados,
            "total": total_encontrado,
            "raw_text": textos_detectados
        }

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract-odometro")
async def extract_odometro(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se envió ningún archivo")

    temp_filename = f"temp_odo_{uuid.uuid4().hex}.jpg"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = ocr.ocr(temp_filename, cls=True)
        if not result or not result[0]:
            return {"exito": False, "mensaje": "No se detectó texto en el tablero"}

        textos_detectados = [line[1][0] for line in result[0]]
        
        posibles_kilometrajes = []
        kilometraje_seguro = None

        # Función mágica para corregir los errores típicos de la IA en pantallas digitales
        def limpiar_falso_numero(texto):
            # Quitamos espacios y comas para unir números (ej. "125 000")
            t_sin_espacios = re.sub(r'[,\s]', '', texto)
            
            # Si el texto es puro texto como "TOTAL" o letras seguidas, lo ignoramos para no arruinarlo
            if not any(char.isdigit() for char in t_sin_espacios):
                return None
                
            # Traducimos letras que la IA confunde con números por el brillo o el display digital
            traductor = str.maketrans("OIlZSBG", "0112586")
            texto_traducido = t_sin_espacios.translate(traductor)
            
            # Extraemos la secuencia numérica más larga de la cadena traducida
            match = re.search(r'(\d{3,6})', texto_traducido)
            if match:
                return int(match.group(1))
            return None

        # 1. Prioridad Máxima: Buscar secuencias que estén explícitamente al lado de KM, ODO, TRIP, etc.
        for t in textos_detectados:
            t_upper = t.upper()
            if any(palabra in t_upper for palabra in ["KM", "ODO", "TRIP", "MI", "K/H", "KM/H"]):
                num = limpiar_falso_numero(t_upper)
                # Un auto de flotilla difícilmente tiene menos de 1000 km
                if num and num > 1000:
                    kilometraje_seguro = num
                    break

        # 2. Plan B: Si la foto no captó la palabra KM, buscamos el número más lógico de todo el tablero
        if not kilometraje_seguro:
            for t in textos_detectados:
                num = limpiar_falso_numero(t.upper())
                # Filtramos por números realistas para un odómetro de CFE (entre 1,000 y 900,000 km)
                if num and 1000 <= num <= 900000:
                    posibles_kilometrajes.append(num)

        # Decisión final: Si encontramos el seguro lo usamos, si no, usamos el máximo lógico encontrado
        odometro = kilometraje_seguro if kilometraje_seguro else (max(posibles_kilometrajes) if posibles_kilometrajes else None)

        os.remove(temp_filename)

        return {
            "exito": True,
            "odometro": odometro,
            "raw_text": textos_detectados
        }

    except Exception as e:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))
