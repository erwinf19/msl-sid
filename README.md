# MLBB SID LEAGUE

Website statis MSL, siap dihosting di Netlify tanpa backend, database, atau dependency aplikasi.

## Menjalankan

Gunakan Node.js 22 atau lebih baru. Jalankan `npm start`, lalu buka `http://127.0.0.1:4173`. Jalankan `npm test` untuk menguji undian, ekspor, password, roster beranda, klasemen, dan jadwal. Netlify cukup mempublikasikan direktori proyek, tanpa build command. Verifikasi password menggunakan Web Crypto sehingga membutuhkan HTTPS atau localhost.

## Generate → download → commit → deploy

1. Buka `choose-team.html` dari navigasi beranda.
2. Generate Jungler, Goldlaner, Explaner, Midlaner, lalu Roamer.
3. Pilih nama/logo yang berbeda untuk seluruh 8 team.
4. Tombol **Download hasil JSON** baru aktif ketika seluruh 42 player dan 8 nama team lengkap.
5. Masukkan password yang sudah ditentukan pada dialog download. Password salah tidak menghasilkan file. Setiap download meminta password kembali.
6. Simpan file unduhan **draft-team-msl.json** dengan menggantikan **assets/draft-team-msl.json** di repository ini. Jangan mengganti `player-msl.json`. Jika browser menambahkan `(1)` pada nama unduhan, ubah kembali menjadi `draft-team-msl.json`.
7. Commit dan push file tersebut, kemudian deploy ulang Netlify. Beranda membaca file yang dipublikasikan: nama, logo, roster 5–6 player, dan identitas team di klasemen serta jadwal akan ikut berubah.

Sebelum publikasi pertama, file `assets/draft-team-msl.json` berisi delapan team kosong (`finalized: false`). Beranda menampilkan delapan slot menunggu, tanpa player contoh. File hasil download menggunakan schema yang sama, dengan `finalized: true`, waktu ekspor, dan roster lengkap.

Draft sementara hanya disimpan pada localStorage browser dengan kunci `msl-team-draft-v1`. Draft dapat dilanjutkan setelah reload. Mengacak, mengganti nama, atau menghapus draft browser tidak mengubah beranda; beranda tidak membaca localStorage. Data yang sudah dipublikasikan hanya berubah ketika file repository diganti dan di-deploy kembali. Tidak ada Submit Data atau penulisan otomatis ke server.

## Password download

`download-password.js` menyimpan salt acak dan hash PBKDF2-SHA-256 dengan 600.000 iterasi. Password asli tidak disimpan di source, localStorage, atau file hasil download, dan tidak dikirim ke server. Input dibersihkan setelah verifikasi maupun saat dialog ditutup.

Karena seluruh aplikasi bersifat statis, pemeriksaan password di browser hanya mengunci alur UI. Pengguna yang dapat menjalankan atau mengubah JavaScript bisa melewati pemeriksaan dan membuat JSON sendiri; hash publik juga bisa menjadi sasaran tebakan offline. Ini bukan otorisasi admin atau perlindungan data rahasia. Integritas publikasi bergantung pada akses commit/deploy ke repository dan Netlify. Data roster yang sudah dipublikasikan memang tersedia untuk pengunjung.

## Data player dan logo

Player berasal dari `assets/player-msl.json`. Ada 8 Jungler, 8 Goldlaner, 8 Explaner, 9 Midlaner, dan 9 Roamer. Hasil undian terdiri dari enam team berisi lima player dan dua team berisi enam player. Player Midlaner tambahan dan Roamer tambahan selalu berada di team berbeda.

Logo berasal dari `assets/logo-team/`, dengan daftar file di `assets/logo-team.json`. Nama team diambil dari nama file tanpa ekstensi. Perbarui manifest saat menambah/menghapus logo. Saat ini ada 14 logo dalam grid empat kolom.

Beranda memvalidasi JSON publikasi terhadap sumber player dan logo: jumlah team, keunikan player/nama, role, identitas player, dan path logo. File yang rusak atau tidak cocok menampilkan pesan kesalahan; draft browser tidak digunakan sebagai pengganti. Jika mengubah sumber player, buat dan publikasikan ulang JSON hasil undian yang sesuai.

## Klasemen dan jadwal

`tournament-data.js` menyediakan aturan skor dan jadwal contoh round-robin: 8 team, 28 match, Selasa dan Kamis pukul 12.15 WIB, mulai 6 Oktober 2026 selama 14 pekan. Jadwal belum resmi. ID slot team tetap konsisten ketika nama dan roster diperbarui.

Ekspor roster tidak memasukkan hasil pertandingan. Publikasi nama/roster tidak menghapus skor pertandingan yang sudah ada. `score: null` berarti belum selesai. Skor BO3 valid: `[2,0]`, `[2,1]`, `[1,2]`, `[0,2]`. Kemenangan bernilai 1 poin. Urutan klasemen: poin, net game win, game win, lalu nama team. Jadwal resmi dan skor dikelola di `tournament-data.js`.

Font Barlow dan Barlow Condensed menggunakan Google Fonts dengan fallback lokal. Ikon role menggunakan viewport dari `assets/mlbb-role-sheet.webp`. Pilihan tema terang/gelap disimpan terpisah pada `msl-theme`.

## Penguncian final dan mode pemeliharaan

Setelah kelima role selesai, roster terkunci: tombol Ulangi undian tidak aktif. Setiap team hanya bisa memilih nama sekali. Setelah kedelapan nama terisi, seluruh hasil otomatis menjadi final, termasuk ketika halaman di-reload. Download masih tersedia dengan password, tetapi password tidak membuka pengeditan.

File ekspor memiliki `finalized: true` dan `locked: true`. Setelah file ini dipublikasikan, Choose Team memuat roster resmi dari JSON, mengabaikan draft lama di browser, dan mengunci generate/reset/pilihan nama untuk semua pengunjung. File lama tanpa properti `locked` juga dikunci jika sudah `finalized: true`.

Satu-satunya sakelar pemeliharaan di aplikasi ada di **draft-policy.js**:

```js
export const ALLOW_FINAL_TEAM_CHANGES = false;
```

Untuk membuka perubahan, ubah konstanta itu menjadi `true` secara manual, commit, lalu deploy ulang. Tidak ada tombol atau input password untuk mengubah flag ini. Setelah pemeliharaan selesai, kembalikan ke `false` sebelum mempublikasikan roster baru. Jangan mengubah `finalized` menjadi false pada file berisi roster: nilai false disediakan hanya untuk delapan slot kosong awal. `locked` dalam JSON adalah penanda hasil final, bukan sakelar pemeliharaan.

Pada website statis, flag ini menegakkan alur UI, bukan otorisasi server: modifikasi JavaScript lokal tetap mungkin. Pengunjung tidak bisa menulis ulang JSON resmi di Netlify; perubahan resmi tetap membutuhkan akses repository/deploy.
