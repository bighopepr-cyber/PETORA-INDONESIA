import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const name = process.argv[2]
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_|_$/g, "");

if (!name) {
  process.stderr.write("Gunakan: pnpm db:new <nama_migration>\n");
  process.exitCode = 1;
} else {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const directory = resolve("supabase/migrations");
  const path = resolve(directory, `${timestamp}_${name}.sql`);

  await mkdir(directory, { recursive: true });
  await writeFile(
    path,
    "-- Tambahkan perubahan skema yang kompatibel di sini.\n",
    { flag: "wx" },
  );
  process.stdout.write(`Migration dibuat: ${path}\n`);
}
