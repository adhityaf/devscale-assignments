import { autocomplete, cancel, confirm, intro, isCancel, log, multiline, note, outro, select, spinner, text } from "@clack/prompts";
import { stripVTControlCharacters } from "node:util";
import { extractAbstraction } from "./pipelines/extract-abstraction.ts";
import { matchTopic } from "./pipelines/match-topic.ts";
import { explainAbstract } from "./pipelines/explain-abstract.ts";
import { initializeDatabase, listAbstractions } from "./db/sqlite.ts";

class Cancelled extends Error {}

async function answer<T>(prompt: Promise<T>): Promise<Exclude<T, symbol>> {
  const value = await prompt;
  if (isCancel(value)) throw new Cancelled();
  return value as Exclude<T, symbol>;
}

function showResult(title: string, result: unknown) {
  note(JSON.stringify(result, null, 2), title);
}

async function runStage<T>(message: string, run: () => Promise<T>): Promise<T> {
  const progress = spinner();
  progress.start(message);
  try {
    const result = await run();
    progress.stop("Selesai.");
    return result;
  } catch (error) {
    progress.error("Proses gagal.");
    throw error;
  }
}

async function chooseAbstract() {
  const abstracts = listAbstractions();
  if (abstracts.length === 0) {
    log.warn("Belum ada abstrak dengan teks sumber. Pilih Ekstrak abstrak terlebih dahulu.");
    return null;
  }
  return answer(autocomplete({
    message: "Pilih abstrak tersimpan (ketik untuk mencari)",
    options: [
      { value: null, label: "Kembali ke menu" },
      ...abstracts.map((abstract) => ({
        value: abstract.id,
        label: `#${abstract.id} — ${stripVTControlCharacters(abstract.preview).replace(/\s+/g, " ").trim()}`,
      })),
    ],
  }));
}

async function askTitle() {
  return (await answer(text({
    message: "Apa judul penelitianmu?",
    placeholder: "Analisis Perbandingan gRPC dan ZeroMQ",
    validate: (value) => !value?.trim()
      ? "Judul tidak boleh kosong."
      : value.trim().length > 2000 ? "Maksimal 2.000 karakter." : undefined,
  }))).trim();
}

async function extract() {
  const sourceType = await answer(select({
    message: "Ambil abstrak dari mana?",
    options: [
      { value: "paste", label: "Tempel teks abstrak", hint: "mendukung beberapa baris" },
      { value: "file", label: "Baca file teks (.txt)" },
      { value: "back", label: "Kembali ke menu" },
    ],
  }));
  if (sourceType === "back") return;
  let source: string;
  if (sourceType === "file") {
    const filename = await answer(text({
      message: "Lokasi file teks abstrak",
      placeholder: "./abstract.txt",
      validate: (value) => !value?.trim() ? "Lokasi file tidak boleh kosong." : undefined,
    }));
    source = await Bun.file(filename.trim()).text();
  } else {
    source = await answer(multiline({
      message: "Tempel abstrak. Tekan Enter dua kali untuk melanjutkan.",
      validate: (value) => !value?.trim() ? "Abstrak tidak boleh kosong." : undefined,
    }));
  }
  if (!source.trim()) throw new Error("File abstrak kosong.");
  const approved = await answer(confirm({
    message: "Kirim abstrak ke API model dan simpan hasil ke DB? Biaya provider dapat berlaku.",
    initialValue: true,
  }));
  if (!approved) return;
  const result = await runStage("Mengekstrak abstrak dan menyimpan hasil…", () =>
    extractAbstraction.run({ input: { text: source } }));
  showResult(`Hasil ekstraksi — ID ${result.output.id}`, result.output);
}

async function match(abstractionId: number, title: string) {
  const result = await runStage("LLM membandingkan judul dengan abstrak…", () =>
    matchTopic.run({ input: { abstractionId, title } }));
  showResult("Hasil kecocokan topik", result.output);
  log.info("Kecocokan topik bukan penilaian kualitas ilmiah paper.");
}

async function explain(abstractionId: number) {
  const result = await runStage("Membuat, mengevaluasi, dan memeriksa penjelasan…", () =>
    explainAbstract.run({ input: { abstractionId } }));
  showResult("Penjelasan abstrak", result.output);
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("CLI membutuhkan terminal interaktif. Jalankan bun run start langsung di terminal.");
  }
  initializeDatabase();
  intro("Pembaca abstrak ilmiah");
  log.info("Gunakan ↑/↓ dan Enter untuk memilih. Ctrl+C untuk keluar. Hasil analisis memakai API model.");
  while (true) {
    const action = await answer(select({
      message: "Apa yang ingin kamu lakukan?",
      options: [
        { value: "extract", label: "Ekstrak abstrak", hint: "tempel teks atau baca file" },
        { value: "match", label: "Cocokkan judul penelitian", hint: "pilih abstrak tersimpan" },
        { value: "explain", label: "Jelaskan abstrak", hint: "penjelasan dan evaluasi" },
        { value: "exit", label: "Keluar" },
      ],
    }));
    if (action === "exit") break;
    try {
      if (action === "extract") {
        await extract();
      } else {
        const id = await chooseAbstract();
        if (id === null) continue;
        if (action === "match") await match(id, await askTitle());
        else await explain(id);
      }
    } catch (error) {
      if (error instanceof Cancelled) throw error;
      log.error(stripVTControlCharacters(error instanceof Error ? error.message : String(error)));
      log.info("Kembali ke menu. Hasil ekstraksi yang sudah tersimpan tetap tersedia.");
    }
  }
  outro("Sesi selesai.");
}

main().catch((error: unknown) => {
  if (error instanceof Cancelled) {
    cancel("Sesi dibatalkan.");
    return;
  }
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});