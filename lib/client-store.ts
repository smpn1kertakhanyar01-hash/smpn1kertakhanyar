/**
 * Engine penyimpanan universal berbasis localStorage.
 *
 * Vercel menjalankan filesystem/SQLite secara read-only pada lingkungan
 * serverless sehingga data tulis dapat hilang saat instance berganti.
 * Karena itu seluruh modul interaktif (izin, presensi, jurnal) memakai
 * localStorage sebagai Single Source of Truth di browser pengguna.
 *
 * Semua helper bersifat SSR-safe: saat dipanggil di server, helper hanya
 * mengembalikan data default tanpa menyentuh `window`.
 */

/** Nama event lokal agar perubahan langsung tersinkron antar komponen. */
export const CLIENT_STORE_EVENT = "smpn1:client-store-berubah";

export interface DetailPerubahanStore {
  key: string;
}

function klonData<T>(nilai: T): T {
  if (nilai === null || typeof nilai !== "object") return nilai;
  try {
    return JSON.parse(JSON.stringify(nilai)) as T;
  } catch {
    return nilai;
  }
}

function beriTahu(key: string): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<DetailPerubahanStore>(CLIENT_STORE_EVENT, {
      detail: { key },
    })
  );
}

/**
 * Baca data dari localStorage. Jika belum ada / rusak / bukan JSON valid,
 * kembalikan `defaultData` (salinan baru agar tidak termutasi).
 */
export function getStore<T>(key: string, defaultData: T): T {
  if (typeof window === "undefined") return klonData(defaultData);

  try {
    const mentah = window.localStorage.getItem(key);
    if (mentah === null) return klonData(defaultData);

    const hasil = JSON.parse(mentah) as unknown;
    if (hasil === null || hasil === undefined) return klonData(defaultData);

    return hasil as T;
  } catch (error) {
    console.error(`Gagal membaca store "${key}":`, error);
    return klonData(defaultData);
  }
}

/**
 * Simpan data ke localStorage lalu beri tahu seluruh komponen.
 * Mengembalikan `false` bila kuota penuh atau localStorage tidak tersedia.
 */
export function setStore<T>(key: string, data: T): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    beriTahu(key);
    return true;
  } catch (error) {
    console.error(`Gagal menyimpan store "${key}":`, error);
    return false;
  }
}

/**
 * Perbarui satu item berdasarkan `id`. Item yang tidak ditemukan dibiarkan
 * apa adanya; gunakan `setStore` bila ingin menambahkan item baru.
 */
export function updateItem<T extends { id: number | string }>(
  key: string,
  id: number | string,
  updatedFields: Partial<T>
): T[] {
  const daftar = getStore<T[]>(key, []);
  const hasil = daftar.map((item) =>
    String(item?.id) === String(id)
      ? { ...item, ...updatedFields }
      : item
  );

  setStore(key, hasil);
  return hasil;
}

/** Hapus satu item berdasarkan `id`, lalu kembalikan daftar terbaru. */
export function deleteItem<T extends { id: number | string }>(
  key: string,
  id: number | string
): T[] {
  const daftar = getStore<T[]>(key, []);
  const hasil = daftar.filter((item) => String(item?.id) !== String(id));

  setStore(key, hasil);
  return hasil;
}

/** Kosongkan store, lalu beri tahu seluruh komponen. */
export function clearStore(key: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
    beriTahu(key);
  } catch (error) {
    console.error(`Gagal mengosongkan store "${key}":`, error);
  }
}

/** Cek apakah store sudah pernah ditulis (termasuk berisi array kosong). */
export function hasStore(key: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Berlangganan perubahan store dari komponen yang sama, tab lain, maupun
 * saat jendela kembali fokus. Mengembalikan fungsi pembatalan langganan.
 */
export function subscribeStore(
  keys: string | string[],
  callback: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const daftarKunci = Array.isArray(keys) ? keys : [keys];

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || daftarKunci.includes(event.key)) callback();
  };
  const handleLokal = (event: Event) => {
    const detail = (event as CustomEvent<DetailPerubahanStore>).detail;
    if (!detail?.key || daftarKunci.includes(detail.key)) callback();
  };
  const handleFokus = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CLIENT_STORE_EVENT, handleLokal);
  window.addEventListener("focus", handleFokus);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CLIENT_STORE_EVENT, handleLokal);
    window.removeEventListener("focus", handleFokus);
  };
}
