"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M1.5 12s3.8-6.75 10.5-6.75S22.5 12 22.5 12s-3.8 6.75-10.5 6.75S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

/**
 * Input kata sandi dengan tombol mata untuk menampilkan/menyembunyikan teks.
 * className dari halaman tetap dipakai; `pr-10` ditambahkan agar teks tidak
 * menabrak ikon di sisi kanan kotak input.
 */
export default function PasswordInput({
  className = "",
  disabled = false,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const label = showPassword
    ? "Sembunyikan kata sandi"
    : "Tampilkan kata sandi";

  return (
    <div className="relative">
      <input
        {...props}
        type={showPassword ? "text" : "password"}
        disabled={disabled}
        className={`${className} pr-10`.trim()}
      />
      <button
        type="button"
        onClick={() => setShowPassword((nilai) => !nilai)}
        disabled={disabled}
        aria-label={label}
        aria-pressed={showPassword}
        title={label}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition hover:text-slate-700 focus:outline-none focus:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
