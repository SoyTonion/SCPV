import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Recibir la foto del celular/navegador
    const formData = await request.formData();
    
    // 2. Re-enviarla "por detrás" (del servidor Next.js al servidor Python en la misma PC)
    const res = await fetch('http://127.0.0.1:8000/extract-ticket', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
        return NextResponse.json({ exito: false, mensaje: 'Error al procesar en OCR' }, { status: 500 });
    }
    
    // 3. Regresar la respuesta de Python al celular/navegador
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Error en puente OCR:", error);
    return NextResponse.json({ exito: false, mensaje: 'No se pudo conectar con el motor de Inteligencia Artificial' }, { status: 500 });
  }
}
