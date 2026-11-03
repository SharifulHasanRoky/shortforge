import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/shorts/[id] - get full short details (with script, imagePrompts)
 * DELETE /api/shorts/[id] - delete a short
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let imagePaths: string[] = [];
    try { imagePaths = JSON.parse(short.imagePaths || '[]'); } catch {}
    let imagePrompts: string[] = [];
    try { imagePrompts = JSON.parse(short.imagePrompts || '[]'); } catch {}

    return NextResponse.json({
      ...short,
      imagePaths,
      imagePrompts,
      tags: short.tags.split(',').filter(Boolean),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const short = await db.short.findUnique({ where: { id } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Cleanup files
    const fs = await import('fs');
    try {
      if (short.videoPath && fs.existsSync(short.videoPath)) fs.unlinkSync(short.videoPath);
      if (short.audioPath && fs.existsSync(short.audioPath)) fs.unlinkSync(short.audioPath);
      const imagePaths: string[] = JSON.parse(short.imagePaths || '[]');
      imagePaths.forEach(p => {
        try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
      });
    } catch {}

    await db.short.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
