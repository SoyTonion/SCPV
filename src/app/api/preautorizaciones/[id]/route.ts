import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado } = body;

    const actualizada = await prisma.preautorizacionCombustible.update({
      where: { id },
      data: { estado }
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error("Error updating preautorizacion:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
