# Contoh uji skor dan lineup

File di folder ini hanya simulasi dan tidak dibaca otomatis oleh website.

- `match-results.json`: seluruh 28 pertandingan, hanya **m1 · Airlangga vs Gajah Mada** diberi skor `[2, 1]`; match lainnya belum selesai (`null`).
- `lineup-normal/match-lineups.json`: m1 dengan 5 pemain asli masing-masing team.
- `lineup-pinjaman/match-lineups.json`: alternatif m1 dengan 3 pemain asli Airlangga dan 2 pinjaman dari Kalingga (ID 24 Azzah Auliya Mawarni, ID 37 Muhammad iqbal).

Pilih **satu** skenario lineup. Kedua skenario menggunakan ID match m1 yang sama, sehingga tidak boleh digabung sebagai dua entri. File skor harus bernama `match-results.json`, dan file lineup yang dipilih harus bernama `match-lineups.json`, keduanya di root repository `msl-data`. Commit, lalu refresh website setelah versi fitur terbaru sudah dipasang di Netlify.

Jika repo data sudah berisi hasil/lineup asli, cukup ganti entri m1 dari contoh dan pertahankan entri match lainnya. Menyalin seluruh file contoh skor akan mengembalikan m2–m28 menjadi `null`. File lineup contoh hanya berisi m1. Simpan salinan data sebelum simulasi, lalu kembalikan setelah pengujian.

Hasil yang diharapkan untuk `[2, 1]`: 5 pemain yang membela Airlangga mendapat masing-masing 19 diamond, 5 pemain Gajah Mada mendapat masing-masing 12 diamond, total 155. Pemain yang tidak dipilih mendapat 0 dari m1. Dalam skenario pinjaman, ID 24 dan 37 tetap tercatat berasal dari Kalingga tetapi memperoleh 19 diamond karena membela Airlangga. Total per individu dapat bertambah jika pertandingan lain sudah memiliki skor dan lineup.

Untuk variasi skor, angka pertama milik Airlangga dan kedua milik Gajah Mada: `[2, 0]` → 28/5 diamond; `[2, 1]` → 19/12; `[1, 2]` → 12/19; `[0, 2]` → 5/28. Gunakan `null` untuk belum selesai. Jangan mengubah ID, tanggal, pekan, atau nama team ketika menguji skor.

`playerIdsA`/`playerIdsB` harus berisi tepat 5 ID numerik yang benar-benar bermain. `borrowedPlayerIdsA`/`borrowedPlayerIdsB` adalah subset ID pinjaman, bukan pemain tambahan di luar kelima pemain tersebut. Maksimal 2 pinjaman, minimal 3 anggota asli, tidak boleh meminjam dari lawan atau team yang bermain pada tanggal/jam yang sama. `locked` tetap `true`; untuk membatalkan lineup selama simulasi, hapus entri m1 dari array `matches`, lalu commit dan refresh. Draft ekspor yang masih tersimpan di browser dapat tetap muncul sebagai **Siap diunggah**; hapus draft browser jika ingin mulai uji dari awal tanpa draft tersebut.
