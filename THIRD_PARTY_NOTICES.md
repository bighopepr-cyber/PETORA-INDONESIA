# Pemberitahuan komponen pihak ketiga

PETORA menggunakan komponen pihak ketiga sesuai lisensi masing-masing. Manifest workspace dan `pnpm-lock.yaml` menjadi daftar versi dependency yang tepat untuk setiap build.

| Komponen yang sudah dideklarasikan                                  | Lisensi upstream |
| ------------------------------------------------------------------- | ---------------- |
| Next.js, React, React DOM, Tailwind CSS, `@tailwindcss/postcss`     | MIT              |
| Supabase JS, SSR client, Supabase CLI                               | MIT              |
| Zod, TypeScript, `@types/node`, `@types/react`, `@types/react-dom`  | MIT              |
| ESLint, `@eslint/js`, `eslint-plugin-boundaries`, typescript-eslint | MIT              |
| Prettier, Turbo, Vitest                                             | MIT              |
| Playwright                                                          | Apache-2.0       |

Komponen lain dalam spesifikasi akan dicatat saat ditambahkan ke workspace. TailAdmin belum diintegrasikan; catatan commit dan lisensinya harus ditambahkan sebelum kode atau aset TailAdmin digunakan.
