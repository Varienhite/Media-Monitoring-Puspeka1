'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function KeywordSettings() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const router = useRouter();

  // Form states
  const [newProgram, setNewProgram] = useState('7 KAIH');
  const [customProgram, setCustomProgram] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const programs = ['7 KAIH', 'BSAN', 'Rukun Sama Teman', 'SAIH', 'Pembatasan Gawai', 'Lainnya'];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
        fetchKeywords();
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error(err);
      router.push('/login');
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchKeywords = async () => {
    try {
      const res = await fetch('/api/keywords');
      const data = await res.json();
      if (data.success) {
        setKeywords(data.keywords);
      } else {
        setError(data.error || 'Gagal memuat keyword.');
      }
    } catch (err) {
      setError('Gagal memuat keyword.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch('/api/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords(keywords.map(kw => kw.id === id ? { ...kw, active: !currentActive } : kw));
        setSuccess('Status keyword berhasil diperbarui!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Gagal mengubah status.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      setError('Gagal memperbarui status.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus keyword ini?')) return;
    try {
      const res = await fetch('/api/keywords', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords(keywords.filter(kw => kw.id !== id));
        setSuccess('Keyword berhasil dihapus!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Gagal menghapus keyword.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      setError('Gagal menghapus keyword.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const programToSubmit = newProgram === 'Lainnya' ? customProgram.trim() : newProgram;
    if (!programToSubmit) {
      setError('Program harus dipilih atau diisi.');
      return;
    }
    if (!newKeyword.trim()) {
      setError('Keyword tidak boleh kosong.');
      return;
    }

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: programToSubmit,
          keyword: newKeyword.trim(),
          active: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords([data.keyword, ...keywords]);
        setNewKeyword('');
        setCustomProgram('');
        setSuccess('Keyword baru berhasil ditambahkan!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Gagal menambahkan keyword.');
      }
    } catch (err) {
      setError('Gagal menghubungi server.');
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center text-sm font-bold text-neutral-450">Memverifikasi akses admin...</div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center border-b border-neutral-200 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900">
              KEYWORD MONITORING
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Kelola kata kunci pencarian berita untuk kurasi program Puspeka</p>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 bg-white hover:bg-neutral-50 text-neutral-800 px-4 py-2 rounded-xl text-sm font-bold transition border border-neutral-200 shadow-sm"
          >
            Kembali ke Dashboard
          </a>
        </header>

        {error && (
          <div className="bg-neutral-105 border border-neutral-250 text-neutral-800 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-neutral-900 border border-neutral-900 text-white px-4 py-3 rounded-xl text-sm mb-6">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form Tambah Keyword */}
          <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">
              Tambah Keyword
            </h2>
            <form onSubmit={handleAddKeyword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase tracking-wider mb-1.5">
                  Program / Kategori
                </label>
                <select
                  value={newProgram}
                  onChange={(e) => setNewProgram(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
                >
                  {programs.map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
              </div>

              {newProgram === 'Lainnya' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-wider mb-1.5">
                    Nama Program Kustom
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama program..."
                    value={customProgram}
                    onChange={(e) => setCustomProgram(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-850 placeholder-neutral-450 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase tracking-wider mb-1.5">
                  Kata Kunci (Keyword)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan kata kunci pencarian..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-sm text-neutral-855 placeholder-neutral-450 focus:outline-none focus:ring-2 focus:ring-neutral-950/20"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm active:scale-[0.98]"
              >
                Simpan Keyword
              </button>
            </form>
          </div>

          {/* Tabel Keywords */}
          <div className="md:col-span-2 bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center justify-between">
                <span>Daftar Keyword Saat Ini</span>
                <span className="text-xs font-normal text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                  Total: {keywords.length}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-neutral-500">Memuat data keyword...</div>
            ) : keywords.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">Belum ada keyword. Gunakan form disamping untuk menambahkan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                      <th className="px-6 py-3 font-bold uppercase text-xs tracking-wider">Program</th>
                      <th className="px-6 py-3 font-bold uppercase text-xs tracking-wider">Keyword</th>
                      <th className="px-6 py-3 font-bold uppercase text-xs tracking-wider text-center">Aktif</th>
                      <th className="px-6 py-3 font-bold uppercase text-xs tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {keywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-neutral-50/50 transition">
                        <td className="px-6 py-4">
                          <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border bg-neutral-100 text-neutral-700 border-neutral-200">
                            {kw.program}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-neutral-800">{kw.keyword}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleActive(kw.id, kw.active)}
                            className={`inline-flex items-center justify-center p-1 rounded-lg border transition ${
                              kw.active
                                ? 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
                                : 'bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50'
                            }`}
                            title={kw.active ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {kw.active ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(kw.id)}
                            className="text-neutral-500 hover:text-neutral-800 hover:border-neutral-400 font-bold text-xs bg-white border border-neutral-200 px-3 py-1.5 rounded-lg transition"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
