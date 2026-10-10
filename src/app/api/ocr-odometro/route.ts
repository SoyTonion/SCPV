import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Mandar foto al endpoint de odómetro en Python
    const res = await fetch('http://127.0.0.1:8000/extract-odometro', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
        return NextResponse.json({ exito: false, mensaje: 'Error al procesar tablero' }, { status: 500 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Error en puente Odómetro:", error);
    return NextResponse.json({ exito: false, mensaje: 'No se pudo conectar con IA' }, { status: 500 });
  }
}
