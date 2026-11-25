# Devscale Assignments

Kumpulan tugas dan latihan selama mengikuti bootcamp Devscale. Setiap assignment
berada di folder terpisah, dengan kode dan petunjuk penggunaan masing-masing.
Repo ini akan bertambah seiring materi dan tugas yang dikerjakan.

## Daftar assignment

| Folder | Deskripsi | Dokumentasi |
| --- | --- | --- |
| [`pipeline/`](./pipeline/) | Tiga pipeline AI untuk mengekstrak abstrak ilmiah, mencocokkan judul penelitian, dan menjelaskan isi abstrak. Menggunakan TypeScript, Bun, Anvia, dan SQLite. | [README pipeline](./pipeline/README.md) |

## Mulai menggunakan

Clone repo ini:

```bash
git clone https://github.com/adhityaf/devscale-assignments.git
cd devscale-assignments
```

Pilih folder assignment, lalu ikuti README di dalamnya untuk instalasi,
konfigurasi, cara menjalankan, dan pengujian. Tidak ada perintah instalasi atau
menjalankan aplikasi bersama di root repo.

Untuk assignment pipeline:

```bash
cd pipeline
bun install
```

Lanjutkan dengan [konfigurasi dan petunjuk menjalankan pipeline](./pipeline/README.md#menjalankan).

## Struktur repo

```text
devscale-assignments/
├── README.md
└── pipeline/
    ├── README.md
    ├── package.json
    └── src/
```

Assignment berikutnya ditambahkan sebagai folder baru di root, disertai README
untuk menjelaskan tujuan, kebutuhan, dan cara penggunaannya.

## Konfigurasi lokal

Kebutuhan runtime dan environment variable dapat berbeda untuk setiap assignment.
Simpan kredensial di `.env` lokal dan jangan commit API key, file database lokal,
atau dependencies seperti `node_modules/`. Assignment yang memakai layanan AI
memerlukan akses provider; pemakaian API dapat dikenai biaya.
