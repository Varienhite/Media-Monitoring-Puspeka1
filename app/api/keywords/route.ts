import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'keywords.csv');

// Helper to parse CSV robustly
function parseCSV(content: string) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const list: { program: string; keyword: string; active: boolean }[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    
    if (parts.length >= 2) {
      const program = parts[0].trim();
      const keyword = parts[1].trim();
      const active = parts[2] ? parts[2].trim().toLowerCase() === 'true' : true;
      list.push({ program, keyword, active });
    }
  }
  return list;
}

// Helper to write database state back to CSV
async function syncToCSV() {
  try {
    const keywords = await prisma.keyword.findMany({
      orderBy: [{ program: 'asc' }, { keyword: 'asc' }],
    });
    
    const csvLines = ['program,keyword,active'];
    for (const kw of keywords) {
      // Escaping comma and double quotes if needed
      const escapedKeyword = kw.keyword.includes(',') || kw.keyword.includes('"')
        ? `"${kw.keyword.replace(/"/g, '""')}"`
        : kw.keyword;
      const escapedProgram = kw.program.includes(',') || kw.program.includes('"')
        ? `"${kw.program.replace(/"/g, '""')}"`
        : kw.program;
      csvLines.push(`${escapedProgram},${escapedKeyword},${kw.active}`);
    }
    
    const csvContent = csvLines.join('\n') + '\n';
    await fs.writeFile(csvPath, csvContent, 'utf-8');
  } catch (err) {
    console.error("Gagal menyinkronkan ke CSV:", err);
  }
}

// Helper to load CSV into DB if DB is empty
export async function syncCSVToDatabase() {
  try {
    const dbCount = await prisma.keyword.count();
    
    // Read from CSV
    let csvContent = '';
    try {
      csvContent = await fs.readFile(csvPath, 'utf-8');
    } catch (e) {
      // If CSV doesn't exist, we skip
      return;
    }
    
    const csvKeywords = parseCSV(csvContent);
    
    if (dbCount === 0) {
      // If DB is empty, populate completely
      for (const item of csvKeywords) {
        await prisma.keyword.upsert({
          where: { keyword: item.keyword },
          update: { program: item.program, active: item.active },
          create: item,
        });
      }
    } else {
      // If DB is not empty, sync any keywords that are in CSV but not in DB
      for (const item of csvKeywords) {
        const existing = await prisma.keyword.findUnique({
          where: { keyword: item.keyword },
        });
        if (!existing) {
          await prisma.keyword.create({ data: item });
        }
      }
    }
  } catch (err) {
    console.error("Gagal sinkronisasi CSV ke database:", err);
  }
}

export async function GET() {
  try {
    await syncCSVToDatabase();
    
    const keywords = await prisma.keyword.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({ success: true, keywords });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal mengambil keyword' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { program, keyword, active } = await request.json();
    
    if (!program || !keyword) {
      return NextResponse.json({ success: false, error: 'Program dan Keyword harus diisi' }, { status: 400 });
    }

    // Check if duplicate
    const existing = await prisma.keyword.findUnique({
      where: { keyword: keyword.trim() },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Keyword sudah terdaftar' }, { status: 400 });
    }

    const created = await prisma.keyword.create({
      data: {
        program: program.trim(),
        keyword: keyword.trim(),
        active: active !== undefined ? active : true,
      },
    });

    // Sync back to CSV
    await syncToCSV();

    return NextResponse.json({ success: true, keyword: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal menambahkan keyword' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, program, keyword, active } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID keyword diperlukan' }, { status: 400 });
    }

    const updateData: any = {};
    if (program !== undefined) updateData.program = program.trim();
    if (keyword !== undefined) updateData.keyword = keyword.trim();
    if (active !== undefined) updateData.active = active;

    const updated = await prisma.keyword.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Sync back to CSV
    await syncToCSV();

    return NextResponse.json({ success: true, keyword: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal mengupdate keyword' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID keyword diperlukan' }, { status: 400 });
    }

    await prisma.keyword.delete({
      where: { id: Number(id) },
    });

    // Sync back to CSV
    await syncToCSV();

    return NextResponse.json({ success: true, message: 'Keyword berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal menghapus keyword' }, { status: 500 });
  }
}
