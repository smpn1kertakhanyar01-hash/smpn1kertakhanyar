import type {
  AgendaAkademik,
  AkunSandiSiswa,
  CatatanAbsen,
  CatatanKejadianItem,
  KalenderAkademik,
  KategoriKejadianMaster,
  LogNotifikasiWA,
  LoginPayload,
  MutasiItem,
  MutasiSiswa,
  MutasiSiswaPayload,
  PengambilanIjazah,
  PengambilanIjazahPayload,
  PengaturanLayanan,
  Pengguna,
  RegisterPayload,
  Siswa,
  StatistikPengunjung,
  SuratIzinItem,
} from "./types";
import { KATEGORI_PENGAMBILAN_IJAZAH } from "./constants";
import type { InfoNotifikasiWaServer } from "./izin-notifikasi";
import { STORAGE_KEYS } from "./storage";

interface ApiError {
  error?: string;
}

async function permintaan<T>(url: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEYS.authToken)
      : null;

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let pesan = "Terjadi kesalahan saat menghubungi server.";
    try {
      const data = (await response.json()) as ApiError;
      if (data.error) pesan = data.error;
    } catch {
      // Abaikan respons yang bukan JSON.
    }
    throw new Error(pesan);
  }

  return (await response.json()) as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return permintaan<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Endpoint pencatatan dapat membalas data langsung atau dibungkus
 * `{ success, message, data }` saat SQLite Vercel gagal ditulisi.
 * Fungsi ini mengembalikan bentuk data yang seragam untuk frontend.
 */
function bukaBungkusan<T>(hasil: T | { data?: T }): T {
  if (hasil && typeof hasil === "object" && "data" in hasil) {
    const data = (hasil as { data?: T }).data;
    if (data !== undefined) return data;
  }
  return hasil as T;
}

export const api = {
  login(
    payload: LoginPayload
  ): Promise<{ user: Pengguna; token: string }> {
    return post<{ user: Pengguna; token: string }>("/api/auth/login", payload);
  },

  register(payload: RegisterPayload): Promise<{ user: Pengguna }> {
    return post<{ user: Pengguna }>("/api/auth/register", payload);
  },

  logout(): Promise<{ ok: true }> {
    return post<{ ok: true }>("/api/auth/logout", {});
  },

  changePassword(payload: {
    sandiLama: string;
    sandiBaru: string;
  }): Promise<{ ok: true }> {
    return post<{ ok: true }>("/api/auth/change-password", payload);
  },

  changePasswordPegawai(payload: {
    sandiLama: string;
    sandiBaru: string;
  }): Promise<{ ok: true }> {
    return post<{ ok: true }>(
      "/api/auth/change-password-pegawai",
      payload
    );
  },

  getStudentAccounts(): Promise<AkunSandiSiswa[]> {
    return permintaan<AkunSandiSiswa[]>("/api/auth/accounts");
  },

  resetStudentPassword(
    nisn: string
  ): Promise<{ ok: true; nama: string; sandiBaru: string }> {
    return post<{ ok: true; nama: string; sandiBaru: string }>(
      "/api/auth/accounts/reset",
      { nisn }
    );
  },

  getStudents(): Promise<Siswa[]> {
    return permintaan<Siswa[]>("/api/students");
  },

  getAgenda(): Promise<AgendaAkademik[]> {
    return permintaan<AgendaAkademik[]>("/api/agenda");
  },

  getAttendance(filter?: {
    kelas?: string;
    tanggal?: string;
  }): Promise<CatatanAbsen[]> {
    const params = new URLSearchParams();
    if (filter?.kelas) params.set("kelas", filter.kelas);
    if (filter?.tanggal) params.set("tanggal", filter.tanggal);
    const query = params.toString();
    return permintaan<CatatanAbsen[]>(
      `/api/attendance${query ? `?${query}` : ""}`
    );
  },

  saveAttendance(items: CatatanAbsen[]): Promise<CatatanAbsen[]> {
    return post<CatatanAbsen[]>("/api/attendance", { items });
  },

  deleteAllAttendance(): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>("/api/attendance", { method: "DELETE" });
  },

  getLeaveRequests(nisn?: string): Promise<SuratIzinItem[]> {
    const query = nisn ? `?nisn=${encodeURIComponent(nisn)}` : "";
    return permintaan<SuratIzinItem[]>(`/api/leave-requests${query}`);
  },

  createLeaveRequest(
    payload: Omit<SuratIzinItem, "id">
  ): Promise<SuratIzinItem> {
    return post<SuratIzinItem | { data?: SuratIzinItem }>(
      "/api/leave-requests",
      payload
    ).then((hasil) => bukaBungkusan<SuratIzinItem>(hasil));
  },

  updateLeaveRequestStatus(
    id: number,
    status: string,
    catatan?: string
  ): Promise<SuratIzinItem & { notifikasiWa?: InfoNotifikasiWaServer }> {
    return permintaan<
      SuratIzinItem & { notifikasiWa?: InfoNotifikasiWaServer }
    >(`/api/leave-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, catatan }),
    });
  },

  deleteAllLeaveRequests(): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>("/api/leave-requests", {
      method: "DELETE",
    });
  },

  getIncidents(): Promise<CatatanKejadianItem[]> {
    return permintaan<CatatanKejadianItem[]>("/api/incidents");
  },

  createIncident(
    payload: Omit<CatatanKejadianItem, "id" | "tanggal" | "waktu"> & {
      tanggal?: string;
      waktu?: string;
    }
  ): Promise<CatatanKejadianItem> {
    return post<CatatanKejadianItem | { data?: CatatanKejadianItem }>(
      "/api/incidents",
      payload
    ).then((hasil) => bukaBungkusan<CatatanKejadianItem>(hasil));
  },

  deleteIncident(id: number): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>(`/api/incidents/${id}`, {
      method: "DELETE",
    });
  },

  getMutations(): Promise<MutasiItem[]> {
    return permintaan<MutasiItem[]>("/api/mutations");
  },

  createMutation(payload: Omit<MutasiItem, "id">): Promise<MutasiItem> {
    return post<MutasiItem>("/api/mutations", payload);
  },

  getKalenderAkademik(filter?: {
    kategori?: string;
    mulai?: string;
    selesai?: string;
  }): Promise<KalenderAkademik[]> {
    const params = new URLSearchParams();
    if (filter?.kategori) params.set("kategori", filter.kategori);
    if (filter?.mulai) params.set("mulai", filter.mulai);
    if (filter?.selesai) params.set("selesai", filter.selesai);
    const query = params.toString();
    return permintaan<KalenderAkademik[]>(
      `/api/kalender-akademik${query ? `?${query}` : ""}`
    );
  },

  createKalenderAkademik(
    payload: Omit<KalenderAkademik, "id" | "createdAt">
  ): Promise<KalenderAkademik> {
    return post<KalenderAkademik>("/api/kalender-akademik", payload);
  },

  updateKalenderAkademik(
    id: number,
    payload: Partial<Omit<KalenderAkademik, "id" | "createdAt">>
  ): Promise<KalenderAkademik> {
    return permintaan<KalenderAkademik>(`/api/kalender-akademik/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteKalenderAkademik(id: number): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>(`/api/kalender-akademik/${id}`, {
      method: "DELETE",
    });
  },

  getLogNotifikasiWA(filter?: {
    status?: "BERHASIL" | "GAGAL";
    nomor?: string;
    limit?: number;
  }): Promise<LogNotifikasiWA[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.nomor) params.set("nomor", filter.nomor);
    if (filter?.limit) params.set("limit", String(filter.limit));
    const query = params.toString();
    return permintaan<LogNotifikasiWA[]>(
      `/api/log-notifikasi-wa${query ? `?${query}` : ""}`
    );
  },

  getKategoriKejadian(): Promise<KategoriKejadianMaster[]> {
    return permintaan<KategoriKejadianMaster[]>("/api/kategori-kejadian");
  },

  createKategoriKejadian(payload: {
    namaKategori: string;
    poin?: number;
  }): Promise<KategoriKejadianMaster> {
    return post<KategoriKejadianMaster>("/api/kategori-kejadian", payload);
  },

  updateKategoriKejadian(
    id: number,
    payload: { namaKategori?: string; poin?: number }
  ): Promise<KategoriKejadianMaster> {
    return permintaan<KategoriKejadianMaster>(`/api/kategori-kejadian/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteKategoriKejadian(id: number): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>(`/api/kategori-kejadian/${id}`, {
      method: "DELETE",
    });
  },

  getMutasiSiswa(filter?: {
    siswaId?: number;
    jenis?: "MASUK" | "KELUAR";
  }): Promise<MutasiSiswa[]> {
    const params = new URLSearchParams();
    if (filter?.siswaId) params.set("siswaId", String(filter.siswaId));
    if (filter?.jenis) params.set("jenis", filter.jenis);
    const query = params.toString();
    return permintaan<MutasiSiswa[]>(
      `/api/mutasi-siswa${query ? `?${query}` : ""}`
    );
  },

  createMutasiSiswa(payload: MutasiSiswaPayload): Promise<MutasiSiswa> {
    return post<MutasiSiswa | { data?: MutasiSiswa }>(
      "/api/mutasi-siswa",
      payload
    ).then((hasil) => bukaBungkusan<MutasiSiswa>(hasil));
  },

  updateMutasiSiswa(
    id: number,
    payload: Partial<MutasiSiswaPayload>
  ): Promise<MutasiSiswa> {
    return permintaan<MutasiSiswa>(`/api/mutasi-siswa/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteMutasiSiswa(id: number): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>(`/api/mutasi-siswa/${id}`, {
      method: "DELETE",
    });
  },

  getPengaturanLayanan(
    kategori = KATEGORI_PENGAMBILAN_IJAZAH
  ): Promise<PengaturanLayanan> {
    return permintaan<PengaturanLayanan>(
      `/api/pengaturan-layanan?kategori=${encodeURIComponent(kategori)}`
    );
  },

  simpanPengaturanLayanan(
    kategori: string,
    isiPersyaratan: string
  ): Promise<PengaturanLayanan> {
    return permintaan<PengaturanLayanan>("/api/pengaturan-layanan", {
      method: "PUT",
      body: JSON.stringify({ kategori, isiPersyaratan }),
    });
  },

  getPengambilanIjazah(filter?: {
    status?: "Belum Diambil" | "Diambil";
    pencarian?: string;
  }): Promise<PengambilanIjazah[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.pencarian) params.set("pencarian", filter.pencarian);
    const query = params.toString();
    return permintaan<PengambilanIjazah[]>(
      `/api/pengambilan-ijazah${query ? `?${query}` : ""}`
    );
  },

  createPengambilanIjazah(
    payload: PengambilanIjazahPayload
  ): Promise<PengambilanIjazah> {
    return post<PengambilanIjazah>("/api/pengambilan-ijazah", payload);
  },

  updatePengambilanIjazah(
    id: number,
    payload: Partial<PengambilanIjazahPayload>
  ): Promise<PengambilanIjazah> {
    return permintaan<PengambilanIjazah>(`/api/pengambilan-ijazah/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePengambilanIjazah(id: number): Promise<{ ok: true }> {
    return permintaan<{ ok: true }>(`/api/pengambilan-ijazah/${id}`, {
      method: "DELETE",
    });
  },

  getVisitors(): Promise<StatistikPengunjung> {
    return permintaan<StatistikPengunjung>("/api/visitors");
  },

  recordVisit(): Promise<StatistikPengunjung> {
    return post<StatistikPengunjung>("/api/visitors", {});
  },
};
