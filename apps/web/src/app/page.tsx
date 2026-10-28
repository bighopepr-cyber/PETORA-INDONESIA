import { BrandMark } from "@petora/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section
        aria-labelledby="welcome-title"
        className="w-full max-w-2xl rounded-2xl border border-[#e1e8e2] bg-white p-8 shadow-sm sm:p-12"
      >
        <BrandMark aria-label="PETORA" className="text-xl text-[#176b4d]" />
        <p className="mt-10 text-sm font-medium uppercase tracking-[0.16em] text-[#52715f]">
          Sistem operasional pet shop dan klinik hewan
        </p>
        <h1
          id="welcome-title"
          className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Fondasi PETORA sedang disiapkan
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-[#526158]">
          Aplikasi akan menghubungkan operasional toko dan klinik dengan data
          yang terjaga di PostgreSQL. Fitur akan diaktifkan setelah fondasi
          akses, izin, dan transaksi siap.
        </p>
        <div className="mt-8 rounded-xl bg-[#f2f7f3] p-5">
          <h2 className="font-medium">Tahap saat ini</h2>
          <p className="mt-2 text-sm leading-6 text-[#526158]">
            Menyiapkan aplikasi, database lokal, dan pemeriksaan otomatis. Belum
            ada transaksi bisnis yang tersedia.
          </p>
        </div>
      </section>
    </main>
  );
}
