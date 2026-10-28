import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const result = spawnSync("supabase", ["status", "--output", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(
    "Supabase Local belum siap. Jalankan pnpm supabase:start terlebih dahulu.",
  );
}

const values = new Map(
  result.stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^(API_URL|ANON_KEY)=(.*)$/))
    .filter((match) => match !== null)
    .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")]),
);
const apiUrl = values.get("API_URL");
const anonKey = values.get("ANON_KEY");

if (!apiUrl || !anonKey) {
  throw new Error("Supabase CLI tidak mengembalikan API_URL dan ANON_KEY.");
}

const target = resolve("apps/web/.env.local");
await mkdir(resolve("apps/web"), { recursive: true });
await writeFile(
  target,
  [
    `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
    "NEXT_PUBLIC_APP_URL=http://localhost:3000",
    "NEXT_PUBLIC_APP_NAME=PETORA",
    "",
  ].join("\n"),
  { mode: 0o600 },
);
process.stdout.write(
  "Konfigurasi Supabase Local ditulis ke apps/web/.env.local.\n",
);
