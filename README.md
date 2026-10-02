# MLBB SID LEAGUE

Website statis MSL, siap dihosting di Netlify tanpa backend, database, atau dependency aplikasi.

## Menjalankan

Gunakan Node.js 22 atau lebih baru. Jalankan `npm start`, lalu buka `http://127.0.0.1:4173`. Jalankan `npm test` untuk menguji undian, ekspor, password, roster beranda, klasemen, dan jadwal. Netlify cukup mempublikasikan direktori proyek, tanpa build command. Verifikasi password menggunakan Web Crypto sehingga membutuhkan HTTPS atau localhost.

## Generate → download → commit → deploy

1. Buka `/player-data` dari navigasi beranda.
2. Generate Jungler, Goldlaner, Explaner, Midlaner, lalu Roamer.
3. Pilih nama/logo yang berbeda untuk seluruh 8 team.
4. Tombol **Kunci Roster** di dekat Generate baru aktif ketika seluruh 42 player dan 8 nama team lengkap.
5. Klik Kunci Roster dan masukkan password. Password salah tidak mengunci roster dan tidak menghasilkan file. Password benar memfinalisasi roster serta langsung mengunduh JSON.
6. Simpan file unduhan **draft-team-msl.json** dengan menggantikan **assets/draft-team-msl.json** di repository ini. Jangan mengganti `player-msl.json`. Jika browser menambahkan `(1)` pada nama unduhan, ubah kembali menjadi `draft-team-msl.json`.
7. Commit dan push file tersebut, kemudian deploy ulang Netlify. Beranda membaca file yang dipublikasikan: nama, logo, roster 5–6 player, dan identitas team di klasemen serta jadwal akan ikut berubah.

Sebelum publikasi pertama, file `assets/draft-team-msl.json` berisi delapan team kosong (`finalized: false`). Beranda menampilkan delapan slot menunggu, tanpa player contoh. File hasil download menggunakan schema yang sama, dengan `finalized: true`, waktu ekspor, dan roster lengkap.

Draft sementara hanya disimpan pada localStorage browser dengan kunci `msl-team-draft-v1`. Draft dapat dilanjutkan setelah reload. Mengacak, mengganti nama, atau menghapus draft browser tidak mengubah beranda; beranda tidak membaca localStorage. Data yang sudah dipublikasikan hanya berubah ketika file repository diganti dan di-deploy kembali. Tidak ada Submit Data atau penulisan otomatis ke server.

## Password download

`download-password.js` menyimpan salt acak dan hash PBKDF2-SHA-256 dengan 600.000 iterasi. Password asli tidak disimpan di source, localStorage, atau file hasil download, dan tidak dikirim ke server. Input dibersihkan setelah verifikasi maupun saat dialog ditutup.

Karena seluruh aplikasi bersifat statis, pemeriksaan password di browser hanya mengunci alur UI. Pengguna yang dapat menjalankan atau mengubah JavaScript bisa melewati pemeriksaan dan membuat JSON sendiri; hash publik juga bisa menjadi sasaran tebakan offline. Ini bukan otorisasi admin atau perlindungan data rahasia. Integritas publikasi bergantung pada akses commit/deploy ke repository dan Netlify. Data roster yang sudah dipublikasikan memang tersedia untuk pengunjung.

## Data player dan logo

Player berasal dari `assets/player-msl.json`. Ada 8 Jungler, 8 Goldlaner, 8 Explaner, 9 Midlaner, dan 9 Roamer. Hasil undian terdiri dari enam team berisi lima player dan dua team berisi enam player. Player Midlaner tambahan dan Roamer tambahan selalu berada di team berbeda.

Halaman **Player Data** memakai URL `/player-data`; tautan navbar membuka halaman ini. Tabel menampilkan nama/username, role dengan lima warna berbeda, BU/Function, ID Telegram yang bisa diklik, serta team. Data profil 42 player disimpan di sumber player melalui `businessUnit`, `jobTitle`, dan `telegram`. Pencarian juga mencakup BU/Function dan Telegram. Pada layar kecil seluruh kolom tersedia melalui geser horizontal.

Perubahan profil tidak mengubah signature identitas undian, sehingga draft lama tetap bisa dilanjutkan. Ekspor JSON baru menyertakan profil, sedangkan JSON roster lama tanpa profil masih diterima. Nama, username, dan role tetap divalidasi terhadap sumber; data profil yang disertakan dalam ekspor juga harus sesuai.

Logo berasal dari `assets/logo-team/`, dengan daftar file di `assets/logo-team.json`. Nama team diambil dari nama file tanpa ekstensi. Perbarui manifest saat menambah/menghapus logo. Saat ini ada 14 logo dalam grid empat kolom.

Beranda memvalidasi JSON publikasi terhadap sumber player dan logo: jumlah team, keunikan player/nama, role, identitas player, dan path logo. File yang rusak atau tidak cocok menampilkan pesan kesalahan; draft browser tidak digunakan sebagai pengganti. Jika mengubah sumber player, buat dan publikasikan ulang JSON hasil undian yang sesuai.

## Klasemen dan jadwal

`tournament-data.js` menyediakan aturan skor dan jadwal round-robin: 8 team, 28 match, mulai 6 Oktober sampai 10 Desember 2026 selama 10 pekan. Jumlah match per pekan adalah 3, 3, 3, 2, 3, 3, 2, 3, 3, 3. Match berlangsung Selasa, Rabu, dan Kamis pukul 12.15 WIB; pekan 4 dan 7 hanya Selasa–Rabu. Setiap tim bertemu tujuh lawan sekali dan bermain maksimal sekali per pekan. ID slot team tetap konsisten ketika nama dan roster diperbarui.

Beranda menampilkan jadwal per pekan. `/full-schedule` menampilkan seluruh 28 match secara vertikal, dikelompokkan per pekan, dengan navigasi untuk lompat ke pekan tertentu. Kedua halaman membaca sumber jadwal, nama team, skor, dan reward yang sama. Menu utama tetap aktif sesuai halaman, termasuk setelah membuka tautan langsung ke Player List/Random Team. Navigasi pekan mengikuti bagian jadwal yang dibuka atau digulir. Indikator navbar bergeser dengan animasi di semua halaman; tab tujuan tetap aktif selama scroll otomatis, tanpa memilih bagian yang hanya dilewati. Animasi mengikuti preferensi reduced motion perangkat.

Ekspor roster tidak memasukkan hasil pertandingan. Publikasi nama/roster tidak menghapus skor pertandingan yang sudah ada. `score: null` berarti belum selesai. Skor BO3 valid: `[2,0]`, `[2,1]`, `[1,2]`, `[0,2]`. Kemenangan bernilai 1 poin. Urutan klasemen: poin, net game win, game win, lalu nama team. Jadwal resmi dan skor dikelola di `tournament-data.js`.

Font Barlow dan Barlow Condensed menggunakan Google Fonts dengan fallback lokal. Ikon role menggunakan viewport dari `assets/mlbb-role-sheet.webp`. Pilihan tema terang/gelap disimpan terpisah pada `msl-theme`.

## Penguncian final dan mode pemeliharaan

Sebelum Kunci Roster dikonfirmasi dengan password, seluruh draft boleh diulang, termasuk sesudah kelima role dan delapan nama selesai. Nama team dapat diganti selama tetap unik. Generate, Kunci Roster, dan Ulangi undian berada dalam panel kontrol yang sama.

Setiap Generate memulai animasi undian nama, countdown, dan pembagian satu player setiap 3 detik, dari Team 01 sampai Team 08. Pemain tambahan Mid Lane/Roamer diumumkan terakhir dengan jeda yang sama. Satu role berisi 8 player membutuhkan sekitar 24 detik; role dengan 9 player sekitar 27 detik. Generate, Ulangi undian, nama team, dan Kunci Roster tidak dapat digunakan selama proses berjalan. Nama player di kartu dan Player List baru menjadi hasil undian setelah diumumkan.

Progres animasi memakai localStorage `msl-team-draw-animation-v1`. Hasil diacak sekali saat role dimulai, lalu diumumkan bertahap. Reload melanjutkan hasil yang sama dari player berikutnya; roster yang belum selesai tidak disimpan sebagai role lengkap. Browser yang mendukung Web Locks menjalankan animasi di satu tab, sementara tab lain mengikuti progres yang sama. Preferensi reduced motion menghilangkan efek berputar/pergantian nama cepat, dengan jeda pembagian tetap 3 detik.

Kunci Roster hanya aktif saat 42 player dan delapan nama team lengkap. Password salah atau membatalkan dialog tidak mengubah draft. Password benar menambahkan `locked: true` dan `lockedAt` ke draft browser, lalu men-download JSON final (`finalized: true`, `locked: true`). Setelah itu reset dan penggantian nama tidak tersedia, termasuk setelah reload. Tombol Kunci Roster berubah menjadi Download JSON untuk mengunduh ulang dengan password.

Setelah file hasil dipublikasikan, Choose Team memuat roster resmi dari JSON dan mengabaikan draft browser. Beranda tetap menggunakan hasil yang di-commit dan di-deploy. Grid hasil team di kedua halaman berisi empat kolom dan dua baris. Pada layar sempit grid dapat digeser horizontal agar teks pemain tetap terbaca.

Sakelar pemeliharaan ada di **draft-policy.js**:

```js
export const ALLOW_FINAL_TEAM_CHANGES = false;
```

Membuka kembali roster final memerlukan perubahan konstanta menjadi `true` secara manual, commit, dan deploy ulang. Tidak ada tombol atau password yang mengubah flag ini. Setelah pemeliharaan, kembalikan ke `false` sebelum mempublikasikan roster baru. Jangan mengubah `finalized` menjadi false pada file berisi roster; nilai false hanya untuk delapan slot kosong awal.

Pada website statis, penguncian menegakkan alur UI. Publikasi data resmi tetap membutuhkan akses repository/deploy.

## Event Guide / Technical Meeting

`/event-guide` merangkum delapan topik technical meeting: latar belakang, timeline dan ketentuan umum, struktur team, format dan klasemen, peraturan teknis, reward, etika, serta penayangan. Halaman tersedia dari navbar. Mode Presentasi menampilkan satu topik sekaligus; gunakan navigasi topik, tombol sebelumnya/berikutnya, atau panah kiri/kanan. Escape keluar dari presentasi. Seluruh materi tetap tersedia tanpa JavaScript. Timeline, reward, dan aturan mengikuti materi panitia; jadwal tetap pukul 12:15 WIB.

Navigasi utama seluruh halaman memakai urutan yang sama: Beranda, Jadwal Lengkap, Player Data, dan Event Guide. Daftar link dikelola bersama melalui `site-navigation.js`; tab aktif mengikuti halaman dan tidak berubah ketika bagian di dalam halaman digulir. HTML setiap halaman juga menyediakan menu yang sama sebelum JavaScript berjalan.

## URL halaman

Beranda: `/`; Jadwal Lengkap: `/full-schedule`; Player Data: `/player-data`; Event Guide: `/event-guide`. Server lokal melayani URL ini dan mengalihkan tautan `.html` lama (termasuk query dan anchor) ke URL baru. Restart `npm start` setelah mengubah server. Netlify memakai `_redirects` untuk pengalihan 301 dan rewrite 200, serta `netlify.toml` untuk menonaktifkan normalisasi Pretty URLs bawaan. Commit kedua file konfigurasi tersebut dan deploy ulang agar URL baru aktif di Netlify. Asset menggunakan path dari root agar tetap tersedia saat halaman dibuka langsung atau memakai trailing slash.

## Link streaming per pertandingan

Isi field `streamUrl` di `assets/match-streams.json` untuk match yang sesuai. File berisi 28 entri dengan ID, pekan, tanggal, dan ID slot kedua team. Jangan ubah field identitas pertandingan; hanya ganti linknya. Nama team yang tampil tetap mengikuti roster resmi. Contoh untuk match m1 (6 Oktober 2026, slot dawn vs jade):

```json
{
  "id": "m1",
  "week": 1,
  "date": "2026-10-06",
  "teamA": "dawn",
  "teamB": "jade",
  "streamUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Ini contoh format; seluruh link dalam file awal kosong. Gunakan URL HTTP/HTTPS lengkap. Kosongkan `streamUrl` dengan `""` jika link belum tersedia. Beranda dan `/full-schedule` membaca JSON yang sama: match dengan link menampilkan tombol Tonton Live, sedangkan match selesai menampilkan Tonton Siaran. Link dibuka pada tab baru. Tanpa link, kartu menampilkan Belum tersedia. Refresh untuk melihat perubahan lokal; commit/push dan deploy ulang untuk Netlify. Jika file streaming tidak dapat dimuat atau tidak valid, jadwal tetap ditampilkan.

## Broadcast dan detail pertandingan

Setiap match di beranda dan jadwal lengkap menyediakan **Detail & pemain** serta **Bagikan match**. Detail menampilkan seluruh roster resmi kedua team, role, peringkat, poin, match win/lose, game win/lose, dan net game berdasarkan klasemen saat ini. Roster yang belum dipublikasikan ditampilkan sebagai status menunggu; skor contoh tidak masuk statistik.

Di jadwal lengkap, setiap pekan juga mempunyai **Bagikan pekan**. Popup broadcast menyediakan preview teks dengan emoji dan jarak antar informasi, tombol salin, serta tautan ke pemilih chat Telegram. Pengguna memilih tujuan dan mengirim sendiri. Jika clipboard tidak tersedia, teks dipilih untuk disalin manual. Broadcast menggunakan nama team resmi, tanggal/jam match, hasil jika sudah selesai, link streaming jika tersedia, dan URL halaman dengan anchor pertandingan/pekan. URL memakai domain tempat website dibuka; gunakan versi Netlify saat ingin membagikan tautan publik.
