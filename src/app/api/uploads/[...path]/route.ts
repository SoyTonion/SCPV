import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  // Construye la ruta absoluta al archivo dentro de public/uploads/...
  const filePath = path.join(process.cwd(), 'public', 'uploads', ...params.path);
  
  try {
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Determinar el tipo de contenido básico (jpg/png)
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    return new NextResponse(fileBuffer, {
      headers: { 
        'Content-Type': contentType,
        // Evitar caché pesada en desarrollo/demo
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
