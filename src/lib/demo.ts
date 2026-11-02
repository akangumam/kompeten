/**
 * Mode demo. Bila true: panel Akun demo di halaman Masuk, akun & Mode Presentasi, menu Skenario (demo),
 * dan toast "(simulasi)" (kode OTP, tautan reset) tersedia. Build produksi menghapusnya dengan mengubahnya ke false;
 * backend sungguhan mengirim OTP/tautan lewat email dan tidak menampilkannya di UI.
 */
export const DEMO_MODE = true

/** Prefiks toast simulasi; kosong di produksi. */
export const simLabel = DEMO_MODE ? '(simulasi) ' : ''
