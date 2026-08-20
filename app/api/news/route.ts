import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Parser from 'rss-parser';
import { syncCSVToDatabase } from '../keywords/route';

const parser = new Parser();

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // keep only alphanumeric characters
    .trim();
}

export async function GET(request: Request) {
  try {
    // 1. Sync keywords dari keywords.csv ke database
    await syncCSVToDatabase();

    // 2. Ambil semua keyword aktif
    const activeKeywords = await prisma.keyword.findMany({ where: { active: true } });
    
    // 3. Ambil data berita yang sudah ada di database untuk deduplikasi
    const existingNews = await prisma.news.findMany({
      select: { url: true, title: true, media: true }
    });
    
    const existingUrls = new Set(existingNews.map(n => n.url));
    const existingTitleMediaSet = new Set(
      existingNews.map(n => `${normalizeTitle(n.media)}_${normalizeTitle(n.title)}`)
    );

    // 4. Fetch berita baru dari Google News RSS
    for (const item of activeKeywords) {
      try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(item.keyword)}&hl=id&gl=ID&ceid=ID:id`;
        const feed = await parser.parseURL(rssUrl);
        
        if (feed && feed.items) {
          for (const entry of feed.items) {
            if (!entry.link || !entry.title) continue;

            // Bersihkan judul nama media bawaan Google News 
            const titleParts = entry.title.split(' - ');
            const mediaName = titleParts.length > 1 ? titleParts.pop() : 'Media Online';
            const cleanTitle = titleParts.join(' - ').trim();

            const normTitle = normalizeTitle(cleanTitle);
            const titleMediaKey = `${normalizeTitle(mediaName || 'Media Online')}_${normTitle}`;

            // Cek duplikasi berdasarkan URL atau kombinasi media + judul
            if (existingUrls.has(entry.link) || existingTitleMediaSet.has(titleMediaKey)) {
              continue;
            }

            // Auto-labeling sentiment berdasarkan kata kunci pada judul
            let initialSentiment = 'Netral';
            const lowerTitle = cleanTitle.toLowerCase();
            const negativeKeywords = ['tawuran', 'bullying', 'kekerasan', 'pelecehan', 'perundungan', 'intoleransi', 'hoaks', 'negatif', 'sanksi', 'konflik', 'bentrok', 'korban'];
            const positiveKeywords = ['juara', 'prestasi', 'sukses', 'penghargaan', 'kreatif', 'inovasi', 'positif', 'aman', 'harmonis', 'rukun', 'damai'];

            if (negativeKeywords.some(kw => lowerTitle.includes(kw))) {
              initialSentiment = 'Negatif';
            } else if (positiveKeywords.some(kw => lowerTitle.includes(kw))) {
              initialSentiment = 'Positif';
            }

            // Simpan berita baru ke database
            await prisma.news.create({
              data: {
                title: cleanTitle,
                media: mediaName || 'Unknown',
                date: entry.pubDate 
                  ? new Date(entry.pubDate).toISOString().split('T')[0] 
                  : new Date().toISOString().split('T')[0],
                url: entry.link,
                keyword: item.keyword,
                program: item.program,
                status: 'Belum diperiksa',
                sentiment: initialSentiment,
              },
            });

            // Tambahkan ke Set agar tidak memproses duplikat dalam run yang sama
            existingUrls.add(entry.link);
            existingTitleMediaSet.add(titleMediaKey);
          }
        }
      } catch (rssErr) {
        console.error(`Gagal fetch RSS untuk keyword "${item.keyword}":`, rssErr);
      }
    }

    // 5. Ambil semua data berita yang telah disimpan
    const newsList = await prisma.news.findMany({
      orderBy: { date: 'desc' }, // Urutkan berdasarkan tanggal terbit berita
    });

    const total = newsList.length;
    const stats = {
      total,
      kaih: newsList.filter(n => n.program === '7 KAIH').length,
      bsan: newsList.filter(n => n.program === 'BSAN').length,
      rukun: newsList.filter(n => n.program === 'Rukun Sama Teman').length,
      saih: newsList.filter(n => n.program === 'SAIH').length,
      gawai: newsList.filter(n => n.program === 'Pembatasan Gawai').length,
    };

    const sentimentStats = {
      positif: newsList.filter(n => n.sentiment === 'Positif').length,
      negatif: newsList.filter(n => n.sentiment === 'Negatif').length,
      netral: newsList.filter(n => n.sentiment === 'Netral').length,
    };

    return NextResponse.json({ success: true, news: newsList, stats, sentimentStats });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, sentiment } = await request.json();
    
    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (sentiment !== undefined) dataToUpdate.sentiment = sentiment;

    const updated = await prisma.news.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });
    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal mengupdate berita' }, { status: 500 });
  }
}