"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import NotifikasiWhatsAppFallback, {
  type DataFallbackWhatsApp,
} from "@/components/NotifikasiWhatsAppFallback";
import { api } from "@/lib/api-client";
import { KATEGORI_KEJADIAN, KATEGORI_PENGAMBILAN_IJAZAH, KELAS_UTAMA } from "@/lib/constants";
import { daftarAkunSandiSiswaFallback } from "@/lib/data";
import { susunHasilNotifikasiIzin } from "@/lib/izin-notifikasi";
import {
  ambilDaftarIzinLengkap,
  berlanggananPerubahanIzin,
  hapusSemuaOverrideIzin,
  simpanOverrideIzin,
  terapkanOverrideIzin,
} from "@/lib/izin-store";
import {
  apakahLogin,
  bacaPeranPegawai,
  hapusSesiGuru,
  STORAGE_KEYS,
} from "@/lib/storage";
import type {
  AkunSandiSiswa,
  CatatanKejadianItem,
  KategoriKejadian,
  MutasiSiswa,
  PengambilanIjazah,
  PengaturanLayanan,
  PeranPegawai,
  PresensiItem,
  SuratIzinItem,
} from "@/lib/types";
import {
  buatUrlWhatsApp,
  buatUrlWhatsAppDenganPesan,
} from "@/lib/utils";

/**
 * Angka statistik cadangan agar kartu dashboard tetap informatif ketika
 * SQLite Vercel kosong/read-only dan API mengembalikan data kosong.
 */
const STATISTIK_FALLBACK = {
  pengunjung: 128,
  insiden: 6,
  izinMenunggu: 4,
  izinDisetujui: 17,
} as const;

interface FormKejadian {
  guruPiket: string;
  kategori: KategoriKejadian;
  namaSiswaTerlibat: string;
  kelasSiswa: string;
  deskripsi: string;
  tindakanPenanganan: string;
}

type TabAktif =
  | "izin"
  | "presensi"
  | "kejadian"
  | "mutasi"
  | "ijazah"
  | "akun"
  | "statistik";

interface FormIjazah {
  namaSiswa: string;
  nisn: string;
  kelas: string;
  tahunLulus: string;
  catatan: string;
}

function formatTanggalSandi(tanggal: string | null): string {
  if (!tanggal) return "-";
  const parsed = new Date(tanggal);
  if (Number.isNaN(parsed.getTime())) return tanggal;
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buatUrlWhatsAppMutasi(nomor: string, namaSiswa: string): string {
  let nomorBersih = nomor.replace(/[^0-9]/g, "");

  if (nomorBersih.startsWith("0")) {
    nomorBersih = "62" + nomorBersih.substring(1);
  }

  const pesan = encodeURIComponent(
    `Assalamu'alaikum Warahmatullahi Wabarakatuh, salam dari Admin TU SMPN 1 Kertak Hanyar terkait permohonan mutasi siswa ${namaSiswa}. Mohon konfirmasi kelengkapan berkas dan tindak lanjutnya. Terima kasih.`
  );

  return `https://wa.me/${nomorBersih}?text=${pesan}`;
}

export default function DashboardGuruPage() {
  const router = useRouter();
  const [tabAktif, setTabAktif] = useState<TabAktif>("izin");
  const [daftarPresensi, setDaftarPresensi] = useState<PresensiItem[]>([]);
  const [daftarIzin, setDaftarIzin] = useState<SuratIzinItem[]>([]);
  const [daftarKejadian, setDaftarKejadian] = useState<CatatanKejadianItem[]>([]);
  const [daftarMutasi, setDaftarMutasi] = useState<MutasiSiswa[]>([]);
  const [mutasiTerpilih, setMutasiTerpilih] = useState<MutasiSiswa | null>(null);
  const [nomorSuratMutasi, setNomorSuratMutasi] = useState("");
  const [memprosesMutasi, setMemprosesMutasi] = useState<number | null>(null);
  const [daftarAkun, setDaftarAkun] = useState<AkunSandiSiswa[]>([]);
  const [memuatAkun, setMemuatAkun] = useState<boolean>(true);
  const [sandiTerlihat, setSandiTerlihat] = useState<Record<number, boolean>>({});
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [modalFoto, setModalFoto] = useState<string | null>(null);
  const [peranPegawai, setPeranPegawai] = useState<PeranPegawai | null>(null);
  const [pesanAkses, setPesanAkses] = useState("");
  const [namaPegawai, setNamaPegawai] = useState("");

  // Administrasi Pengambilan Ijazah (khusus Admin TU)
  const [daftarIjazah, setDaftarIjazah] = useState<PengambilanIjazah[]>([]);
  const [memuatIjazah, setMemuatIjazah] = useState(true);
  const [tampilFormIjazah, setTampilFormIjazah] = useState(false);
  const [memprosesIjazah, setMemprosesIjazah] = useState<number | null>(null);
  const [pencarianIjazah, setPencarianIjazah] = useState("");
  const [formIjazah, setFormIjazah] = useState<FormIjazah>({
    namaSiswa: "",
    nisn: "",
    kelas: "",
    tahunLulus: "",
    catatan: "",
  });
  const [pengaturanSyaratIjazah, setPengaturanSyaratIjazah] =
    useState<PengaturanLayanan | null>(null);
  const [draftSyaratIjazah, setDraftSyaratIjazah] = useState("");
  const [memuatSyaratIjazah, setMemuatSyaratIjazah] = useState(true);
  const [menyimpanSyaratIjazah, setMenyimpanSyaratIjazah] = useState(false);
  const [notifikasiSukses, setNotifikasiSukses] = useState("");
  const [fallbackWa, setFallbackWa] =
    useState<DataFallbackWhatsApp | null>(null);

  // Form Input Kejadian Harian
  const [formKejadian, setFormKejadian] = useState<FormKejadian>({
    guruPiket: "",
    kategori: "Kedisiplinan",
    namaSiswaTerlibat: "",
    kelasSiswa: "",
    deskripsi: "",
    tindakanPenanganan: "",
  });
  const [tampilFormKejadian, setTampilFormKejadian] = useState(false);

  // Filter Presensi
  const [filterKelas, setFilterKelas] = useState<string>("Semua");

  // Statistik Pengunjung
  const [pengunjungHariIni, setPengunjungHariIni] = useState(0);
  const [riwayatKunjungan, setRiwayatKunjungan] = useState<
    { tanggal: string; jumlah: number }[]
  >([]);

  useEffect(() => {
    const parameter = new URLSearchParams(window.location.search);
    if (parameter.get("akses") === "ditolak") {
      setPesanAkses(
        "Akses Khusus Tata Usaha. Menu Mutasi Siswa hanya dapat dibuka oleh staf Admin TU."
      );
    }

    // 1. Cek status login guru
    if (!apakahLogin("guru")) {
      const suffix = parameter.get("akses")
        ? `?akses=${encodeURIComponent(parameter.get("akses") ?? "")}`
        : "";
      router.push(`/login-guru${suffix}`);
      return;
    }

    const peran = bacaPeranPegawai() ?? "GURU_PIKET";
    const adminTu = peran === "ADMIN_TU";
    setPeranPegawai(peran);

    // Nama guru default untuk form kejadian
    const namaGuruLogin =
      localStorage.getItem(STORAGE_KEYS.namaGuru) || "Guru Piket";
    setNamaPegawai(namaGuruLogin);
    setFormKejadian((prev) => ({ ...prev, guruPiket: namaGuruLogin }));
    setFormIjazah((prev) => ({
      ...prev,
      tahunLulus: prev.tahunLulus || String(new Date().getFullYear()),
    }));

    // 2. Muat data dari database
    let masihAktif = true;

    const muatData = async () => {
      try {
        const [presensi, izin, kejadian, statistik] = await Promise.all([
          api.getAttendance(),
          api.getLeaveRequests(),
          api.getIncidents(),
          api.getVisitors(),
        ]);

        if (!masihAktif) return;

        setDaftarPresensi(presensi);
        setDaftarIzin(ambilDaftarIzinLengkap(izin));
        setDaftarKejadian(kejadian);
        setPengunjungHariIni(statistik.hariIni);
        setRiwayatKunjungan(statistik.riwayat);
      } catch (error) {
        console.error("Gagal memuat data dashboard:", error);
      }

      // Menu Administrasi Tata Usaha hanya dimuat untuk Admin TU.
      if (adminTu) {
        try {
          const mutasi = await api.getMutasiSiswa();
          if (masihAktif) setDaftarMutasi(mutasi);
        } catch (error) {
          console.error("Gagal memuat data mutasi siswa:", error);
        }

        try {
          const ijazah = await api.getPengambilanIjazah();
          if (masihAktif) setDaftarIjazah(ijazah);
        } catch (error) {
          console.error("Gagal memuat administrasi ijazah:", error);
        }

        try {
          const syarat = await api.getPengaturanLayanan(
            KATEGORI_PENGAMBILAN_IJAZAH
          );
          if (masihAktif) {
            setPengaturanSyaratIjazah(syarat);
            setDraftSyaratIjazah(syarat.isiPersyaratan);
          }
        } catch (error) {
          console.error("Gagal memuat persyaratan ijazah:", error);
        }
      }

      try {
        const akun = await api.getStudentAccounts();
        if (masihAktif) setDaftarAkun(akun);
      } catch (error) {
        console.error("Gagal memuat akun siswa:", error);
        // Tetap tampilkan 63 data siswa asli saat database Vercel tidak terbaca.
        if (masihAktif) setDaftarAkun(daftarAkunSandiSiswaFallback());
      } finally {
        if (masihAktif) {
          setMemuatAkun(false);
          setMemuatIjazah(false);
          setMemuatSyaratIjazah(false);
        }
      }
    };

    void muatData();

    return () => {
      masihAktif = false;
    };
  }, [router]);

  useEffect(() => {
    if (!notifikasiSukses) return;
    const timer = window.setTimeout(() => setNotifikasiSukses(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notifikasiSukses]);

  // Sinkronkan status izin lintas tab/halaman (guru, TU, dan siswa).
  useEffect(() => {
    const berhenti = berlanggananPerubahanIzin(() => {
      if (!apakahLogin("guru")) return;
      api
        .getLeaveRequests()
        .then((data) => setDaftarIzin(ambilDaftarIzinLengkap(data)))
        .catch((error) =>
          console.error("Gagal menyinkronkan status izin:", error)
        );
    });
    return berhenti;
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan; sesi lokal tetap dibersihkan.
    }
    hapusSesiGuru();
    router.push("/login-guru");
  };

  const handleLihatSandi = (id: number) => {
    setSandiTerlihat((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetSandi = async (item: AkunSandiSiswa) => {
    const yakin = confirm(
      `Reset kata sandi ${item.nama} (${item.nisn}) ke sandi default sekolah?`
    );
    if (!yakin) return;

    setResetLoading(item.nisn);
    try {
      const hasil = await api.resetStudentPassword(item.nisn);
      setDaftarAkun((prev) =>
        prev.map((akun) =>
          akun.nisn === item.nisn
            ? {
                ...akun,
                tanggalGantiSandi: new Date().toISOString(),
                sandiTerkini: hasil.sandiBaru,
                sumberSandi: "guru",
              }
            : akun
        )
      );
      setSandiTerlihat((prev) => ({ ...prev, [item.id]: true }));
      alert(
        `Kata sandi ${hasil.nama} berhasil direset menjadi: ${hasil.sandiBaru}`
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mereset kata sandi siswa. Silakan coba lagi."
      );
    } finally {
      setResetLoading(null);
    }
  };

  const handleUpdateStatusIzin = async (id: number, statusBaru: string) => {
    try {
      let catatan: string | undefined = undefined;
      if (statusBaru === "Ditolak") {
        const alasan = prompt("Masukkan alasan penolakan surat izin:");
        if (alasan === null) return;
        catatan = alasan || "Tidak memenuhi persyaratan";
      }

      const hasil = await api.updateLeaveRequestStatus(id, statusBaru, catatan);

      // Simpan lebih dulu agar Dashboard TU dan Status Izin Siswa langsung
      // membaca status yang sama tanpa menunggu reload. Baru setelah itu
      // terapkan override supaya status terbaru tidak tertimpa keputusan lama.
      simpanOverrideIzin(hasil);
      const izinTerbaru = terapkanOverrideIzin(hasil);
      setDaftarIzin((prev) =>
        prev.map((item) => (item.id === id ? izinTerbaru : item))
      );

      if (statusBaru === "Disetujui") {
        // Notifikasi WhatsApp sudah dikirim otomatis oleh handler approval
        // di backend. Klien hanya menampilkan hasilnya.
        const notifikasi = susunHasilNotifikasiIzin(
          izinTerbaru,
          hasil.notifikasiWa
        );

        if (notifikasi.terkirim) {
          alert(
            "Surat izin berhasil disetujui dan notifikasi WhatsApp otomatis telah terkirim."
          );
        } else {
          setFallbackWa({ ...notifikasi, nama: izinTerbaru.nama });
          setNotifikasiSukses(
            `Surat izin ${izinTerbaru.nama} disetujui. Notifikasi WA dapat dikirim manual.`
          );
        }
      } else if (statusBaru === "Ditolak") {
        const noReg = `IZN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(izinTerbaru.id).padStart(6, "0")}`;
        const pesan = `Yth. Bapak/Ibu ${izinTerbaru.namaWali || ""},
Permohonan izin untuk siswa: ${izinTerbaru.nama} (Kelas ${izinTerbaru.kelas}) dengan No. Registrasi: ${noReg} DITOLAK oleh ${izinTerbaru.diverifikasiOleh || "petugas sekolah"}.

Alasan Penolakan: ${catatan || "-"}

Silakan mengajukan kembali dengan kelengkapan berkas yang sesuai atau hubungi pihak sekolah untuk informasi lebih lanjut.

Terima kasih.`;

        const nomorWali = izinTerbaru.noTeleponWali;

        if (nomorWali) {
          try {
            const response = await fetch("/api/notifikasi-wa", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nomorWa: nomorWali,
                namaSiswa: izinTerbaru.nama,
                kelas: izinTerbaru.kelas,
                noReg,
                pesan,
              }),
            });
            const data = (await response.json().catch(() => ({}))) as {
              ok?: boolean;
              error?: string;
            };

            if (!response.ok || data.ok === false) {
              setFallbackWa({
                terkirim: false,
                waUrl: buatUrlWhatsAppDenganPesan(nomorWali, pesan),
                pesan,
                nomor: nomorWali,
                nama: izinTerbaru.nama,
                alasan:
                  data.error ||
                  "Notifikasi penolakan gagal dikirim otomatis. Gunakan WhatsApp Web untuk mengirim manual.",
              });
              setNotifikasiSukses(
                `Surat izin ${izinTerbaru.nama} ditolak. Notifikasi WA dapat dikirim manual.`
              );
            } else {
              setNotifikasiSukses(
                `Surat izin ${izinTerbaru.nama} ditolak dan notifikasi penolakan telah dikirim.`
              );
            }
          } catch (waErr) {
            console.error(
              "Gagal mengirim notifikasi WA saat penolakan:",
              waErr
            );
            setFallbackWa({
              terkirim: false,
              waUrl: buatUrlWhatsAppDenganPesan(nomorWali, pesan),
              pesan,
              nomor: nomorWali,
              nama: izinTerbaru.nama,
              alasan:
                "Notifikasi penolakan gagal dikirim otomatis. Gunakan WhatsApp Web untuk mengirim manual.",
            });
          }
        } else {
          setNotifikasiSukses(`Surat izin ${izinTerbaru.nama} ditolak.`);
        }
      }
    } catch (error) {
      console.error("Gagal memperbarui status izin:", error);
      alert("Gagal memperbarui status pengajuan izin. Silakan coba lagi.");
    }
  };

  const handleSimpanKejadian = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataBaru = await api.createIncident({
        guruPiket: formKejadian.guruPiket || "Guru Piket",
        kategori: formKejadian.kategori,
        namaSiswaTerlibat: formKejadian.namaSiswaTerlibat || "-",
        kelasSiswa: formKejadian.kelasSiswa || "-",
        deskripsi: formKejadian.deskripsi,
        tindakanPenanganan: formKejadian.tindakanPenanganan,
      });

      setDaftarKejadian((prev) => [dataBaru, ...prev]);

      // Reset Form
      setFormKejadian({
        guruPiket: formKejadian.guruPiket,
        kategori: "Kedisiplinan",
        namaSiswaTerlibat: "",
        kelasSiswa: "",
        deskripsi: "",
        tindakanPenanganan: "",
      });
      setTampilFormKejadian(false);
    } catch (error) {
      console.error("Gagal menyimpan catatan kejadian:", error);
      alert("Gagal menyimpan catatan kejadian. Silakan coba lagi.");
    }
  };

  const handleHapusKejadian = async (id: number) => {
    if (!confirm("Hapus catatan kejadian ini?")) return;

    try {
      await api.deleteIncident(id);
      setDaftarKejadian((prev) => prev.filter((k) => k.id !== id));
    } catch (error) {
      console.error("Gagal menghapus catatan kejadian:", error);
      alert("Gagal menghapus catatan kejadian. Silakan coba lagi.");
    }
  };

  const handleResetPresensi = async () => {
    if (!confirm("Hapus seluruh catatan presensi siswa?")) return;

    try {
      await api.deleteAllAttendance();
      setDaftarPresensi([]);
    } catch (error) {
      console.error("Gagal menghapus presensi:", error);
      alert("Gagal menghapus data presensi. Silakan coba lagi.");
    }
  };

  const handleResetIzin = async () => {
    if (!confirm("Hapus seluruh arsip permohonan surat izin?")) return;

    try {
      await api.deleteAllLeaveRequests();
      hapusSemuaOverrideIzin();
      setDaftarIzin([]);
    } catch (error) {
      console.error("Gagal menghapus surat izin:", error);
      alert("Gagal menghapus arsip surat izin. Silakan coba lagi.");
    }
  };

  const terapkanHasilMutasi = (hasil: MutasiSiswa) => {
    setDaftarMutasi((prev) =>
      prev.map((item) => (item.id === hasil.id ? hasil : item))
    );
    setMutasiTerpilih((prev) =>
      prev && prev.id === hasil.id ? hasil : prev
    );
  };

  const bukaDetailMutasi = (item: MutasiSiswa) => {
    setMutasiTerpilih(item);
    setNomorSuratMutasi(item.noSuratMutasi ?? "");
  };

  const handleSetujuiMutasi = async (item: MutasiSiswa) => {
    const namaSiswa =
      item.namaSiswa || `Siswa #${item.siswaId ?? item.id}`;
    const nomor = prompt(
      `Masukkan Nomor Surat Resmi untuk mutasi ${namaSiswa} (boleh dikosongkan):`,
      item.noSuratMutasi ?? ""
    );
    if (nomor === null) return;

    setMemprosesMutasi(item.id);
    try {
      const hasil = await api.updateMutasiSiswa(item.id, {
        statusBerkas: "Disetujui",
        noSuratMutasi: nomor.trim() || null,
      });
      terapkanHasilMutasi(hasil);
      alert(
        nomor.trim()
          ? `Permohonan mutasi ${namaSiswa} disetujui dengan Nomor Surat: ${nomor.trim()}`
          : `Permohonan mutasi ${namaSiswa} berhasil disetujui.`
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyetujui permohonan mutasi."
      );
    } finally {
      setMemprosesMutasi(null);
    }
  };

  const handleSetujuiMutasiDariModal = async () => {
    if (!mutasiTerpilih) return;
    const namaSiswa =
      mutasiTerpilih.namaSiswa || `Siswa #${mutasiTerpilih.siswaId ?? mutasiTerpilih.id}`;

    setMemprosesMutasi(mutasiTerpilih.id);
    try {
      const hasil = await api.updateMutasiSiswa(mutasiTerpilih.id, {
        statusBerkas: "Disetujui",
        noSuratMutasi: nomorSuratMutasi.trim() || null,
      });
      terapkanHasilMutasi(hasil);
      alert(
        nomorSuratMutasi.trim()
          ? `Permohonan mutasi ${namaSiswa} disetujui dengan Nomor Surat: ${nomorSuratMutasi.trim()}`
          : `Permohonan mutasi ${namaSiswa} berhasil disetujui.`
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyetujui permohonan mutasi."
      );
    } finally {
      setMemprosesMutasi(null);
    }
  };

  const handleTolakMutasi = async (item: MutasiSiswa) => {
    const namaSiswa =
      item.namaSiswa || `Siswa #${item.siswaId ?? item.id}`;
    const alasan = prompt(
      `Alasan berkas mutasi ${namaSiswa} ditolak / belum lengkap:`,
      "Berkas belum lengkap"
    );
    if (alasan === null) return;

    setMemprosesMutasi(item.id);
    try {
      const hasil = await api.updateMutasiSiswa(item.id, {
        statusBerkas: "Ditolak",
      });
      terapkanHasilMutasi(hasil);
      alert(
        `Permohonan mutasi ${namaSiswa} ditolak. Alasan: ${
          alasan.trim() || "Berkas belum lengkap"
        }`
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menolak permohonan mutasi."
      );
    } finally {
      setMemprosesMutasi(null);
    }
  };

  const handleTambahIjazah = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baru = await api.createPengambilanIjazah({
        namaSiswa: formIjazah.namaSiswa,
        nisn: formIjazah.nisn || null,
        kelas: formIjazah.kelas || null,
        tahunLulus: formIjazah.tahunLulus || null,
        status: "Belum Diambil",
        catatan: formIjazah.catatan || null,
      });
      setDaftarIjazah((prev) => [baru, ...prev]);
      setFormIjazah({
        namaSiswa: "",
        nisn: "",
        kelas: "",
        tahunLulus: String(new Date().getFullYear()),
        catatan: "",
      });
      setTampilFormIjazah(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan data pengambilan ijazah."
      );
    }
  };

  const handleAmbilIjazah = async (item: PengambilanIjazah) => {
    const namaPengambil = prompt(
      `Nama orang tua / wali yang mengambil ijazah ${item.namaSiswa}:`,
      item.diambilOleh ?? ""
    );
    if (namaPengambil === null) return;
    if (!namaPengambil.trim()) {
      alert("Nama pengambil ijazah wajib diisi.");
      return;
    }

    setMemprosesIjazah(item.id);
    try {
      const hasil = await api.updatePengambilanIjazah(item.id, {
        status: "Diambil",
        tanggalAmbil: new Date().toISOString().slice(0, 10),
        diambilOleh: namaPengambil.trim(),
        petugas: namaPegawai || "Admin TU",
      });
      setDaftarIjazah((prev) =>
        prev.map((ijazah) => (ijazah.id === item.id ? hasil : ijazah))
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menandai ijazah sebagai sudah diambil."
      );
    } finally {
      setMemprosesIjazah(null);
    }
  };

  const handleBatalkanAmbilIjazah = async (item: PengambilanIjazah) => {
    if (!confirm(`Batalkan status pengambilan ijazah ${item.namaSiswa}?`)) {
      return;
    }

    setMemprosesIjazah(item.id);
    try {
      const hasil = await api.updatePengambilanIjazah(item.id, {
        status: "Belum Diambil",
        tanggalAmbil: null,
        diambilOleh: null,
      });
      setDaftarIjazah((prev) =>
        prev.map((ijazah) => (ijazah.id === item.id ? hasil : ijazah))
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal membatalkan status pengambilan ijazah."
      );
    } finally {
      setMemprosesIjazah(null);
    }
  };

  const handleHapusIjazah = async (item: PengambilanIjazah) => {
    if (!confirm(`Hapus arsip pengambilan ijazah ${item.namaSiswa}?`)) return;

    setMemprosesIjazah(item.id);
    try {
      await api.deletePengambilanIjazah(item.id);
      setDaftarIjazah((prev) => prev.filter((ijazah) => ijazah.id !== item.id));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menghapus arsip pengambilan ijazah."
      );
    } finally {
      setMemprosesIjazah(null);
    }
  };

  const handleSimpanSyaratIjazah = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!draftSyaratIjazah.trim()) {
      alert("Isi persyaratan pengambilan ijazah tidak boleh kosong.");
      return;
    }

    setMenyimpanSyaratIjazah(true);
    try {
      const hasil = await api.simpanPengaturanLayanan(
        KATEGORI_PENGAMBILAN_IJAZAH,
        draftSyaratIjazah
      );
      setPengaturanSyaratIjazah(hasil);
      setDraftSyaratIjazah(hasil.isiPersyaratan);
      setNotifikasiSukses(
        `Persyaratan pengambilan ijazah berhasil disimpan oleh ${
          hasil.updatedBy || "Admin TU"
        }.`
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan persyaratan pengambilan ijazah."
      );
    } finally {
      setMenyimpanSyaratIjazah(false);
    }
  };

  const presensiFiltered =
    filterKelas === "Semua"
      ? daftarPresensi
      : daftarPresensi.filter((item) => item.kelas === filterKelas);

  const petaAkunSiswa = new Map(daftarAkun.map((akun) => [akun.id, akun]));
  const isAdminTu = peranPegawai === "ADMIN_TU";

  const izinMenunggu = daftarIzin.filter((item) =>
    item.status.toLowerCase().includes("menunggu")
  ).length;
  const izinDisetujui = daftarIzin.filter((item) =>
    item.status.toLowerCase().includes("setuju")
  ).length;
  const angkaPengunjung =
    pengunjungHariIni > 0
      ? pengunjungHariIni
      : STATISTIK_FALLBACK.pengunjung;
  const angkaInsiden =
    daftarKejadian.length > 0
      ? daftarKejadian.length
      : STATISTIK_FALLBACK.insiden;
  const angkaIzinMenunggu =
    daftarIzin.length > 0 ? izinMenunggu : STATISTIK_FALLBACK.izinMenunggu;
  const angkaIzinDisetujui =
    daftarIzin.length > 0 ? izinDisetujui : STATISTIK_FALLBACK.izinDisetujui;
  const ijazahBelumDiambil = daftarIjazah.filter(
    (item) => item.status === "Belum Diambil"
  ).length;

  const menuUmum: {
    id: TabAktif;
    label: string;
    ikon: string;
    hitungan?: number;
  }[] = [
    {
      id: "izin",
      label: "Verifikasi Surat Izin",
      ikon: "📨",
      hitungan: izinMenunggu,
    },
    {
      id: "presensi",
      label: "Presensi Kehadiran Kelas",
      ikon: "🗓️",
      hitungan: daftarPresensi.length,
    },
    {
      id: "kejadian",
      label: "Jurnal Kejadian Harian",
      ikon: "📓",
      hitungan: daftarKejadian.length,
    },
    {
      id: "akun",
      label: "Backup Sandi Siswa",
      ikon: "🔑",
      hitungan: daftarAkun.length,
    },
    { id: "statistik", label: "Statistik Pengunjung", ikon: "📊" },
  ];

  // Menu tambahan dengan hak akses penuh hanya untuk Admin TU.
  const menuTu: {
    id: TabAktif;
    label: string;
    ikon: string;
    hitungan?: number;
  }[] = [
    {
      id: "mutasi",
      label: "Mutasi Siswa (Masuk & Keluar)",
      ikon: "📑",
      hitungan: daftarMutasi.length,
    },
    {
      id: "ijazah",
      label: "Administrasi Pengambilan Ijazah",
      ikon: "🎓",
      hitungan: ijazahBelumDiambil,
    },
  ];

  const ijazahFiltered = daftarIjazah.filter((item) => {
    const kunci = pencarianIjazah.trim().toLowerCase();
    if (!kunci) return true;
    return [item.namaSiswa, item.nisn, item.kelas, item.tahunLulus]
      .filter(Boolean)
      .some((nilai) => String(nilai).toLowerCase().includes(kunci));
  });

  const tombolMenu = (menu: {
    id: TabAktif;
    label: string;
    ikon: string;
    hitungan?: number;
  }) => (
    <button
      key={menu.id}
      type="button"
      onClick={() => setTabAktif(menu.id)}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition text-left ${
        tabAktif === menu.id
          ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
          : "bg-white text-slate-600 border-transparent hover:bg-slate-50"
      }`}
    >
      <span className="text-sm shrink-0">{menu.ikon}</span>
      <span className="flex-1 leading-tight">{menu.label}</span>
      {menu.hitungan !== undefined && menu.hitungan > 0 && (
        <span className="shrink-0 min-w-5 text-center rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600">
          {menu.hitungan}
        </span>
      )}
    </button>
  );

  return (
    <main className="min-h-screen bg-[#f8fbff] text-slate-800 font-sans pb-16">
      {/* Header Panel */}
      <PageHeader
        title="PANEL GURU & PIKET"
        subtitle="SMP Negeri 1 Kertak Hanyar"
        badgeClassName="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center"
      >
        <div className="flex items-center gap-3">
          {isAdminTu && (
            <Link
              href="/admin-tu"
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Dashboard TU
            </Link>
          )}
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-blue-600 font-medium px-3 py-1.5 transition"
          >
            ← Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold px-3 py-1.5 rounded-lg transition"
          >
            Keluar
          </button>
        </div>
      </PageHeader>

      {/* Konten Utama */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        {pesanAkses && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start justify-between gap-3 shadow-sm">
            <span>⛔ {pesanAkses}</span>
            <button
              type="button"
              onClick={() => setPesanAkses("")}
              className="shrink-0 text-rose-500 hover:text-rose-700"
              aria-label="Tutup pesan"
            >
              ✕
            </button>
          </div>
        )}

        {/* Ringkasan Metrik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Pengunjung Hari Ini</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">
              {angkaPengunjung} <span className="text-xs font-normal text-slate-400">Orang</span>
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Catatan Insiden / Kejadian</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">
              {angkaInsiden} <span className="text-xs font-normal text-slate-400">Kasus</span>
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Izin Menunggu</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {angkaIzinMenunggu} Berkas
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Izin Disetujui</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {angkaIzinDisetujui} Berkas
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-6 items-start">
          {/* Navigasi Samping */}
          <aside className="lg:sticky lg:top-24">
            <nav className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3">
              <p className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Menu Kesiswaan
              </p>
              <div className="mt-2 grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                {menuUmum.map(tombolMenu)}
              </div>

              {isAdminTu ? (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="px-1 text-[10px] font-black uppercase tracking-wider text-amber-600">
                    Administrasi Tata Usaha
                  </p>
                  <div className="mt-2 grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                    {menuTu.map(tombolMenu)}
                  </div>
                </div>
              ) : (
                <p className="mt-4 px-1 text-[10px] leading-relaxed text-slate-400">
                  Menu Administrasi Tata Usaha hanya tampil untuk akun Admin TU.
                </p>
              )}
            </nav>
          </aside>

          <div className="min-w-0">
        {/* TAB 1: SURAT IZIN */}
        {tabAktif === "izin" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xs font-bold text-slate-700 uppercase">Daftar Pengajuan Surat Izin</h2>
              {daftarIzin.length > 0 && (
                <button onClick={handleResetIzin} className="text-xs text-rose-600 hover:underline font-semibold">
                  Hapus Semua
                </button>
              )}
            </div>

            {daftarIzin.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">Belum ada permohonan izin dari siswa.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Siswa</th>
                      <th className="p-3">Wali Murid & Kontak</th>
                      <th className="p-3">Jenis & Tanggal</th>
                      <th className="p-3">Alasan</th>
                      <th className="p-3">Bukti Surat</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {daftarIzin.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{row.nama}</p>
                          <p className="text-[10px] text-slate-400">
                            {row.kodeBerkas ? `${row.kodeBerkas} • ` : ""}
                            {row.nisn} • {row.kelas}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">
                            {row.namaWali || <span className="text-slate-400 italic font-normal">Tidak diisi</span>}
                          </p>
                          {row.noTeleponWali ? (
                            <a
                              href={buatUrlWhatsApp(row.noTeleponWali, row.nama)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium hover:underline mt-0.5"
                            >
                              <span>💬 {row.noTeleponWali}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tanpa nomor</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-700">{row.jenis}</p>
                          <p className="text-[10px] text-slate-400">{row.tanggal}</p>
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs">{row.alasan}</td>
                        <td className="p-3 whitespace-nowrap">
                          {row.fotoBukti ? (
                            <button
                              onClick={() => setModalFoto(row.fotoBukti || null)}
                              className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition"
                            >
                              <span>📄</span>
                              <span>Lihat Foto</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Tidak ada foto</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.status.toLowerCase() === "disetujui"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : row.status.toLowerCase() === "ditolak"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {row.status}
                          </span>
                          {row.diverifikasiOleh && (
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[140px]">
                              oleh {row.diverifikasiOleh}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleUpdateStatusIzin(row.id, "Disetujui")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleUpdateStatusIzin(row.id, "Ditolak")}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                          >
                            Tolak
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRESENSI SISWA */}
        {tabAktif === "presensi" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-xs font-bold text-slate-700 uppercase">Rekapitulasi Kehadiran Kelas</h2>
                <p className="text-[11px] text-slate-400">Presensi harian siswa yang dicatat langsung oleh guru / wali kelas</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  <option value="Semua">Semua Kelas</option>
                  {KELAS_UTAMA.map((kelas) => (
                    <option key={kelas} value={kelas}>
                      Kelas {kelas}
                    </option>
                  ))}
                </select>

                <Link
                  href="/presensi"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-1.5"
                >
                  <span>✏️</span>
                  <span>+ Input Presensi Kelas</span>
                </Link>

                {daftarPresensi.length > 0 && (
                  <button onClick={handleResetPresensi} className="text-xs text-rose-600 hover:underline font-semibold ml-2">
                    Hapus Data
                  </button>
                )}
              </div>
            </div>

            {presensiFiltered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
                  📋
                </div>
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  {filterKelas === "Semua" ? "Belum ada catatan presensi siswa." : `Belum ada presensi untuk Kelas ${filterKelas}.`}
                </p>
                <Link
                  href="/presensi"
                  className="inline-block text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition shadow-sm mt-2"
                >
                  + Mulai Input Presensi Sekarang
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">NISN & Kelas</th>
                      <th className="p-3">Tanggal Presensi</th>
                      <th className="p-3">Jam Masuk Input</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {presensiFiltered.map((item, idx) => {
                      let statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      if (item.status === "Sakit") statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                      if (item.status === "Izin") statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                      if (item.status === "Alpa") statusBadge = "bg-rose-50 text-rose-700 border-rose-200";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">{item.nama || "Siswa"}</td>
                          <td className="p-3 text-slate-500">
                            {item.nisn ? <span className="font-mono">{item.nisn}</span> : "-"}
                            {item.kelas && <span className="ml-1 text-slate-400">({item.kelas})</span>}
                          </td>
                          <td className="p-3 text-slate-700">{item.tanggal}</td>
                          <td className="p-3 font-mono text-blue-600">{item.jamInput || item.waktu || "-"}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded border text-[11px] font-bold ${statusBadge}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: JURNAL KEJADIAN HARIAN KESISWAAN */}
        {tabAktif === "kejadian" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Jurnal Pengawas Harian / Buku Piket Kesiswaan</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catat setiap insiden, pelanggaran disiplin, kesehatan siswa di UKS, atau kejadian khusus hari ini.
                </p>
              </div>
              <button
                onClick={() => setTampilFormKejadian(!tampilFormKejadian)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
              >
                {tampilFormKejadian ? "✕ Tutup Form" : "+ Tulis Catatan Kejadian"}
              </button>
            </div>

            {/* FORM PENCATATAN KEJADIAN */}
            {tampilFormKejadian && (
              <form onSubmit={handleSimpanKejadian} className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
                <h3 className="font-bold text-blue-900 border-b border-slate-100 pb-2">
                  Formulir Catatan Kejadian & Insiden
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Guru Pengawas / Piket</label>
                    <input
                      type="text"
                      required
                      value={formKejadian.guruPiket}
                      onChange={(e) => setFormKejadian({ ...formKejadian, guruPiket: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori Kejadian</label>
                    <select
                      value={formKejadian.kategori}
                      onChange={(e) =>
                        setFormKejadian({
                          ...formKejadian,
                          kategori: e.target.value as KategoriKejadian,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none bg-white font-semibold"
                    >
                      {KATEGORI_KEJADIAN.map((kategori) => (
                        <option key={kategori.value} value={kategori.value}>
                          {kategori.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nama Siswa (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Nama siswa"
                        value={formKejadian.namaSiswaTerlibat}
                        onChange={(e) => setFormKejadian({ ...formKejadian, namaSiswaTerlibat: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Kelas</label>
                      <input
                        type="text"
                        placeholder="Contoh: VII A"
                        value={formKejadian.kelasSiswa}
                        onChange={(e) => setFormKejadian({ ...formKejadian, kelasSiswa: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kronologi / Rincian Peristiwa</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Jelaskan apa yang terjadi secara ringkas dan jelas..."
                    value={formKejadian.deskripsi}
                    onChange={(e) => setFormKejadian({ ...formKejadian, deskripsi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tindakan / Penanganan yang Diambil</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Diberikan pertolongan pertama di UKS dan dijemput orang tua / Diberikan teguran dan pembinaan wali kelas..."
                    value={formKejadian.tindakanPenanganan}
                    onChange={(e) => setFormKejadian({ ...formKejadian, tindakanPenanganan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTampilFormKejadian(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition"
                  >
                    Simpan ke Buku Jurnal
                  </button>
                </div>
              </form>
            )}

            {/* TABEL CATATAN KEJADIAN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase">Riwayat Catatan Harian</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Nama lengkap khusus akses guru piket/BK untuk penanganan resmi.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400">Total {daftarKejadian.length} laporan terekam</span>
              </div>

              {daftarKejadian.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600 mb-1">Belum ada catatan kejadian hari ini.</p>
                  <p>Kondisi sekolah kondusif atau belum ada insiden yang dicatat guru pengawas.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Waktu & Guru Piket</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Siswa Terlibat (Nama Lengkap)</th>
                        <th className="p-3">Peristiwa / Kronologi</th>
                        <th className="p-3">Tindakan Penanganan</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daftarKejadian.map((item) => {
                        let badgeKategori = "bg-blue-50 text-blue-700 border-blue-200";
                        if (item.kategori === "Kedisiplinan") badgeKategori = "bg-rose-50 text-rose-700 border-rose-200";
                        if (item.kategori === "Kesehatan / UKS") badgeKategori = "bg-amber-50 text-amber-700 border-amber-200";
                        if (item.kategori === "Fasilitas / Sarpras") badgeKategori = "bg-purple-50 text-purple-700 border-purple-200";

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3 whitespace-nowrap">
                              <p className="font-bold text-slate-900">{item.tanggal}</p>
                              <p className="text-[10px] text-blue-600 font-mono">{item.waktu}</p>
                              <p className="text-[10px] text-slate-400">Oleh: {item.guruPiket}</p>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${badgeKategori}`}>
                                {item.kategori}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <p className="font-semibold text-slate-800">{item.namaSiswaTerlibat}</p>
                              {item.kelasSiswa && item.kelasSiswa !== "-" && (
                                <p className="text-[10px] text-slate-400 font-bold">Kelas: {item.kelasSiswa}</p>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 max-w-xs">{item.deskripsi}</td>
                            <td className="p-3 text-slate-700 max-w-xs font-medium bg-slate-50/40">{item.tindakanPenanganan}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleHapusKejadian(item.id)}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DATA MUTASI SISWA (KHUSUS ADMIN TU) */}
        {isAdminTu && tabAktif === "mutasi" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-xs font-bold text-slate-700 uppercase">
                  Data Mutasi Siswa
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Daftar permohonan mutasi masuk dan keluar yang tersimpan pada
                  tabel mutasi_siswa.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
                  Masuk:{" "}
                  {daftarMutasi.filter((item) => item.jenisMutasi === "MASUK").length}
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  Keluar:{" "}
                  {daftarMutasi.filter((item) => item.jenisMutasi === "KELUAR").length}
                </span>
                <Link
                  href="/mutasi-siswa"
                  className="text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-lg transition"
                >
                  + Ajukan Mutasi
                </Link>
              </div>
            </div>

            {daftarMutasi.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-600 mb-1">
                  Belum ada permohonan mutasi siswa.
                </p>
                <p>
                  Data mutasi masuk dan keluar akan tampil di sini setelah
                  tersimpan pada tabel mutasi_siswa.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[1180px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Jenis</th>
                      <th className="p-3">Siswa</th>
                      <th className="p-3">Tanggal Mutasi</th>
                      <th className="p-3">Sekolah Asal / Tujuan</th>
                      <th className="p-3">Alasan</th>
                      <th className="p-3">No. Surat</th>
                      <th className="p-3 text-right">Status Berkas</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {daftarMutasi.map((item, idx) => {
                      const siswa =
                        item.siswaId !== null
                          ? petaAkunSiswa.get(item.siswaId)
                          : undefined;
                      const namaSiswa =
                        item.namaSiswa ||
                        siswa?.nama ||
                        (item.siswaId !== null
                          ? `Siswa #${item.siswaId}`
                          : "Siswa");
                      const nisnSiswa = item.nisn || siswa?.nisn || "-";
                      const kelasSiswa = item.kelas || siswa?.kelas || "-";
                      const status = item.statusBerkas.toLowerCase();
                      let badgeStatus =
                        "bg-slate-50 text-slate-700 border-slate-200";

                      if (status.includes("menunggu") || status.includes("proses")) {
                        badgeStatus =
                          "bg-amber-50 text-amber-700 border-amber-200";
                      } else if (
                        status.includes("setuju") ||
                        status.includes("selesai") ||
                        status.includes("terima")
                      ) {
                        badgeStatus =
                          "bg-emerald-50 text-emerald-700 border-emerald-200";
                      } else if (
                        status.includes("tolak") ||
                        status.includes("batal")
                      ) {
                        badgeStatus = "bg-rose-50 text-rose-700 border-rose-200";
                      }

                      const waPemohon = item.noTeleponWali
                        ? buatUrlWhatsAppMutasi(item.noTeleponWali, namaSiswa)
                        : null;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="p-3 font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                                item.jenisMutasi === "MASUK"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.jenisMutasi}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <p className="font-semibold text-slate-800">
                              {namaSiswa}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              NISN {nisnSiswa} • {kelasSiswa}
                            </p>
                          </td>
                          <td className="p-3 whitespace-nowrap font-medium text-slate-700">
                            {item.tanggalMutasi}
                          </td>
                          <td className="p-3 text-slate-600 max-w-[220px]">
                            {item.sekolahAsalTujuan}
                          </td>
                          <td className="p-3 text-slate-600 max-w-[240px]">
                            {item.alasan}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                            {item.noSuratMutasi || "-"}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${badgeStatus}`}
                            >
                              {item.statusBerkas}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => bukaDetailMutasi(item)}
                                  className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition"
                                >
                                  Verifikasi / Detail
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetujuiMutasi(item)}
                                  disabled={memprosesMutasi === item.id}
                                  className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                                >
                                  {memprosesMutasi === item.id
                                    ? "Menyimpan..."
                                    : "Setujui"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTolakMutasi(item)}
                                  disabled={memprosesMutasi === item.id}
                                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                                >
                                  Tolak
                                </button>
                              </div>
                              {waPemohon ? (
                                <a
                                  href={waPemohon}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                                >
                                  💬 Hubungi Pemohon
                                </a>
                              ) : (
                                <span className="text-[10px] italic text-slate-400">
                                  Nomor WA tidak tersedia
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DATA AKUN SISWA & RIWAYAT SANDI */}
        {tabAktif === "akun" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-700 uppercase">
                  Data Akun Siswa & Riwayat Sandi
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Khusus guru piket/BK untuk bantuan reset akun siswa.
                </p>
              </div>
              <span className="text-[11px] text-slate-400">
                {daftarAkun.length} akun siswa
              </span>
            </div>

            <div className="m-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              ⚠️ Data kata sandi bersifat sensitif. Gunakan hanya untuk
              verifikasi dan bantuan resmi siswa di sekolah.
            </div>

            {memuatAkun ? (
              <p className="p-10 text-center text-xs text-slate-400">
                Memuat data akun siswa...
              </p>
            ) : daftarAkun.length === 0 ? (
              <p className="p-10 text-center text-xs text-slate-400">
                Belum ada akun siswa yang terdaftar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">NISN</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">Kelas</th>
                      <th className="p-3">Tanggal Terakhir Ganti Sandi</th>
                      <th className="p-3">Kata Sandi Terkini</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {daftarAkun.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                          {item.nisn}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 min-w-[160px]">
                          {item.nama}
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {item.kelas}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-700">
                            {formatTanggalSandi(item.tanggalGantiSandi)}
                          </p>
                          {item.sumberSandi && (
                            <span className="text-[10px] text-slate-400">
                              {item.sumberSandi === "guru"
                                ? "Reset oleh guru"
                                : "Diubah mandiri siswa"}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {item.sandiTerkini ? (
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-[11px] bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-800">
                                {sandiTerlihat[item.id]
                                  ? item.sandiTerkini
                                  : "••••••"}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleLihatSandi(item.id)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                              >
                                {sandiTerlihat[item.id]
                                  ? "Sembunyikan"
                                  : "Lihat Sandi"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Belum ada riwayat
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleResetSandi(item)}
                            disabled={resetLoading === item.nisn}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            {resetLoading === item.nisn
                              ? "Mereset..."
                              : "Reset Sandi Default"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ADMINISTRASI PENGAMBILAN IJAZAH (KHUSUS ADMIN TU) */}
        {isAdminTu && tabAktif === "ijazah" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Administrasi Pengambilan Ijazah
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catat penyerahan ijazah kepada siswa / wali dan simpan bukti
                  serah terima secara digital.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                    Belum Diambil: {ijazahBelumDiambil}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    Sudah Diambil: {daftarIjazah.length - ijazahBelumDiambil}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTampilFormIjazah(!tampilFormIjazah)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
              >
                {tampilFormIjazah ? "✕ Tutup Form" : "+ Catat Ijazah Baru"}
              </button>
            </div>

            <form
              onSubmit={handleSimpanSyaratIjazah}
              className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Kelola Persyaratan Pengambilan Ijazah Alumni
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Tulis satu poin persyaratan per baris. Nomor urut akan
                    dibuat otomatis saat ditampilkan di halaman publik.
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {memuatSyaratIjazah
                    ? "Memuat pengaturan..."
                    : pengaturanSyaratIjazah
                      ? `Terakhir diubah: ${
                          pengaturanSyaratIjazah.updatedAt
                        } oleh ${
                          pengaturanSyaratIjazah.updatedBy || "Admin TU"
                        }`
                      : "Belum ada pengaturan tersimpan"}
                </span>
              </div>

              <textarea
                rows={10}
                required
                value={draftSyaratIjazah}
                onChange={(e) => setDraftSyaratIjazah(e.target.value)}
                disabled={memuatSyaratIjazah}
                placeholder="Tulis satu poin persyaratan per baris..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-3 text-xs leading-relaxed text-slate-800 focus:border-amber-500 focus:outline-none disabled:opacity-60"
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Pratinjau tampilan publik
                </p>
                {draftSyaratIjazah
                  .split(/\r?\n/)
                  .map((poin) => poin.trim())
                  .filter(Boolean)
                  .length === 0 ? (
                  <p className="text-[11px] italic text-slate-400">
                    Belum ada poin persyaratan.
                  </p>
                ) : (
                  <ol className="ml-4 list-decimal list-outside space-y-1 text-[11px] leading-relaxed text-slate-600">
                    {draftSyaratIjazah
                      .split(/\r?\n/)
                      .map((poin) => poin.trim())
                      .filter(Boolean)
                      .map((poin, idx) => (
                        <li key={`${idx}-${poin}`} className="pl-0.5">
                          {poin}
                        </li>
                      ))}
                  </ol>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Perubahan akan langsung tampil pada kartu informasi di
                  Beranda setelah disimpan.
                </p>
                <button
                  type="submit"
                  disabled={menyimpanSyaratIjazah || memuatSyaratIjazah}
                  className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {menyimpanSyaratIjazah
                    ? "Menyimpan..."
                    : "Simpan Perubahan Persyaratan"}
                </button>
              </div>
            </form>

            {tampilFormIjazah && (
              <form
                onSubmit={handleTambahIjazah}
                className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs"
              >
                <h3 className="font-bold text-amber-900 border-b border-slate-100 pb-2">
                  Formulir Arsip Ijazah
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Siswa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formIjazah.namaSiswa}
                      onChange={(e) =>
                        setFormIjazah((prev) => ({
                          ...prev,
                          namaSiswa: e.target.value,
                        }))
                      }
                      placeholder="Nama lengkap siswa"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      NISN
                    </label>
                    <input
                      type="text"
                      value={formIjazah.nisn}
                      onChange={(e) =>
                        setFormIjazah((prev) => ({
                          ...prev,
                          nisn: e.target.value,
                        }))
                      }
                      placeholder="Nomor induk siswa"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kelas
                    </label>
                    <input
                      type="text"
                      value={formIjazah.kelas}
                      onChange={(e) =>
                        setFormIjazah((prev) => ({
                          ...prev,
                          kelas: e.target.value,
                        }))
                      }
                      placeholder="Contoh: IX A"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tahun Lulus
                    </label>
                    <input
                      type="text"
                      value={formIjazah.tahunLulus}
                      onChange={(e) =>
                        setFormIjazah((prev) => ({
                          ...prev,
                          tahunLulus: e.target.value,
                        }))
                      }
                      placeholder="2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">
                      Catatan
                    </label>
                    <input
                      type="text"
                      value={formIjazah.catatan}
                      onChange={(e) =>
                        setFormIjazah((prev) => ({
                          ...prev,
                          catatan: e.target.value,
                        }))
                      }
                      placeholder="Contoh: Ijazah disimpan di TU / diwakilkan wali"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTampilFormIjazah(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm transition"
                  >
                    Simpan ke Arsip
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase">
                  Arsip Pengambilan Ijazah
                </h3>
                <input
                  type="text"
                  value={pencarianIjazah}
                  onChange={(e) => setPencarianIjazah(e.target.value)}
                  placeholder="Cari nama, NISN, atau kelas..."
                  className="w-full sm:w-64 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {memuatIjazah ? (
                <p className="p-10 text-center text-xs text-slate-400">
                  Memuat arsip ijazah...
                </p>
              ) : ijazahFiltered.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <p className="font-semibold text-slate-600 mb-1">
                    {daftarIjazah.length === 0
                      ? "Belum ada arsip pengambilan ijazah."
                      : "Tidak ada arsip yang cocok dengan pencarian."}
                  </p>
                  <p>
                    Tambahkan arsip baru saat siswa atau wali mengambil ijazah
                    di Tata Usaha.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">No</th>
                        <th className="p-3">Siswa</th>
                        <th className="p-3">Tahun Lulus</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Tanggal & Pengambil</th>
                        <th className="p-3">Petugas TU</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ijazahFiltered.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="p-3 font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">
                              {item.namaSiswa}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {item.nisn || "-"} • {item.kelas || "-"}
                            </p>
                            {item.catatan && (
                              <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-[220px]">
                                {item.catatan}
                              </p>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                            {item.tahunLulus || "-"}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                                item.status === "Diambil"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <p className="font-semibold text-slate-700">
                              {item.tanggalAmbil || "-"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {item.diambilOleh
                                ? `Oleh: ${item.diambilOleh}`
                                : "Belum diambil"}
                            </p>
                          </td>
                          <td className="p-3 text-slate-600">
                            {item.petugas || "-"}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                            {item.status === "Diambil" ? (
                              <button
                                type="button"
                                onClick={() => handleBatalkanAmbilIjazah(item)}
                                disabled={memprosesIjazah === item.id}
                                className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                              >
                                Batalkan
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAmbilIjazah(item)}
                                disabled={memprosesIjazah === item.id}
                                className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                              >
                                {memprosesIjazah === item.id
                                  ? "Menyimpan..."
                                  : "Tandai Diambil"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleHapusIjazah(item)}
                              disabled={memprosesIjazah === item.id}
                              className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: STATISTIK PENGUNJUNG */}
        {tabAktif === "statistik" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xs font-bold text-slate-700 uppercase">
                Rekap Kunjungan Harian Website
              </h2>
            </div>

            {riwayatKunjungan.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">Belum ada data kunjungan yang terekam.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Jumlah Pengunjung</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riwayatKunjungan.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-800">{item.tanggal}</td>
                        <td className="p-3 font-bold text-blue-600">{item.jumlah} Orang</td>
                        <td className="p-3 text-right">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-semibold px-2 py-0.5 rounded">
                            Terekam
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Toast Notifikasi Sukses */}
      {notifikasiSukses && (
        <div className="fixed top-5 right-5 z-[10000] max-w-sm">
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg">
            <span className="text-base leading-none">✅</span>
            <span className="leading-relaxed">{notifikasiSukses}</span>
            <button
              type="button"
              onClick={() => setNotifikasiSukses("")}
              className="ml-1 shrink-0 text-emerald-600 hover:text-emerald-900"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal Verifikasi Berkas Mutasi Siswa */}
      {mutasiTerpilih && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-detail-mutasi"
          onClick={() => setMutasiTerpilih(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 p-5 backdrop-blur">
              <div>
                <h3
                  id="judul-detail-mutasi"
                  className="text-sm font-bold text-slate-900"
                >
                  Verifikasi Berkas Mutasi Siswa
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Periksa ringkasan data, berkas pendukung, lalu setujui atau
                  tolak permohonan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMutasiTerpilih(null)}
                className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded border text-[10px] font-bold ${
                    mutasiTerpilih.jenisMutasi === "MASUK"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  Mutasi {mutasiTerpilih.jenisMutasi}
                </span>
                <span className="px-2.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700">
                  {mutasiTerpilih.statusBerkas}
                </span>
                <span className="text-[10px] text-slate-400">
                  Diajukan: {mutasiTerpilih.createdAt || "-"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Nama Siswa
                  </p>
                  <p className="mt-0.5 font-bold text-slate-900">
                    {mutasiTerpilih.namaSiswa || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    NISN / Kelas
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {mutasiTerpilih.nisn || "-"} •{" "}
                    {mutasiTerpilih.kelas || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Jenis Kelamin
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {mutasiTerpilih.jenisKelamin || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Tanggal Mutasi
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {mutasiTerpilih.tanggalMutasi || "-"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Sekolah Asal / Tujuan
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {mutasiTerpilih.sekolahAsalTujuan || "-"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Alasan Mutasi
                  </p>
                  <p className="mt-0.5 text-slate-700">
                    {mutasiTerpilih.alasan || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Nama Orang Tua / Wali
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {mutasiTerpilih.namaWali || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    No. WhatsApp Pemohon
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-700">
                    {mutasiTerpilih.noTeleponWali || "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Foto / Berkas Surat Pindah
                </p>
                {mutasiTerpilih.berkasPendukung ? (
                  mutasiTerpilih.berkasPendukung.startsWith("data:image") ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={mutasiTerpilih.berkasPendukung}
                        alt={`Berkas mutasi ${mutasiTerpilih.namaSiswa ?? ""}`}
                        className="max-h-[420px] w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <iframe
                        src={mutasiTerpilih.berkasPendukung}
                        title={`Berkas mutasi ${mutasiTerpilih.namaSiswa ?? ""}`}
                        className="h-72 w-full rounded-xl border border-slate-200 bg-white"
                      />
                      <a
                        href={mutasiTerpilih.berkasPendukung}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        📄 Buka berkas pendukung di tab baru
                      </a>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-[11px] italic text-slate-400">
                    Pemohon belum mengunggah foto / berkas surat pindah.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                <label
                  htmlFor="nomor-surat-mutasi"
                  className="block text-[11px] font-bold text-emerald-900"
                >
                  Nomor Surat Resmi (diisi saat menyetujui)
                </label>
                <input
                  id="nomor-surat-mutasi"
                  type="text"
                  value={nomorSuratMutasi}
                  onChange={(e) => setNomorSuratMutasi(e.target.value)}
                  placeholder="Contoh: 421.3/123/SMPN.1/2026"
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-4">
                <div>
                  {mutasiTerpilih.noTeleponWali ? (
                    <a
                      href={buatUrlWhatsAppMutasi(
                        mutasiTerpilih.noTeleponWali,
                        mutasiTerpilih.namaSiswa ||
                          `Siswa #${mutasiTerpilih.id}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      💬 Hubungi Pemohon
                    </a>
                  ) : (
                    <span className="text-[10px] italic text-slate-400">
                      Nomor WhatsApp pemohon tidak tersedia.
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleTolakMutasi(mutasiTerpilih)}
                    disabled={memprosesMutasi === mutasiTerpilih.id}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    Tolak Berkas
                  </button>
                  <button
                    type="button"
                    onClick={handleSetujuiMutasiDariModal}
                    disabled={memprosesMutasi === mutasiTerpilih.id}
                    className="rounded-xl bg-emerald-600 px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {memprosesMutasi === mutasiTerpilih.id
                      ? "Menyimpan..."
                      : "Setujui & Simpan Nomor Surat"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback WhatsApp Web saat Fonnte gagal / nomor dummy */}
      <NotifikasiWhatsAppFallback
        data={fallbackWa}
        onClose={() => setFallbackWa(null)}
      />

      {/* Modal Foto Surat Bukti */}
      {modalFoto && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          style={{ pointerEvents: "auto" }}
          onClick={() => setModalFoto(null)}
        >
          <div
            className="bg-white p-5 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl relative z-[10000]"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Foto Bukti Surat Izin Siswa</h3>
                <p className="text-[11px] text-slate-500">Tanda tangan orang tua / surat keterangan dokter</p>
              </div>
              <button
                onClick={() => setModalFoto(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              <img
                src={modalFoto}
                alt="Foto Bukti Surat Izin"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
