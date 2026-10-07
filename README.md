# MLBB SESI LEAGUE

Website statis MSL, siap dihosting di Netlify tanpa backend, database, atau dependency aplikasi.

## Menjalankan

Gunakan Node.js 22 atau lebih baru. Jalankan `npm start`, lalu buka `http://127.0.0.1:4173`. Jalankan `npm test` untuk menguji undian, ekspor, password, roster beranda, klasemen, dan jadwal. Netlify cukup mempublikasikan direktori proyek, tanpa build command. Verifikasi password menggunakan Web Crypto sehingga membutuhkan HTTPS atau localhost.

## Generate → download → commit → deploy

1. Buka `/player-data` dari navigasi beranda.
2. Generate Jungler, Goldlaner, Explaner, Midlaner, lalu Roamer.
3. Pilih nama/logo yang berbeda untuk seluruh 8 team.
4. Tombol **Kunci Roster** di dekat Generate baru aktif ketika seluruh player terdaftar dan 8 nama team lengkap.
5. Klik Kunci Roster dan masukkan password. Password salah tidak mengunci roster dan tidak menghasilkan file. Password benar memfinalisasi roster serta langsung mengunduh JSON.
6. Simpan file unduhan **draft-team-msl.json** dengan menggantikan **assets/draft-team-msl.json** di repository ini. Jangan mengganti `player-msl.json`. Jika browser menambahkan `(1)` pada nama unduhan, ubah kembali menjadi `draft-team-msl.json`.
7. Commit dan push file tersebut, kemudian deploy ulang Netlify. Beranda membaca file yang dipublikasikan: nama, logo, roster 5–6 player, dan identitas team di klasemen serta jadwal akan ikut berubah.

Sebelum publikasi pertama, file `assets/draft-team-msl.json` berisi delapan team kosong (`finalized: false`). Beranda menampilkan delapan slot menunggu, tanpa player contoh. File hasil download menggunakan schema yang sama, dengan `finalized: true`, waktu ekspor, dan roster lengkap.

Draft sementara hanya disimpan pada localStorage browser dengan kunci `msl-team-draft-v1`. Draft dapat dilanjutkan setelah reload. Mengacak, mengganti nama, atau menghapus draft browser tidak mengubah beranda; beranda tidak membaca localStorage. Data yang sudah dipublikasikan hanya berubah ketika file repository diganti dan di-deploy kembali. Tidak ada Submit Data atau penulisan otomatis ke server.

## Password download

`download-password.js` menyimpan salt acak dan hash PBKDF2-SHA-256 dengan 600.000 iterasi. Password asli tidak disimpan di source, localStorage, atau file hasil download, dan tidak dikirim ke server. Input dibersihkan setelah verifikasi maupun saat dialog ditutup.

Karena seluruh aplikasi bersifat statis, pemeriksaan password di browser hanya mengunci alur UI. Pengguna yang dapat menjalankan atau mengubah JavaScript bisa melewati pemeriksaan dan membuat JSON sendiri; hash publik juga bisa menjadi sasaran tebakan offline. Ini bukan otorisasi admin atau perlindungan data rahasia. Integritas publikasi bergantung pada akses commit/deploy ke repository dan Netlify. Data roster yang sudah dipublikasikan memang tersedia untuk pengunjung.

## Data player dan logo

Player berasal dari sumber `players` di `data-sources.js`; jika URL belum diisi, website memakai `assets/player-msl.json`. Saat ini ada 46 player: 10 Jungler dan masing-masing 9 Goldlaner, Explaner, Midlaner, dan Roamer. Furqon Ahmad Taher (`BakpaoCoklat`, Gold Lane, ID 42) masuk **Batavia**, Amrul Fikri (`arl17`, EXP Lane, ID 43) masuk **Gajah Mada**, dan Rachmat Basuki (`Cor@Zon`, Jungler, ID 44) masuk **Sadewa** melalui undian sebelumnya. Risno (`Cheese Milk`, ID 45) ditempatkan langsung di **Kalingga** sesuai permintaan, menjadi pemain keenam dengan role utama Jungler dan pilihan tambahan Goldlaner. Mughny Mubarak di **Warmadewa** mengganti username menjadi **SEPHORA**; ID internalnya tetap 35 dan role roster tetap Roamer. ID dan penempatan pemain sebelumnya tetap sama. Roster final tetap `finalized: true` dan `locked: true`. Registrasi berikutnya dapat menunggu di luar roster final sampai penempatan dipublikasikan.

Untuk undian baru 46 pemain, hasil terdiri dari dua team berisi lima player dan enam team berisi enam player. Setiap role memiliki minimal 8 player, dengan total maksimal 48 player. Pemain tambahan dibagi ke team berbeda; satu team hanya menerima satu pemain tambahan. Kunci roster baru tetap membutuhkan seluruh pemain terdaftar terbagi. Download ulang roster resmi yang terkunci tetap tersedia dengan password meskipun ada pemain baru menunggu undian.

Halaman **Player Data** memakai URL `/player-data`; tautan navbar membuka halaman ini. Tabel menampilkan nama/username, role dengan lima warna berbeda, BU/Function, ID Telegram, serta team. Kontak Telegram yang sesuai format username mendapat tautan; kontak seperti `@risno.14` disimpan sesuai input dan ditampilkan sebagai teks. Email seluruh 46 pemain tetap disimpan melalui field `email` di `assets/player-msl.json` dan salinan roster final untuk undangan Calendar, tetapi tidak ditampilkan atau dipakai untuk pencarian Player Data. Data profil player mencakup `businessUnit`, `jobTitle`, `telegram`, dan `email`; posisi tetap disimpan di data tanpa ditampilkan. Field opsional `mobileLegendsId` dan `mobileLegendsServerId` menyimpan ID akun dan server sebagai string angka, terpisah dari ID internal lineup/reward. `registeredRoles` menyimpan pilihan role pendaftaran; `role` tetap role utama roster. Risno memakai akun **128162878 (5029)** dan SEPHORA **114502835 (2578)**. Pencarian mencakup BU/Function dan Telegram. Pada layar kecil seluruh kolom tersedia melalui geser horizontal.

Perubahan profil tidak mengubah signature identitas undian, sehingga draft lama tetap bisa dilanjutkan. Ekspor JSON baru menyertakan profil, sedangkan JSON roster lama tanpa profil masih diterima. Saat memuat roster, BU/Function, posisi, Telegram, dan email diperbarui dari sumber player terbaru tanpa mengubah anggota team atau flag terkunci. Nama, username, dan role tetap divalidasi terhadap sumber.

Logo berasal dari `assets/logo-team/`, dengan daftar file di `assets/logo-team.json`. Nama team diambil dari nama file tanpa ekstensi. Perbarui manifest saat menambah/menghapus logo. Saat ini ada 14 logo dalam grid empat kolom.

Beranda memvalidasi JSON publikasi terhadap sumber player dan logo: jumlah team, keunikan player/nama, role, identitas player, dan path logo. File yang rusak atau tidak cocok menampilkan pesan kesalahan; draft browser tidak digunakan sebagai pengganti. Pemain yang baru ditambahkan di akhir sumber boleh menunggu di luar roster final; identitas pemain lama tetap harus sesuai. Mengubah identitas atau urutan pemain lama memerlukan penyesuaian JSON roster resmi.

### Sumber JSON eksternal

Semua URL data dikelola di `data-sources.js`. Isi `players` dengan URL Raw HTTPS untuk memuat daftar player dari luar:

```js
export const DATA_SOURCES = {
  players: 'https://raw.githubusercontent.com/USERNAME/msl-data/main/player-msl.json',
  teamRoster: '',
  matchResults: '',
  matchStreams: '',
  matchLineups: ''
};
```

URL di atas hanya contoh; ganti dengan URL milikmu. `teamRoster`, `matchResults`, dan `matchStreams` juga boleh memakai URL Raw HTTPS masing-masing, atau dibiarkan kosong agar tetap memakai file lokal. Saat ini **matchResults** dan **matchStreams** sudah diarahkan ke file masing-masing di `https://raw.githubusercontent.com/erwinf19/msl-data/refs/heads/main/`; sumber player dan roster masih lokal. Logo gambar dan manifest tetap lokal. Deploy satu kali setelah mengisi URL; pembaruan isi JSON eksternal berikutnya tidak memerlukan deploy website. Website mengambil data saat halaman dimuat, sehingga refresh untuk membaca pembaruan (belum ada polling otomatis). Server luar harus mengizinkan CORS dan mengirim JSON langsung, bukan halaman GitHub `blob`. Browser memakai `cache: 'no-store'`, tetapi cache CDN sumber tetap dapat menyebabkan jeda pembaruan.

Gunakan repository data terpisah yang tidak terhubung ke deploy Netlify jika ingin commit data tanpa memicu deploy website. Akses baca JSON harus tersedia tanpa token di kode browser. Jika sumber pemain/roster/skor eksternal gagal atau tidak valid, halaman menampilkan kesalahan; tidak diam-diam mengganti data dengan salinan lokal. Link streaming tetap opsional: kegagalannya hanya membuat link belum tersedia.

Pertahankan struktur array `player-msl.json` serta urutan player, karena ID pemain berasal dari posisi array. BU/Function dan Telegram dapat diperbarui langsung. Mengubah nama, username, role, jumlah/urutan pemain memerlukan penyesuaian JSON roster resmi agar valid; sumber eksternal tidak membuka flag kunci roster. Sumber jadwal tanggal/jam masih `tournament-data.js`; memindahkan jadwal ke JSON belum diterapkan.

## Klasemen dan jadwal

### Invite Player ke Google Calendar

Popup **Detail & pemain** di beranda dan jadwal lengkap menyediakan **Invite Player** yang selalu aktif. Setelah lineup pertandingan dikunci (lineup resmi atau draft terkunci yang siap diunggah), undangan mengikuti tepat 5 pemain setiap team, termasuk pemain pinjaman; cadangan yang tidak dipilih tidak ikut diundang. Jika lineup belum dikunci atau gagal dimuat, draft Calendar mengundang seluruh roster kedua team, termasuk cadangan, dengan keterangan jelas di popup. Email yang belum lengkap ditandai agar ditambahkan langsung di Google Calendar sebelum mengirim; alamat tidak valid tidak dimasukkan ke daftar tamu.

Tombol membuka draft event pada akun Google Calendar panitia dengan nama **MLBB SESI LEAGUE**, tanggal/jam pertandingan (saat ini 12:15 WIB), zona **Asia/Jakarta**, durasi 45 menit (12:15–13:00 WIB), serta daftar tamu. **infomuvers@sekolahmu.co.id** selalu ikut menjadi tamu di semua pertandingan, termasuk saat lineup atau email pemain belum tersedia; alamat ini diatur lewat `MATCH_INVITE_EMAIL` di `match-calendar.js`. Durasi diatur lewat `CALENDAR_DURATION_MINUTES` di `match-calendar.js`. Link Meet tetap **https://meet.google.com/nyt-mwco-dsc** dimasukkan ke lokasi dan deskripsi, beserta lineup, aturan hadir, dan tautan detail pertandingan. Ini tidak membuat room Meet baru atau mengatur conference otomatis di Calendar.

Periksa event dan tamunya di Google Calendar, lalu pilih **Simpan** dan **Kirim** agar undangan email dikirim. Website tidak mengirim otomatis, menyimpan token Google, atau mencatat bahwa undangan sudah terkirim; hindari menyimpan event yang sama dua kali. Email tetap berada dalam JSON yang dibaca browser. Menghilangkan kolom email dari tampilan tidak menjadikan data JSON privat.

Tautan **Detail pertandingan** di invitation selalu memakai domain publik `https://msl-sesi.netlify.app/full-schedule#match-mX`, termasuk saat invitation dibuat dari localhost. Domain diatur melalui `MATCH_SITE_URL` di `match-calendar.js`.

Logo **MLBB SESI LEAGUE** menggunakan gambar yang diberikan di `assets/msl-logo.png` untuk navbar seluruh halaman. Banner beranda dan Event Guide tetap memakai gambar aslinya di `assets/msl-banner.png`.

`tournament-data.js` menyediakan aturan skor dan jadwal round-robin: 8 team, 28 match, mulai 6 Oktober sampai 10 Desember 2026 selama 10 pekan. Jumlah match per pekan adalah 3, 3, 3, 2, 3, 3, 2, 3, 3, 3. Match berlangsung Selasa, Rabu, dan Kamis pukul 12.15 WIB; pekan 4 dan 7 hanya Selasa–Rabu. Setiap tim bertemu tujuh lawan sekali dan bermain maksimal sekali per pekan. ID slot team tetap konsisten ketika nama dan roster diperbarui.

Beranda menampilkan jadwal per pekan. `/full-schedule` menampilkan seluruh 28 match secara vertikal, dikelompokkan per pekan, dengan navigasi untuk lompat ke pekan tertentu. Kedua halaman membaca sumber jadwal, nama team, skor, dan reward yang sama. Menu utama tetap aktif sesuai halaman, termasuk setelah membuka tautan langsung ke Player List/Random Team. Navigasi pekan mengikuti bagian jadwal yang dibuka atau digulir. Indikator navbar bergeser dengan animasi di semua halaman; tab tujuan tetap aktif selama scroll otomatis, tanpa memilih bagian yang hanya dilewati. Animasi mengikuti preferensi reduced motion perangkat.

Ekspor roster tidak memasukkan hasil pertandingan. Nama dan pemain resmi berasal dari `assets/draft-team-msl.json`; `tournament-data.js` hanya menyediakan aturan dan slot jadwal tetap, tanpa nama atau pemain contoh. **Skor diatur di `assets/match-results.json`**, terpisah dari roster yang terkunci. Kemenangan bernilai 1 poin. Urutan klasemen: poin, net game win, game win, lalu nama team.

### Mengubah skor lewat JSON

File `assets/match-results.json` memuat seluruh 28 match beserta ID, pekan, tanggal, dan nama kedua team resmi. Cari match yang sesuai, lalu ubah hanya `score`. Contoh hasil Airlangga unggul 2–1 atas Gajah Mada:

```json
{
  "id": "m1",
  "week": 1,
  "date": "2026-10-06",
  "teamA": "Airlangga",
  "teamB": "Gajah Mada",
  "score": [2, 1]
}
```

Angka pertama untuk `teamA`, angka kedua untuk `teamB`. `null` berarti belum selesai. Skor BO3 valid: `[2,0]`, `[2,1]`, `[1,2]`, `[0,2]`. Contoh di atas hanya petunjuk; file awal belum berisi hasil pertandingan. Jangan mengubah ID, urutan team, pekan, atau tanggal untuk mengisi skor. Nama pada file ini diperiksa terhadap roster resmi; jika identitas team diubah melalui pemeliharaan kode, sesuaikan label nama kedua team di JSON hasil.

Sumber skor aktif sekarang adalah JSON eksternal di repository `erwinf19/msl-data`; ubah `score` di file eksternal tersebut lalu commit perubahan data dan refresh website. Deploy website diperlukan satu kali untuk memasang URL ini, bukan untuk setiap pembaruan skor berikutnya. Jika `matchResults` dikosongkan di `data-sources.js`, kembali memakai file lokal yang membutuhkan commit/push dan deploy untuk perubahan di Netlify. Beranda, jadwal lengkap, detail team, klasemen, reward, serta broadcast memakai hasil JSON yang sama. Data skor yang tidak valid/tidak lengkap ditolak agar klasemen tidak menampilkan hasil keliru. Hasil pertandingan dapat diperbarui tanpa membuka penguncian nama team/roster.

Font Barlow dan Barlow Condensed menggunakan Google Fonts dengan fallback lokal. Ikon role menggunakan viewport dari `assets/mlbb-role-sheet.webp`. Pilihan tema terang/gelap disimpan terpisah pada `msl-theme`.

## Penguncian final dan mode pemeliharaan

Sebelum Kunci Roster dikonfirmasi dengan password, seluruh draft boleh diulang, termasuk sesudah kelima role dan delapan nama selesai. Nama team dapat diganti selama tetap unik. Generate, Kunci Roster, dan Ulangi undian berada dalam panel kontrol yang sama.

Setiap Generate memulai animasi undian nama, countdown, dan pembagian satu player setiap 3 detik, dari Team 01 sampai Team 08. Pemain tambahan setiap role diumumkan terakhir dengan jeda yang sama. Satu role berisi 8 player membutuhkan sekitar 24 detik; role dengan 9 player sekitar 27 detik. Generate, Ulangi undian, nama team, dan Kunci Roster tidak dapat digunakan selama proses berjalan. Nama player di kartu dan Player List baru menjadi hasil undian setelah diumumkan.

Progres animasi memakai localStorage `msl-team-draw-animation-v1`. Hasil diacak sekali saat role dimulai, lalu diumumkan bertahap. Reload melanjutkan hasil yang sama dari player berikutnya; roster yang belum selesai tidak disimpan sebagai role lengkap. Browser yang mendukung Web Locks menjalankan animasi di satu tab, sementara tab lain mengikuti progres yang sama. Preferensi reduced motion menghilangkan efek berputar/pergantian nama cepat, dengan jeda pembagian tetap 3 detik.

Kunci Roster hanya aktif saat seluruh player terdaftar dan delapan nama team lengkap. Password salah atau membatalkan dialog tidak mengubah draft. Password benar menambahkan `locked: true` dan `lockedAt` ke draft browser, lalu men-download JSON final (`finalized: true`, `locked: true`). Setelah itu reset dan penggantian nama tidak tersedia, termasuk setelah reload. Tombol Kunci Roster berubah menjadi Download JSON untuk mengunduh ulang dengan password.

Setelah file hasil dipublikasikan, Choose Team memuat roster resmi dari JSON dan mengabaikan draft browser. Beranda tetap menggunakan hasil yang di-commit dan di-deploy. Grid hasil team di kedua halaman berisi empat kolom dan dua baris. Pada layar sempit grid dapat digeser horizontal agar teks pemain tetap terbaca.

Sakelar pemeliharaan ada di **draft-policy.js**:

```js
export const ALLOW_FINAL_TEAM_CHANGES = false;
```

Membuka kembali roster final memerlukan perubahan konstanta menjadi `true` secara manual, commit, dan deploy ulang. Tidak ada tombol atau password yang mengubah flag ini. Setelah pemeliharaan, kembalikan ke `false` sebelum mempublikasikan roster baru. Jangan mengubah `finalized` menjadi false pada file berisi roster; nilai false hanya untuk delapan slot kosong awal.

Pada website statis, penguncian menegakkan alur UI. Publikasi data resmi tetap membutuhkan akses repository/deploy.

## Event Guide / Technical Meeting

`/event-guide` merangkum delapan topik technical meeting: latar belakang, timeline dan ketentuan umum, struktur team, format dan klasemen, peraturan teknis, reward, etika, serta penayangan. Halaman tersedia dari navbar. Mode Presentasi menampilkan satu topik sekaligus; gunakan navigasi topik, tombol sebelumnya/berikutnya, atau panah kiri/kanan. Escape keluar dari presentasi. Seluruh materi tetap tersedia tanpa JavaScript. Timeline, reward, dan aturan mengikuti materi panitia; jadwal tetap pukul 12:15 WIB.

Navigasi utama seluruh halaman memakai urutan yang sama: Beranda, Jadwal Lengkap, Player Data, Event Guide, dan Player Reward. Daftar link dikelola bersama melalui `site-navigation.js`; tab aktif mengikuti halaman dan tidak berubah ketika bagian di dalam halaman digulir. HTML setiap halaman juga menyediakan menu yang sama sebelum JavaScript berjalan.

## URL halaman

Beranda: `/`; Jadwal Lengkap: `/full-schedule`; Player Data: `/player-data`; Event Guide: `/event-guide`; Player Reward: `/player-reward`. Server lokal melayani URL ini dan mengalihkan tautan `.html` lama (termasuk query dan anchor) ke URL baru. Restart `npm start` setelah mengubah server. Netlify memakai `_redirects` untuk pengalihan 301 dan rewrite 200, serta `netlify.toml` untuk menonaktifkan normalisasi Pretty URLs bawaan. Commit kedua file konfigurasi tersebut dan deploy ulang agar URL baru aktif di Netlify. Asset menggunakan path dari root agar tetap tersedia saat halaman dibuka langsung atau memakai trailing slash.

## Player Reward dan lineup pertandingan

`/player-reward` menghitung diamond setiap pemain dari **skor selesai + lineup resmi**. Hasil 2–0 memberi 28 diamond, 2–1 memberi 19, 1–2 memberi 12, dan 0–2 memberi 5 per pemain yang dipilih. Pemain cadangan yang tidak dipilih mendapat 0 untuk match tersebut. Total dijumlahkan sepanjang liga; tersedia pencarian, filter team, dan riwayat match setiap pemain. Weekly Diamond Pass terpisah dari total diamond ini.

1. Di jadwal beranda atau `/full-schedule`, klik **Lock lineup** di bagian atas kartu match, di sebelah status Terjadwal/Selesai.
2. Pilih tepat **5 pemain untuk setiap team**. Jika anggota tidak hadir, buka **Pinjam pemain**, lalu pilih team asal atau cari pemain. Wajib minimal 3 anggota asli dan maksimal 2 pinjaman; anggota team lawan dan team yang bermain pada tanggal/jam yang sama tidak tersedia. Pemain yang sama tidak bisa dipilih di kedua sisi. Pilihan ini berlaku untuk satu match BO3 secara keseluruhan, bukan per game; panitia tetap memastikan peminjaman tidak melebihi 2 game sesuai Event Guide.
3. Masukkan password panitia yang sama dengan download roster, lalu klik **Kunci lineup & download**. Password salah tidak mengunci atau mengunduh data. Setelah terkunci, pilihan hanya bisa dilihat atau diunduh ulang; koreksi dilakukan manual di JSON sumber.
4. Ganti **match-lineups.json** di repository **erwinf19/msl-data** dengan file unduhan dan commit. Jika browser menambahkan `(1)` pada nama file, kembalikan namanya. File unduhan mencakup seluruh lineup yang sudah dipublikasikan ditambah lineup yang baru dikunci di browser ini, agar match sebelumnya tetap tersimpan.
5. Refresh website setelah publikasi. Perhitungan reward hanya memakai lineup dari sumber resmi dan `match-results.json`; draft browser berstatus **Siap diunggah** belum menambah reward publik.

Sumber `matchLineups` sudah diarahkan ke `https://raw.githubusercontent.com/erwinf19/msl-data/refs/heads/main/match-lineups.json` melalui `data-sources.js`. File yang belum ada (HTTP 404) dianggap tahap awal sehingga unduhan pertama tetap dapat dibuat. Gangguan jaringan, JSON rusak, atau ketidakcocokan roster memblokir ekspor agar data resmi lain tidak tertimpa. Gunakan file terbaru saat mempublikasikan, terutama jika beberapa panitia mengelola data dari browser berbeda. Netlify membutuhkan satu deploy untuk memasang fitur ini; perubahan lineup/skor eksternal sesudahnya cukup commit di repo data dan refresh.

File awal `assets/match-lineups.json` kosong. Tambahkan hanya match yang sudah dikunci. Berikut contoh struktur untuk m1; ini contoh format, bukan lineup resmi pertandingan:

```json
{
  "version": 1,
  "matches": [
    {
      "id": "m1",
      "teamA": "Airlangga",
      "teamB": "Gajah Mada",
      "playerIdsA": [1, 13, 16, 29, 34],
      "playerIdsB": [3, 8, 19, 26, 41],
      "borrowedPlayerIdsA": [],
      "borrowedPlayerIdsB": [],
      "locked": true,
      "lockedAt": "2026-10-03T01:00:00.000Z"
    }
  ]
}
```

ID sebenarnya berupa angka, sama dengan `players[].id` di `assets/draft-team-msl.json` (berasal dari posisi array player). Unduhan melalui UI mengisi ID dan nama team otomatis. Jangan mengubah urutan array sumber pemain. Skor tetap di `match-results.json`, link siaran tetap di `match-streams.json`, dan jadwal tanggal/jam tetap di `tournament-data.js`. Pertandingan selesai yang belum memiliki lineup ditandai menunggu dan tidak masuk total. Format skor saat ini hanya mendukung empat hasil BO3 di atas; WO belum dihitung oleh sumber skor.

`playerIdsA`/`playerIdsB` selalu berisi kelima pemain yang benar-benar membela team pada match, termasuk pemain pinjaman. `borrowedPlayerIdsA`/`borrowedPlayerIdsB` mencatat subset ID pinjaman secara otomatis; file lama tanpa kedua field ini tetap diterima. Nama team dan kepemilikan roster pemain tidak berubah karena peminjaman. Diamond diberikan kepada individu berdasarkan hasil team yang dibelanya pada match tersebut; dapat terakumulasi dengan reward saat bermain untuk team sendiri. Riwayat menandai match sebagai **Pinjaman** dan menunjukkan team asal. Anggota asli yang tidak dipilih tidak mendapat diamond match itu.

Draft lineup browser memakai `msl-match-lineups-draft-v1`, divalidasi terhadap roster saat ini. Lineup resmi selalu menang jika ada perbedaan dengan draft browser. Ekspor menggunakan verifikasi hash yang sama di `download-password.js`, dengan batasan aplikasi statis yang dijelaskan pada bagian Password download.

## Link streaming per pertandingan

Isi field `streamUrl` di `match-streams.json` pada repository eksternal `erwinf19/msl-data` untuk match yang sesuai. Sumber aktif diatur oleh `matchStreams` di `data-sources.js`; jika dikosongkan, website kembali memakai `assets/match-streams.json`. File berisi 28 entri dengan ID pertandingan, pekan, tanggal, dan **nama resmi** kedua team, sama seperti `match-results.json`. Jangan ubah field identitas pertandingan; hanya ganti linknya. Nama diperiksa terhadap roster resmi agar link tidak dipasang ke pertandingan yang salah. Contoh untuk match m1 (6 Oktober 2026, Airlangga vs Gajah Mada):

```json
{
  "id": "m1",
  "week": 1,
  "date": "2026-10-06",
  "teamA": "Airlangga",
  "teamB": "Gajah Mada",
  "streamUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Ini contoh format; seluruh link dalam file awal kosong. Gunakan URL HTTP/HTTPS lengkap. Kosongkan `streamUrl` dengan `""` jika link belum tersedia. Beranda dan `/full-schedule` membaca JSON yang sama: match dengan link menampilkan tombol Tonton Live, sedangkan match selesai menampilkan Tonton Siaran. Link dibuka pada tab baru. Tanpa link, kartu menampilkan Belum tersedia. Deploy website satu kali untuk memasang URL eksternal ini; berikutnya cukup edit dan commit JSON streaming di repository data lalu refresh website tanpa deploy ulang. Jika memakai sumber lokal, perubahan tetap membutuhkan commit/push dan deploy ulang. Jika file streaming tidak dapat dimuat atau tidak valid, jadwal tetap ditampilkan.

ID team internal jadwal memakai nama resmi dengan huruf kecil dan tanda hubung: `airlangga`, `kalingga`, `samudera`, `padjadjaran`, `batavia`, `warmadewa`, `sadewa`, `gajah-mada`. Nama yang terlihat dan field `teamA`/`teamB` pada kedua JSON pertandingan tetap memakai ejaan lengkap resmi. ID pertandingan `m1`–`m28` tetap sama. Untuk migrasi, ganti `match-streams.json` di repository `msl-data` dengan file `assets/match-streams.json` yang sudah memakai nama resmi, lalu deploy perubahan kode website. File lama dengan identitas team yang tidak cocok akan ditolak oleh loader streaming.

## Broadcast dan detail pertandingan

Setiap match di beranda dan jadwal lengkap menyediakan **Detail & pemain** serta **Bagikan match**. Detail menampilkan seluruh roster resmi kedua team, role, peringkat, poin, match win/lose, game win/lose, dan net game berdasarkan klasemen saat ini. Roster yang belum dipublikasikan ditampilkan sebagai status menunggu; skor contoh tidak masuk statistik.

Di jadwal lengkap, setiap pekan juga mempunyai **Bagikan pekan**. Popup broadcast menyediakan preview teks dengan emoji dan jarak antar informasi, tombol salin, serta tautan ke pemilih chat Telegram. Pengguna memilih tujuan dan mengirim sendiri. Jika clipboard tidak tersedia, teks dipilih untuk disalin manual. Broadcast menggunakan nama team resmi, tanggal/jam match, hasil jika sudah selesai, link streaming jika tersedia, dan URL halaman dengan anchor pertandingan/pekan. URL memakai domain tempat website dibuka; gunakan versi Netlify saat ingin membagikan tautan publik.
