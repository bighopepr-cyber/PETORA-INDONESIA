# Instruksi Agent PETORA INDONESIA

## Misi

Kembangkan PETORA dari keadaan repositori saat ini hingga aplikasi operasional yang memenuhi spesifikasi, teruji, terdokumentasi, dan siap dirilis melalui pipeline deployment yang ditentukan. Kerjakan secara bertahap dan dapat diverifikasi; jangan mengklaim fitur atau deployment selesai sebelum bukti pemeriksaannya tersedia.

## Sumber Kebenaran

- Baca `petora-spesifikasi-v1.0.0.md` sebelum mengubah arsitektur, skema, aturan bisnis, izin, alur kerja, atau deployment. Dokumen tersebut adalah kontrak produk v1.0.0 dan sumber kebenaran utama.
- Istilah **wajib** dan **dilarang** di spesifikasi bersifat mengikat. Jangan mengubah keputusan yang dikunci, mengurangi cakupan, atau menambahkan fitur di luar v1.0.0 tanpa perubahan spesifikasi yang disetujui dan pencatatan versi sesuai Bagian 0 dan 41.
- Jika instruksi ini tampak berbeda dari spesifikasi, ikuti spesifikasi untuk perilaku produk dan arsitektur. Jika ada pertentangan nyata atau keputusan belum ditentukan, tunjukkan bagian yang bertentangan dan minta keputusan sebelum membuat perubahan yang mengikat.
- Periksa keadaan repositori dan perubahan lokal sebelum mulai. Jangan menganggap repositori kosong, menimpa pekerjaan pengguna, atau memindahkan spesifikasi tanpa diminta.

## Cara Bekerja

1. Pahami tujuan tugas dan baca bagian spesifikasi serta kode terdekat yang mengendalikannya. Untuk pekerjaan lintas modul, petakan dependensi secukupnya lalu kerjakan dalam irisan kecil.
2. Sebelum mengedit, rumuskan hipotesis lokal tentang perilaku yang harus diwujudkan, satu pemeriksaan yang dapat membantahnya, serta perubahan terkecil yang mengujinya.
3. Implementasikan perilaku ujung-ke-ujung pada batas yang tepat: kontrak input, antarmuka, Server Action, RPC/migrasi bila diperlukan, izin/RLS, audit, serta tes. Jangan membuat tombol atau alur yang tampak selesai tetapi tidak tersambung ke operasi nyata.
4. Setelah perubahan pertama, jalankan pemeriksaan paling sempit yang relevan sebelum memperluas pekerjaan. Perbaiki kegagalan pada irisan yang sama dan ulangi pemeriksaan tersebut.
5. Ikuti pola dan skrip repo yang ada. Jangan menambah dependensi atau abstraksi tanpa kebutuhan yang jelas. Jangan menjalankan deployment, migrasi production, perubahan data nyata, atau operasi destruktif tanpa persetujuan eksplisit dan prasyarat yang sesuai.
6. Beri laporan ringkas dalam bahasa Indonesia: perubahan, pemeriksaan beserta hasilnya, hal yang belum diverifikasi, dan langkah berikutnya yang konkret. Jangan menyebut pekerjaan selesai jika kriteria penerimaannya belum lulus.

## Batas Arsitektur yang Tidak Boleh Dilanggar

- Stack terkunci: Node.js 22, TypeScript strict, Next.js App Router, React 19, Tailwind CSS 4, pnpm workspaces, Turborepo, PostgreSQL 17/Supabase, Vercel, GitHub Actions, Resend, dan Sentry sesuai Bagian 4. Periksa versi minimum dan konfigurasi lengkap di spesifikasi.
- Ikuti struktur dan arah dependensi monorepo Bagian 5. `apps/*` dapat menggunakan `packages/*`; paket tidak mengimpor aplikasi. Kode server Next.js berada di area server dan memakai `import "server-only"`.
- PostgreSQL adalah sumber kebenaran untuk stok, kas, pembayaran, izin, status klinis, dan transaksi. Setiap mutasi bisnis dilakukan atomik melalui fungsi PostgreSQL RPC. Jangan menulis langsung ke tabel bisnis dari browser atau Server Action.
- RPC mutasi mengikuti Bagian 26: validasi aktor/izin/cabang, transaksi atomik, idempotensi untuk operasi penting, audit untuk perubahan kritis, kode error stabil, `SECURITY DEFINER` dengan `search_path` tetap, dan hak execute yang dibatasi.
- Aktifkan RLS pada seluruh tabel dan tetapkan kebijakan minimum yang dibutuhkan. Jangan menambahkan kebijakan terbuka seperti `using (true)` pada data bisnis. Uji isolasi cabang, pelanggan, dan peran.
- Web memakai sesi/JWT pengguna dan publishable key. Jangan memakai kunci secret Supabase di runtime web atau mengekspos rahasia, token, kredensial, data medis, atau data pribadi melalui kode klien, log, Sentry, seed publik, maupun respons yang tidak berizin.
- Skema hanya berubah melalui migration baru yang maju saja. Migration yang sudah digabung tidak diedit. Jaga kompatibilitas satu rilis dengan pola expand-and-contract; perubahan destruktif memerlukan persetujuan pemilik dan penjelasan di PR.
- Berkas disimpan di Supabase Storage dengan kebijakan objek sesuai spesifikasi. Komputasi berat, PDF, email, dan job terjadwal memakai fasilitas Supabase yang ditentukan; jangan menambah server, queue, cache, cron, atau layanan di luar daftar yang diizinkan.
- Antarmuka PETORA hanya berbahasa Indonesia. Hormati peran, izin, cabang, status, responsivitas, aksesibilitas, dan pola visual yang ditetapkan Bagian 32. Jangan menampilkan data klinis atau finansial di luar akses yang diizinkan.

## Aturan Produk Kritis

Sebelum mengubah perilaku bisnis, baca bagian yang relevan dan pertahankan semua BR-01 sampai BR-40. Secara khusus, jangan melemahkan hal berikut:

- Stok tidak negatif; pengambilan batch memakai FEFO dan melewati batch kedaluwarsa. Operasi bersamaan harus aman dan saldo harus dapat direkonsiliasi ke ledger.
- Pembayaran online yang diunggah belum terkonfirmasi. Konfirmasi pembayaran memeriksa dan mengalokasikan stok secara atomik; kekurangan stok mengikuti status dan keputusan `STOCK_REVIEW`.
- Rekam medis bertanda tangan terkunci. Koreksi hanya melalui amendemen yang diizinkan oleh dokter penanda asli; izin sensitif mensyaratkan MFA `aal2`.
- Refund dan pengeluaran yang memerlukan persetujuan menerapkan pemisahan tugas. Uang, kas, piutang, kredit, HPP, serta pembayaran tunai mengikuti ledger dan aturan sumbernya.
- RLS memeriksa akses pengguna aktif, cakupan cabang/objek, kepemilikan pelanggan, dan MFA sebagaimana berlaku. Pengguna nonaktif kehilangan akses pada permintaan berikutnya.
- Operasi harus mematuhi periode keuangan tertutup, idempotensi, audit, retensi data, dan batas privasi email yang ditentukan spesifikasi.

Jangan mengganti aturan tersebut dengan pemeriksaan UI saja. Database tetap menjadi penjaga terakhir.

## Urutan Implementasi

Pilih urutan berdasarkan dependensi, bukan dengan melewati cakupan. Pertahankan milestone yang bisa dijalankan dan diuji:

1. Audit repo dan siapkan monorepo, konfigurasi bersama, aplikasi web, Supabase Local, CI dasar, environment example, serta dokumentasi menjalankan lokal.
2. Bangun fondasi database: ekstensi, skema, fungsi identitas/izin, RLS, seed dasar, audit, idempotensi, storage, dan pengujian inventaris skema.
3. Bangun kontrak bersama dan kerangka UI; implementasikan modul M01–M18 berdasarkan dependensi domain yang ditetapkan spesifikasi. Hubungkan tiap alur melalui UI hingga RPC dan verifikasi keadaan database.
4. Lengkapi integration test dengan PostgreSQL Supabase Local asli, unit test fungsi murni, skenario konkurensi, serta enam E2E kritis. Jangan mock database untuk tes integrasi dan jangan melewati tes gagal tanpa alasan serta persetujuan reviewer.
5. Selesaikan dokumen operasional, migrasi/seed dari nol, pemeriksaan rahasia, backup dan uji pemulihan, monitoring, serta checklist UAT dan go-live.
6. Jalankan pipeline CI penuh; siapkan staging/preview sesuai kemampuan paket. Rilis production hanya melalui workflow terdokumentasi, dengan persetujuan manual pemilik dan smoke test read-only setelah rilis.

Urutan di atas adalah strategi pengerjaan, bukan izin untuk mengubah ruang lingkup atau melonggarkan Definition of Done.

## Migration, Konfigurasi, dan Data

- Gunakan hanya environment variables yang tercantum di Bagian 6.4. `.env.example` berisi nama dan placeholder, bukan nilai rahasia. File environment lokal tidak boleh masuk Git.
- Jangan membuat kredensial production, menebak ID proyek, memakai data pribadi sungguhan pada seed, atau mengirim rahasia melalui chat/log. Gunakan data demo sintetis dan seed tes deterministik.
- Buat migration bernama sesuai format spesifikasi, dengan satu tujuan yang jelas. Sertakan constraint, index, RLS/grant, trigger, dan tes yang dibutuhkan; jangan mengandalkan perubahan manual di dashboard sebagai satu-satunya sumber konfigurasi.
- Jangan mengubah data bisnis production langsung melalui SQL editor. Ikuti prosedur koreksi terotorisasi dan runbook. Jangan melakukan reset/drop terhadap database yang bukan lingkungan lokal yang memang ditujukan untuk reset.

## Pengujian dan Kriteria Selesai

Gunakan perintah repo yang sudah ada; jangan mengasumsikan skrip tersedia sebelum memeriksa `package.json` dan dokumentasi. Untuk perubahan yang relevan, jalankan pemeriksaan terarah, lalu gate CI yang diwajibkan:

- lint, format check, batas dependensi, typecheck, unit test, integrasi terhadap Supabase Local, dan build.
- Integration test untuk alur sukses, izin/isolasi, validasi, transisi status, idempotensi, dan konkurensi sesuai Bagian 33. RLS dan constraint/trigger kritis juga harus diuji melalui pengguna nyata di Supabase Local.
- E2E-1 sampai E2E-6 sesuai viewport dan alur Bagian 33.8.
- Penerimaan AC-01 sampai AC-25 serta Definition of Done Bagian 38 dan go-live Bagian 36.3 harus dapat ditelusuri ke hasil tes atau bukti operasional.
- Tes gagal, belum berjalan, atau diblokir harus dilaporkan jelas. Jangan mengubah tes menjadi skip atau menurunkan cakupan hanya agar pipeline hijau.

PETORA v1.0.0 baru boleh dinyatakan selesai bila seluruh M01–M18 dan BR-01–BR-40 dipenuhi, migrasi dapat diterapkan dari nol, seluruh gate dan kriteria penerimaan lulus, pemulihan terdokumentasi/teruji, serta UAT tertulis dan serah terima pemilik tersedia. Build sukses saja bukan bukti siap produksi.

## Deployment dan Serah Terima

- Ikuti Bagian 7 dan `docs/release.md` jika tersedia. Migrasi production dijalankan sebelum kode web baru aktif; perubahan skema tetap kompatibel dengan versi web sebelumnya.
- Gunakan GitHub Actions dan Vercel/Supabase yang ditentukan. Periksa target project, environment, commit SHA, secrets yang tersedia, backup, hasil staging, dan persetujuan sebelum setiap langkah production.
- Tidak ada deployment production otomatis atas inisiatif agent. Minta persetujuan eksplisit sebelum memicu rilis, mengubah konfigurasi production, atau menjalankan tindakan yang memengaruhi pengguna/data nyata.
- Jangan menganggap preview/staging, domain kustom, tier berbayar, backup off-platform, atau integrasi opsional tersedia. Terapkan jalur sederhana tier gratis jika sesuai, dan dokumentasikan batas layanan serta konsekuensinya.
- Setelah rilis yang disetujui: jalankan smoke test read-only, periksa error, outbox, job, dan metrik yang relevan; laporkan versi/commit, hasil, risiko tersisa, serta prosedur rollback web dan perbaikan database melalui migration maju.

## Dokumentasi

Pertahankan struktur dokumentasi yang diizinkan Bagian 37. Dokumentasikan cara menjalankan lokal, skrip yang benar-benar tersedia, migration, izin, rilis, rollback, pemulihan, dan keputusan penting. Jangan membuat dokumentasi yang mengklaim kemampuan belum diimplementasikan. Jangan mengubah spesifikasi terkunci sebagai jalan pintas untuk mengakomodasi kode.
