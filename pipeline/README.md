# Pipeline pembaca abstrak ilmiah

Proyek ini memakai Anvia untuk mengekstrak abstrak ke SQLite, membandingkannya
dengan judul penelitian, dan menjelaskan isinya. Setiap pipeline punya minimal
dua tahap `.step()` berantai.

| Pipeline | Pattern | Tahap |
| --- | --- | --- |
| `extract-abstraction` | Extraction | Siapkan teks, ekstrak dengan schema, simpan ke SQLite |
| `match-topic` | Penilaian terstruktur oleh LLM | Ambil abstrak, lalu minta LLM menilai kecocokan judul dan memberi rekomendasi |
| `explain-abstract` | Evaluator-optimizer | Ambil abstrak, buat penjelasan, evaluasi, revisi maksimal sekali dan periksa ulang |

## Struktur folder

```text
src/
├── index.ts                       # Entrypoint CLI
├── studio.ts                      # Entrypoint Anvia Studio
├── db/
│   ├── schema.sql                 # Definisi tabel, tanpa data atau kredensial
│   └── sqlite.ts                  # Memuat schema dan mengakses SQLite
├── providers/
│   └── openai.ts                  # Konfigurasi model
├── web/
│   ├── abstract.html              # Form teks biasa dan hasil ekstraksi
│   └── abstract-route.ts          # Endpoint form yang memanggil pipeline
└── pipelines/
    ├── extract-abstraction.ts     # Pipeline 1
    ├── match-topic.ts             # Pipeline 2
    ├── explain-abstract.ts        # Pipeline 3
    ├── source-evidence.ts         # Pemeriksaan kutipan bersama
    └── source-evidence.test.ts    # Test berdampingan dengan kode
```

Kode aplikasi berada di `src/`; konfigurasi, `.env`, dan `research.sqlite`
tetap di root. Jalankan perintah dari root proyek agar lokasi DB tetap sama.
Pipeline mengatur urutan kerja, provider menyiapkan model, dan modul DB
membaca serta menyimpan abstrak.

`initializeDatabase()` membaca `src/db/schema.sql` relatif terhadap modul,
bukan working directory. Jika file belum ada, script membuatnya dari definisi
tabel bawaan sebelum inisialisasi DB. File yang sudah ada tidak ditimpa;
error izin akses dan SQL yang rusak tetap ditampilkan.

Schema boleh masuk Git; file database lokal, sidecar SQLite, dan `.env`
dikecualikan melalui `.gitignore`.

## Menjalankan

```bash
bun install
```

Isi `BASE_URL` dan `API_KEY` di `.env` untuk provider OpenAI-compatible. Model
yang dipakai mengikuti `src/providers/openai.ts`. Jangan commit kredensial.

```bash
# Buka menu interaktif, tanpa argumen.
bun run start

# Pemeriksaan tipe.
bun run typecheck

# Jalankan pengujian.
bun run test

# Form teks biasa: http://127.0.0.1:4021/abstract
bun run studio
```

CLI memakai menu pilihan: **Ekstrak abstrak**, **Cocokkan judul penelitian**,
**Jelaskan abstrak**, dan **Keluar**. Gunakan tombol
panah dan Enter; Ctrl+C membatalkan sesi. Perintah dengan argumen diganti menu ini.

Untuk ekstraksi, pilih tempel teks (Enter dua kali untuk selesai) atau masukkan
lokasi file teks. Konfirmasi sebelum abstrak dikirim ke API dan disimpan.
Untuk matching atau penjelasan, pilih abstrak dari daftar yang bisa dicari
berdasarkan ID atau cuplikan teks; tidak perlu mengetik ID secara manual.
Abstrak lama tanpa teks sumber tidak ditampilkan dan perlu diekstrak ulang.

Hasil ditampilkan sebagai JSON lengkap dalam panel terminal. Ada indikator saat
model bekerja; setelah selesai atau gagal, CLI kembali ke menu.
Semua analisis memakai API model dan dapat dikenai biaya.

Buka `/abstract`, tempel abstrak, lalu pilih **Ekstrak dan simpan**. Tidak perlu
format JSON atau mengubah tanda kutip dan baris baru. Setelah selesai, gunakan
ID yang muncul untuk pipeline lain. Panel Studio di `/pipelines` tetap memakai
input JSON untuk debugging.

Server hanya berjalan di localhost. Jika port 4021 terpakai, tentukan port lain
lewat `RUNNER_PORT`. Setiap ekstraksi yang berhasil menyimpan satu baris baru
dan memakai API model.

Server menyisipkan `src/web/studio-layout.css` untuk memperbaiki panel tab
Studio 1.5 yang memotong log panjang. Panel kanan dapat di-scroll tanpa
mengubah package di `node_modules`. Restart Studio setelah perubahan CSS.

Form **Bandingkan judul dengan abstrak** menerima judul penelitian dan ID
abstrak tersimpan. ID terisi otomatis setelah ekstraksi. LLM membandingkan
fokus, objek, metode, dan konteks, lalu memberi keputusan, alasan, aspek yang
belum tercakup, serta rekomendasi sesuai isi abstrak. Informasi yang tidak
disebutkan dibedakan dari pertentangan eksplisit.

Kode memeriksa format keluaran, kelengkapan empat aspek, dan ID bukti sumber.
Kode tidak menghitung kecocokan atau memilih rekomendasi dari daftar tetap.
Karena tidak ada percabangan berdasarkan verdict, pipeline ini bukan lagi
contoh pattern Router. Hasilnya tidak disimpan sebagai temuan penelitian dan
tidak menilai kualitas ilmiah paper.

Input pipeline `match-topic` di Studio sekarang memakai `title`, bukan `topic`:

```json
{"abstractionId": 1, "title": "Analisis Perbandingan gRPC dan ZeroMQ"}
```

SQLite menggunakan `research.sqlite` di working directory. Gunakan `DB_PATH`
untuk menentukan file lain. Inisialisasi menambahkan `original_text` jika kolom
belum tersedia, tanpa menghapus data. Baris lama yang tidak memiliki sumber
harus diekstrak ulang sebelum dipakai pipeline 2 atau 3.

Pipeline 1 menyimpan teks asli persis dari input bersama hasil ekstraksi.
Setiap eksekusi ekstraksi membuat baris baru. Pipeline 2 dan 3 membaca baris
tersebut dan mencetak hasil; hasil analisis keduanya tidak disimpan ke DB.

## Batas interpretasi

- Relevansi topik bukan bukti bahwa hipotesis benar atau paper berkualitas.
- Perbandingan judul memilih ID kalimat sumber; kode mengambil kutipan langsung
  dari kalimat tersebut dengan normalisasi spasi. Model tidak menulis ulang
  kutipannya. Sumber asli tetap utuh. Ini tidak menjamin penalaran model benar.
- Penjelasan dibatasi isi abstrak, bukan paper lengkap. Evaluator memeriksa
  draf terhadap sumber. Jika revisi masih bermasalah, output `needs_review`
  menyertakan isu yang belum selesai, bukan menyatakan hasil valid.
- Schema memeriksa bentuk data, bukan kebenaran ilmiah. Teks dokumen dan
  judul diperlakukan sebagai data, bukan instruksi.

Referensi: [Anvia Pipelines](https://docs.anvia.dev/sdk/pipelines.html),
[Structured output](https://docs.anvia.dev/sdk/structured-output.html),
[Devscale Day 4](https://apeiii.devscale.id/day/4/4), dan
[Bun SQLite](https://bun.sh/docs/api/sqlite).
