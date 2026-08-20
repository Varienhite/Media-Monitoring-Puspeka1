'use client';
import { useEffect, useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Link from 'next/link';

export default function Dashboard() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  
  // State Filter & Pencarian
  const [search, setSearch] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedDate, setSelectedDate] = useState('Semua');
  const [selectedKeyword, setSelectedKeyword] = useState('Semua');

  // State Pagination (Halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // List program untuk filter tabs
  const programOptions = ['Semua', '7 KAIH', 'BSAN', 'Rukun Sama Teman', 'SAIH', 'Pembatasan Gawai'];
  
  // List status untuk filter tabs
  const statusOptions = ['Semua', 'Penting', 'Perlu perhatian', 'Relevan', 'Tidak relevan', 'Belum diperiksa'];

  useEffect(() => {
    checkAuth();
    fetchNews();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setAuthenticated(data.authenticated);
    } catch (err) {
      console.error("Gagal memeriksa status auth:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setAuthenticated(false);
      window.location.reload();
    } catch (err) {
      console.error("Gagal logout:", err);
    }
  };

  const fetchNews = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data && data.success) {
        setNews(data.news);
      }
    } catch (err) {
      console.error("Gagal mengambil data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Derived state: filteredNews
  const filteredNews = useMemo(() => {
    let result = news;
    if (selectedProgram !== 'Semua') {
      result = result.filter((n) => n.program === selectedProgram);
    }
    if (selectedStatus !== 'Semua') {
      result = result.filter((n) => n.status === selectedStatus);
    }
    if (selectedDate !== 'Semua') {
      result = result.filter((n) => n.date === selectedDate);
    }
    if (selectedKeyword !== 'Semua') {
      result = result.filter((n) => n.keyword === selectedKeyword);
    }
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter((n) => 
        n.title.toLowerCase().includes(q) ||
        n.media.toLowerCase().includes(q) ||
        n.keyword.toLowerCase().includes(q)
      );
    }
    return result;
  }, [news, selectedProgram, selectedStatus, selectedDate, selectedKeyword, search]);

  // Derived state: stats (total per program)
  const stats = useMemo(() => {
    return {
      total: news.length,
      kaih: news.filter(n => n.program === '7 KAIH').length,
      bsan: news.filter(n => n.program === 'BSAN').length,
      rukun: news.filter(n => n.program === 'Rukun Sama Teman').length,
      saih: news.filter(n => n.program === 'SAIH').length,
      gawai: news.filter(n => n.program === 'Pembatasan Gawai').length,
    };
  }, [news]);

  // Derived state: sentimentStats (total per sentiment)
  const sentimentStats = useMemo(() => {
    const total = news.length;
    const positif = news.filter(n => n.sentiment === 'Positif').length;
    const negatif = news.filter(n => n.sentiment === 'Negatif').length;
    const netral = news.filter(n => n.sentiment === 'Netral').length;
    
    return {
      total,
      positif,
      negatif,
      netral,
      positifPct: total > 0 ? Math.round((positif / total) * 100) : 0,
      negatifPct: total > 0 ? Math.round((negatif / total) * 100) : 0,
      netralPct: total > 0 ? Math.round((netral / total) * 100) : 0,
    };
  }, [news]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProgram, selectedStatus, selectedDate, selectedKeyword]);

  // Paginated news variables
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = filteredNews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleStatusChange = async (id: number, newStatus: string) => {
    const updatedNews = news.map(n => n.id === id ? { ...n, status: newStatus } : n);
    setNews(updatedNews);
    
    await fetch('/api/news', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
  };

  const handleSentimentChange = async (id: number, newSentiment: string) => {
    const updatedNews = news.map(n => n.id === id ? { ...n, sentiment: newSentiment } : n);
    setNews(updatedNews);
    
    await fetch('/api/news', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sentiment: newSentiment }),
    });
  };

  // Extract unique dates and keywords from data for dynamic filters
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(news.map(n => n.date))).sort((a, b) => b.localeCompare(a));
  }, [news]);

  const uniqueKeywords = useMemo(() => {
    return Array.from(new Set(news.map(n => n.keyword))).sort();
  }, [news]);

  // Excel Export
  const getIndonesianFileName = () => {
    const idMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date();
    const dateStr = `${d.getDate()}_${idMonths[d.getMonth()].toLowerCase()}_${d.getFullYear()}`;
    return `media_monitoring_${dateStr}.xlsx`;
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Media Monitoring', {
      views: [{ showGridLines: true }]
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Tanggal', key: 'tanggal', width: 18 },
      { header: 'Media', key: 'media', width: 24 },
      { header: 'Judul', key: 'judul', width: 95 },
      { header: 'Program', key: 'program', width: 26 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Sentimen', key: 'sentiment', width: 16 },
      { header: 'Link', key: 'link', width: 22 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
      cell.font = {
        name: 'Segoe UI',
        bold: true,
        size: 11,
        color: { argb: 'FF000000' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF7F7F7F' } },
        left: { style: 'thin', color: { argb: 'FF7F7F7F' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF7F7F7F' } }
      };
    });

    filteredNews.forEach((n, i) => {
      const row = worksheet.addRow({
        no: i + 1,
        tanggal: n.date,
        media: n.media,
        judul: n.title,
        program: n.program,
        status: n.status,
        sentiment: n.sentiment || 'Netral',
        link: 'Buka Berita'
      });

      row.height = 35;

      const cellNo = row.getCell('no');
      const cellTanggal = row.getCell('tanggal');
      const cellMedia = row.getCell('media');
      const cellJudul = row.getCell('judul');
      const cellProgram = row.getCell('program');
      const cellStatus = row.getCell('status');
      const cellSentiment = row.getCell('sentiment');
      const cellLink = row.getCell('link');

      cellNo.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTanggal.alignment = { horizontal: 'center', vertical: 'middle' };
      cellMedia.alignment = { horizontal: 'left', vertical: 'middle' };
      cellJudul.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cellProgram.alignment = { horizontal: 'center', vertical: 'middle' };
      cellStatus.alignment = { horizontal: 'center', vertical: 'middle' };
      cellSentiment.alignment = { horizontal: 'center', vertical: 'middle' };
      cellLink.alignment = { horizontal: 'center', vertical: 'middle' };

      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF000000' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });

      cellLink.value = {
        text: 'Buka Berita ↗',
        hyperlink: n.url,
        tooltip: 'Klik untuk membuka berita'
      };
      cellLink.font = {
        name: 'Segoe UI',
        size: 10,
        color: { argb: 'FF0563C1' },
        underline: true
      };

      if (n.status === 'Penting' || n.status === 'Perlu perhatian') {
        cellStatus.font = {
          name: 'Segoe UI',
          bold: true,
          size: 10,
          color: { argb: 'FF000000' }
        };
      }

      if (n.sentiment === 'Negatif') {
        cellSentiment.font = {
          name: 'Segoe UI',
          bold: true,
          size: 10,
          color: { argb: 'FFFF0000' }
        };
      } else if (n.sentiment === 'Positif') {
        cellSentiment.font = {
          name: 'Segoe UI',
          bold: true,
          size: 10,
          color: { argb: 'FF008000' }
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(blob, getIndonesianFileName());
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Penting':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">⭐ Penting</span>;
      case 'Perlu perhatian':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">⚠️ Perlu Perhatian</span>;
      case 'Relevan':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0">Relevan</span>;
      case 'Tidak relevan':
        return <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0">Tidak Relevan</span>;
      default:
        return <span className="bg-white text-neutral-450 border border-neutral-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0">Belum diperiksa</span>;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'Positif':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">😊 Positif</span>;
      case 'Negatif':
        return <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">😠 Negatif</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-600 border border-neutral-200 text-[11px] font-bold px-2 py-1 rounded-lg flex-shrink-0">😐 Netral</span>;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section with Satker & Kemendikdasmen branding */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-neutral-200 pb-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Logo Kemendikdasmen (Placeholder) */}
            <div className="relative w-16 h-16 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              <img 
                src="/logo-kemendikdasmen.png" 
                alt="Logo Kemendikdasmen" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-text')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-text text-[9px] font-black text-center text-neutral-400 select-none uppercase px-1 leading-tight';
                    fallback.innerText = 'Logo\nKementerian';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            
            {/* Logo Puspeka (Placeholder) */}
            <div className="relative w-16 h-16 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              <img 
                src="/logo-puspeka.png" 
                alt="Logo Puspeka" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.fallback-text')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-text text-[9px] font-black text-center text-neutral-400 select-none uppercase px-1 leading-tight';
                    fallback.innerText = 'Logo\nPuspeka';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            
            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Kementerian Pendidikan Dasar dan Menengah</p>
              <h1 className="text-2xl font-black text-neutral-900 leading-tight">
                Pusat Penguatan Karakter
              </h1>
              <p className="text-xs text-neutral-500 font-bold">Sistem Monitoring Media Online & Kurasi Berita Terpadu</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            {authenticated ? (
              <>
                <Link
                  href="/keywords"
                  className="bg-white hover:bg-neutral-50 text-neutral-850 px-4 py-2.5 rounded-xl text-sm font-bold border border-neutral-200 transition shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  ⚙️ Pengaturan Keyword
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold border border-transparent transition shadow-sm active:scale-95 cursor-pointer"
                >
                  Keluar Admin
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-white hover:bg-neutral-50 text-neutral-850 px-4 py-2.5 rounded-xl text-sm font-bold border border-neutral-200 transition shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                🔑 Login Admin
              </Link>
            )}
            
            <button 
              onClick={fetchNews}
              disabled={refreshing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Menarik Berita...
                </>
              ) : (
                <>🔄 Tarik Berita Baru</>
              )}
            </button>
          </div>
        </header>

        {/* Statistik Kategori Berita */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white border border-neutral-200 p-4.5 rounded-2xl shadow-sm border-l-4 border-l-neutral-400">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">Total Berita</p>
            <p className="text-3xl font-black text-neutral-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white border border-neutral-200 p-4.5 rounded-2xl shadow-sm border-l-4 border-l-blue-500">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">7 KAIH</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{stats.kaih}</p>
          </div>
          <div className="bg-white border border-neutral-200 p-4.5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">BSAN</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">{stats.bsan}</p>
          </div>
          <div className="bg-white border border-neutral-200 p-4.5 rounded-2xl shadow-sm border-l-4 border-l-rose-500">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">Rukun Teman</p>
            <p className="text-3xl font-black text-rose-600 mt-2">{stats.rukun}</p>
          </div>
          <div className="bg-white border border-neutral-200 p-4.5 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">SAIH</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{stats.saih}</p>
          </div>
          <div className="bg-white border border-neutral-200 p-4.5 rounded-2xl shadow-sm border-l-4 border-l-purple-500">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">Gawai</p>
            <p className="text-3xl font-black text-purple-600 mt-2">{stats.gawai}</p>
          </div>
        </section>

        {/* Sentiment Analysis Visual Breakdown Panel */}
        <section className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm mb-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-neutral-700 mb-4 flex items-center gap-1.5">
            📊 Persentase Sentimen Pemberitaan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Visual Progress Bar Chart */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1.5">
                  <span>😊 Sentimen Positif</span>
                  <span className="text-emerald-600 font-extrabold">{sentimentStats.positifPct}% ({sentimentStats.positif} berita)</span>
                </div>
                <div className="w-full bg-neutral-100 h-3.5 rounded-full overflow-hidden border border-neutral-200">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sentimentStats.positifPct}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1.5">
                  <span>😠 Sentimen Negatif</span>
                  <span className="text-rose-600 font-extrabold">{sentimentStats.negatifPct}% ({sentimentStats.negatif} berita)</span>
                </div>
                <div className="w-full bg-neutral-100 h-3.5 rounded-full overflow-hidden border border-neutral-200">
                  <div 
                    className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sentimentStats.negatifPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-neutral-600 mb-1.5">
                  <span>😐 Sentimen Netral</span>
                  <span className="text-neutral-500 font-extrabold">{sentimentStats.netralPct}% ({sentimentStats.netral} berita)</span>
                </div>
                <div className="w-full bg-neutral-100 h-3.5 rounded-full overflow-hidden border border-neutral-200">
                  <div 
                    className="bg-neutral-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sentimentStats.netralPct}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Summary card */}
            <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl flex flex-col justify-center items-center text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-450">Analisis Sentimen</p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="text-3xl font-black text-emerald-600">{sentimentStats.positifPct}%</span>
                <span className="text-neutral-300 font-bold">/</span>
                <span className="text-3xl font-black text-rose-600">{sentimentStats.negatifPct}%</span>
              </div>
              <p className="text-[11px] font-bold text-neutral-500 mt-2 leading-relaxed">
                Rasio sentimen positif terhadap negatif dalam monitoring media Puspeka saat ini.
              </p>
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm mb-6 space-y-5">
          {/* Baris 1: Pencarian & Dropdown Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Cari Judul / Media / Keyword</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Masukkan kata kunci pencarian..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Filter Tanggal</label>
              <select 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="Semua">Semua Tanggal</option>
                {uniqueDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Filter Keyword</label>
              <select 
                value={selectedKeyword}
                onChange={(e) => setSelectedKeyword(e.target.value)}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="Semua">Semua Keyword</option>
                {uniqueKeywords.map(kw => (
                  <option key={kw} value={kw}>{kw}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris 2: Program Filter Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Program</label>
            <div className="flex flex-wrap gap-2">
              {programOptions.map((prog) => (
                <button
                  key={prog}
                  onClick={() => setSelectedProgram(prog)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition duration-150 active:scale-95 cursor-pointer ${
                    selectedProgram === prog
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-neutral-555 border-neutral-200 hover:border-neutral-300 hover:text-neutral-800'
                  }`}
                >
                  {prog}
                </button>
              ))}
            </div>
          </div>

          {/* Baris 3: Status Filter Tabs & Export Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1 border-t border-neutral-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Status Kurasi</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((stat) => (
                  <button
                    key={stat}
                    onClick={() => setSelectedStatus(stat)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition duration-150 active:scale-95 cursor-pointer ${
                      selectedStatus === stat
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-neutral-555 border-neutral-200 hover:border-neutral-300 hover:text-neutral-800'
                    }`}
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleExportExcel}
              disabled={filteredNews.length === 0}
              className="bg-white hover:bg-neutral-50 disabled:bg-neutral-100 disabled:text-neutral-400 border border-neutral-200 text-neutral-800 px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 self-end md:self-auto cursor-pointer active:scale-95"
            >
              📊 Unduh Laporan (Excel)
            </button>
          </div>
        </section>

        {/* List Berita */}
        <section className="space-y-4">
          <div className="flex justify-between items-center text-sm text-neutral-500 px-2">
            <span>Daftar Berita ({filteredNews.length} item)</span>
            {selectedProgram !== 'Semua' || selectedStatus !== 'Semua' || selectedDate !== 'Semua' || selectedKeyword !== 'Semua' || search !== '' ? (
              <button 
                onClick={() => {
                  setSelectedProgram('Semua');
                  setSelectedStatus('Semua');
                  setSelectedDate('Semua');
                  setSelectedKeyword('Semua');
                  setSearch('');
                }}
                className="text-indigo-600 hover:underline hover:text-indigo-850 text-xs font-bold"
              >
                Reset Semua Filter
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="text-center py-20 bg-white border border-neutral-200 rounded-2xl text-neutral-400">
              <svg className="animate-spin mx-auto h-8 w-8 text-neutral-900 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Memuat data berita...
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl text-neutral-450">
              Tidak ada berita yang ditemukan atau sesuai dengan filter saat ini.
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedNews.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white border border-neutral-200 hover:border-neutral-350 p-5 rounded-2xl shadow-sm transition duration-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-5"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        item.program === '7 KAIH' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        item.program === 'BSAN' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        item.program === 'SAIH' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        item.program === 'Rukun Sama Teman' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        item.program === 'Pembatasan Gawai' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        'bg-neutral-100 text-neutral-650 border-neutral-200'
                      }`}>
                        {item.program}
                      </span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-xs text-neutral-800 font-extrabold">{item.media}</span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-xs text-neutral-500 font-medium">{item.date}</span>
                    </div>

                    <h2 className="font-extrabold text-neutral-900 text-lg hover:text-indigo-650 transition leading-snug">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </h2>
                    
                    <div className="flex items-center gap-1.5 text-xs text-neutral-555">
                      <span>Keyword ditemukan:</span>
                      <span className="text-neutral-800 italic font-bold bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        "{item.keyword}"
                      </span>
                    </div>
                  </div>

                  {/* Status, Sentimen & Tombol Buka */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto self-stretch md:self-center pt-3 md:pt-0 border-t border-neutral-100 md:border-none justify-between md:justify-end">
                    {/* Status & Sentimen Badges / Selects */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Curation Status */}
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(item.status)}
                        {authenticated && (
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="bg-white border border-neutral-200 text-xs font-bold px-2 py-1.5 rounded-lg text-neutral-700 focus:outline-none focus:ring-1 focus:ring-indigo-655 cursor-pointer"
                          >
                            <option value="Belum diperiksa">Belum diperiksa</option>
                            <option value="Relevan">Relevan</option>
                            <option value="Tidak relevan">Tidak relevan</option>
                            <option value="Penting">Penting</option>
                            <option value="Perlu perhatian">Perlu perhatian</option>
                          </select>
                        )}
                      </div>

                      {/* Sentiment */}
                      <div className="flex items-center gap-1.5">
                        {getSentimentBadge(item.sentiment)}
                        {authenticated && (
                          <select
                            value={item.sentiment}
                            onChange={(e) => handleSentimentChange(item.id, e.target.value)}
                            className="bg-white border border-neutral-200 text-xs font-bold px-2 py-1.5 rounded-lg text-neutral-700 focus:outline-none focus:ring-1 focus:ring-indigo-655 cursor-pointer"
                          >
                            <option value="Netral">Netral</option>
                            <option value="Positif">Positif</option>
                            <option value="Negatif">Negatif</option>
                          </select>
                        )}
                      </div>
                    </div>
                    
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4.5 py-2.5 rounded-lg transition text-center shadow-sm active:scale-95 flex items-center justify-center"
                    >
                      Buka Berita ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredNews.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-neutral-200 pt-6 mt-6 gap-4">
              <div className="text-sm text-neutral-500 font-medium">
                Menampilkan <span className="font-extrabold text-neutral-800">{(currentPage - 1) * itemsPerPage + 1}</span>
                {' - '}
                <span className="font-extrabold text-neutral-800">{Math.min(currentPage * itemsPerPage, filteredNews.length)}</span> dari{' '}
                <span className="font-extrabold text-neutral-800">{filteredNews.length}</span> berita
              </div>
              
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition cursor-pointer"
                  title="Halaman Pertama"
                >
                  «
                </button>
                
                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  ‹
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let targetPage = currentPage;
                  if (currentPage <= 3) {
                    targetPage = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    targetPage = totalPages - 4 + idx;
                  } else {
                    targetPage = currentPage - 2 + idx;
                  }
                  
                  if (targetPage < 1 || targetPage > totalPages) return null;

                  return (
                    <button
                      key={targetPage}
                      onClick={() => setCurrentPage(targetPage)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 active:scale-95 cursor-pointer border ${
                        currentPage === targetPage
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-white text-neutral-755 border-neutral-200 hover:border-neutral-300 hover:text-neutral-850'
                      }`}
                    >
                      {targetPage}
                    </button>
                  );
                })}

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  ›
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition cursor-pointer"
                  title="Halaman Terakhir"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}