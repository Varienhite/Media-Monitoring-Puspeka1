'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Password salah');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        {/* Logo Placeholder */}
        <div className="flex justify-center gap-4">
          <div className="w-14 h-14 bg-neutral-200 rounded-xl flex items-center justify-center font-bold text-neutral-500 border border-neutral-350 select-none">
            Logo 1
          </div>
          <div className="w-14 h-14 bg-neutral-200 rounded-xl flex items-center justify-center font-bold text-neutral-500 border border-neutral-350 select-none">
            Logo 2
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Pusat Penguatan Karakter
          </h1>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
            Kementerian Pendidikan Dasar dan Menengah
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-neutral-200 shadow-sm rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-neutral-750">
                Password Administrator
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-white border border-neutral-250 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition"
                  placeholder="Masukkan password admin"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 active:scale-98 cursor-pointer"
              >
                {loading ? 'Memverifikasi...' : 'Masuk sebagai Admin'}
              </button>

              <Link
                href="/"
                className="w-full flex justify-center py-2.5 px-4 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none transition text-center cursor-pointer"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
