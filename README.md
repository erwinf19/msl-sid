# MLBB SID LEAGUE

Website statis MSL untuk turnamen internal PT. Semesta Integrasi Digital.

## Memperbarui turnamen

Semua data ada di `dist/tournament-data.js`. Gunakan prompt AI seperti:

> Ubah hasil m3, Sky Sentinels vs Lunar Wolves, menjadi 2–1. Jangan ubah match lain.

> Ganti nama Dawn Raiders menjadi [nama baru]. Ubah roster sesuai urutan Jungler, Gold Lane, EXP Lane, Roamer, Mid Lane: [lima username].

> Ganti seluruh data contoh dengan data resmi berikut, lalu set demo menjadi false. Hapus hasil simulasi yang tidak termasuk data resmi.

`score: null` berarti belum selesai. Hasil BO3 yang valid: `[2,0]`, `[2,1]`, `[1,2]`, `[0,2]`. Klasemen dan hadiah dihitung dari skor ini. Satu kemenangan bernilai 1 poin; pengurutan sementara: poin, net game win, game win, lalu alfabet nama tim. Aturan tiebreak resmi perlu dikonfirmasi panitia; nama tim bukan tiebreak kompetitif.

Tanggal contoh dimulai 6 Oktober 2026, setelah periode registrasi pada banner. Jadwal 2 match per pekan, Selasa dan Kamis pukul 12.15 WIB. Single round-robin untuk 6 tim menghasilkan 15 match, sehingga pekan ke-8 hanya ada satu match. Semua pertandingan belum memiliki hasil (`score: null`), sehingga seluruh statistik klasemen dimulai dari nol. Tim dan username seluruhnya contoh, tanpa logo tim profesional. Nama contoh bukan hasil pemeriksaan merek dagang.

## Rekomendasi pengelolaan

Untuk satu panitia, gunakan satu file data dan pembaruan via prompt. Perubahan perlu diterbitkan ulang supaya terlihat oleh pengunjung. Form admin belum diperlukan. Jika nanti beberapa panitia mengelola secara bersamaan, tambahkan login admin dan penyimpanan bersama; hindari penyimpanan browser untuk hasil resmi karena tidak sinkron antarpengguna.

## Menjalankan

Jalankan `python3 -m http.server 4173 --directory dist`, kemudian buka `http://localhost:4173`.

Validasi logika: `node --test tests/league.test.mjs`.

Tidak ada proses build atau dependency aplikasi. Font Barlow dan Barlow Condensed dimuat dari Google Fonts dengan fallback lokal. Aset logo dan banner asli berada di `dist/assets/`.

Logo kelima business unit yang diberikan pengguna berada di `dist/assets/business-units/`. Ikon role menggunakan lima viewport SVG pada `app.js`, masing-masing menampilkan area berbeda dari `dist/assets/mlbb-role-sheet.webp`. Gambar asli tetap utuh; tampilan ikon dipisahkan tanpa menggambar ulang, termasuk mempertahankan latar asli.

Match `m1` memiliki `previewScore: [2,1]` untuk meninjau desain hasil selesai. Nilai ini hanya tampil ketika `demo: true` dan skor resmi masih `null`; tidak memengaruhi klasemen. Untuk mencatat hasil resmi, isi `score` dan hapus `previewScore`. Aset diamond dari pengguna disimpan sebagai `diamond-icon.png` dan `diamond-chest.webp` pada `dist/assets/`.
