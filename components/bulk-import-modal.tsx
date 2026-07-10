"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemoStore } from "@/lib/demo-store";
import { createUuid, formatKm } from "@/lib/utils";
import type { User, Vehicle } from "@/lib/types";

type ImportKind = "vehicle" | "driver";
type PreviewRow = {
  id: string;
  rowNumber: number;
  label: string;
  secondary: string;
  detail: string;
  entity: Vehicle | User;
  errors: string[];
  result?: "success" | "failed";
  resultMessage?: string;
};

const config = {
  vehicle: {
    title: "Import Data Kendaraan",
    description:
      "Tambahkan banyak kendaraan sekaligus dari file Excel atau CSV.",
    template: "/templates/TEMPLATE_IMPORT_KENDARAAN_JNE.xlsx",
    templateName: "TEMPLATE_IMPORT_KENDARAAN_JNE.xlsx",
  },
  driver: {
    title: "Import Data Driver",
    description: "Buat banyak akun driver sekaligus dari file Excel atau CSV.",
    template: "/templates/TEMPLATE_IMPORT_DRIVER_JNE.xlsx",
    templateName: "TEMPLATE_IMPORT_DRIVER_JNE.xlsx",
  },
};

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const cell = (row: Record<string, unknown>, aliases: string[]) => {
  const entries = Object.entries(row);
  const keys = aliases.map(normalizeKey);
  const found = entries.find(([key]) => keys.includes(normalizeKey(key)));
  return String(found?.[1] ?? "").trim();
};
const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
};
const normalizeStatus = (value: string) =>
  !["NONAKTIF", "TIDAK AKTIF", "0", "FALSE"].includes(
    value.trim().toUpperCase(),
  );
const parseKm = (value: string) => {
  if (!value) return 0;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  return Number(normalized);
};

export function BulkImportModal({
  kind,
  onClose,
  onComplete,
}: {
  kind: ImportKind;
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const store = useDemoStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const validRows = rows.filter(
    (row) => row.errors.length === 0 && row.result !== "failed",
  );
  const invalidRows = rows.filter(
    (row) => row.errors.length > 0 || row.result === "failed",
  );

  const parseFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    setRows([]);
    setFinished(false);
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName =
        workbook.SheetNames.find((name) => name.toLowerCase() === "data") ??
        workbook.SheetNames[0];
      if (!sheetName)
        throw new Error("File tidak memiliki sheet yang dapat dibaca.");
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[sheetName],
        { defval: "", raw: false },
      );
      if (!rawRows.length)
        throw new Error("File kosong. Isi data pada template terlebih dahulu.");
      const preview =
        kind === "vehicle"
          ? parseVehicles(rawRows, store.vehicles, store.assetUnitLabels)
          : parseDrivers(rawRows, store.users, store.vehicles);
      if (!preview.length)
        throw new Error("Tidak ada baris data yang dapat dibaca.");
      setRows(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File tidak dapat dibaca.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const importRows = async () => {
    setBusy(true);
    setError("");
    let success = 0;
    let failed = 0;
    const next = [...rows];
    for (let index = 0; index < next.length; index += 1) {
      if (next[index].errors.length) continue;
      try {
        if (kind === "vehicle")
          await store.saveVehicle(next[index].entity as Vehicle);
        else await store.saveUser(next[index].entity as User);
        next[index] = { ...next[index], result: "success" };
        success += 1;
      } catch (err) {
        next[index] = {
          ...next[index],
          result: "failed",
          resultMessage: err instanceof Error ? err.message : "Gagal disimpan",
        };
        failed += 1;
      }
      setRows([...next]);
    }
    setBusy(false);
    setFinished(true);
    if (!failed)
      onComplete(
        `${success} ${kind === "vehicle" ? "kendaraan" : "driver"} berhasil diimpor.`,
      );
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto my-3 w-full max-w-4xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:my-8">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-jne-blue">
              <FileSpreadsheet className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {config[kind].title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {config[kind].description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-jne-blue">
                Langkah 1
              </p>
              <h3 className="mt-2 font-extrabold text-slate-900">
                Unduh dan isi template
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Gunakan format kolom yang sudah disiapkan agar data terbaca
                dengan benar.
              </p>
              <a
                href={config[kind].template}
                download={config[kind].templateName}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-jne-blue hover:bg-blue-50"
              >
                <Download className="h-4 w-4" /> Download Template Excel
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-jne-red">
                Langkah 2
              </p>
              <h3 className="mt-2 font-extrabold text-slate-900">
                Pilih file yang sudah diisi
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Format yang didukung: XLSX, XLS, dan CSV. Maksimal 1.000 baris.
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv,text/csv"
                onChange={(event) => parseFile(event.target.files?.[0])}
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <Upload className="h-4 w-4" />{" "}
                {fileName ? "Pilih File Lain" : "Pilih File Import"}
              </Button>
            </div>
          </div>

          {busy && !rows.length && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 py-10 text-sm font-semibold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-jne-blue" />{" "}
              Membaca dan memeriksa file…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {error}
            </div>
          )}
          {rows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-extrabold text-slate-900">
                    Pratinjau Import
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {fileName} · {rows.length} baris terbaca
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    {validRows.length} valid
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                    {invalidRows.length} bermasalah
                  </span>
                </div>
              </div>
              <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Baris</th>
                      <th className="px-4 py-3">Data Utama</th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.errors.length || row.result === "failed"
                            ? "bg-red-50/40"
                            : ""
                        }
                      >
                        <td className="px-4 py-3 font-bold text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="px-4 py-3">
                          <strong className="block text-slate-900">
                            {row.label || "—"}
                          </strong>
                          <span className="text-xs text-slate-500">
                            {row.secondary}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.detail}
                        </td>
                        <td className="px-4 py-3">
                          {row.result === "success" ? (
                            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" /> Tersimpan
                            </span>
                          ) : row.errors.length || row.result === "failed" ? (
                            <div className="max-w-xs text-xs font-semibold text-red-700">
                              {[...row.errors, row.resultMessage]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          ) : (
                            <Badge>Aktif</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invalidRows.length > 0 && !finished && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Baris
                  bermasalah akan dilewati. Perbaiki file dan unggah ulang jika
                  semua data harus masuk.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Button variant="outline" onClick={onClose}>
            {finished ? "Selesai" : "Batal"}
          </Button>
          {rows.length > 0 && !finished && (
            <Button
              onClick={importRows}
              disabled={busy || validRows.length === 0}
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}{" "}
              Import {validRows.length} Data Valid
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function parseVehicles(
  rawRows: Record<string, unknown>[],
  existing: Vehicle[],
  unitLabels: string[],
): PreviewRow[] {
  const seen = new Set<string>();
  const allowedUnits = unitLabels.map((label) => label.toUpperCase());
  return rawRows
    .slice(0, 1000)
    .map((row, index) => {
      const code = cell(row, ["Kode Mobil", "Kode"]);
      const plate = cell(row, ["Plat Nomor", "Nomor Plat", "Plat"])
        .toUpperCase()
        .replace(/\s+/g, " ");
      const type = cell(row, ["Jenis Kendaraan", "Jenis"]);
      const unitGroup = (
        cell(row, ["Unit Aset", "Unit", "Kategori Unit", "Inbound Outbound"]) ||
        unitLabels[0] ||
        "INBOUND"
      ).toUpperCase();
      const kmText = cell(row, ["KM Terakhir", "Kilometer Terakhir", "KM"]);
      const km = parseKm(kmText);
      const status = cell(row, ["Status"]);
      const note = cell(row, ["Keterangan", "Catatan"]);
      const errors: string[] = [];
      if (!code) errors.push("Kode Mobil wajib diisi");
      if (!plate) errors.push("Plat Nomor wajib diisi");
      if (!type) errors.push("Jenis Kendaraan wajib diisi");
      if (allowedUnits.length && !allowedUnits.includes(unitGroup))
        errors.push(`Unit Aset harus salah satu: ${unitLabels.join(", ")}`);
      if (!Number.isFinite(km) || km < 0)
        errors.push("KM Terakhir harus berupa angka");
      const plateKey = plate.replace(/\s/g, "");
      if (
        plateKey &&
        (seen.has(plateKey) ||
          existing.some(
            (item) => item.plate.replace(/\s/g, "").toUpperCase() === plateKey,
          ))
      )
        errors.push("Plat Nomor duplikat");
      seen.add(plateKey);
      const vehicle: Vehicle = {
        id: createUuid(),
        code: code.toUpperCase(),
        plate,
        type,
        unitGroup,
        lastKm: Number.isFinite(km) ? km : 0,
        active: normalizeStatus(status || "AKTIF"),
        note,
      };
      return {
        id: createUuid(),
        rowNumber: index + 2,
        label: plate,
        secondary: `${code.toUpperCase()} · ${unitGroup}`,
        detail: `${type || "—"} · ${formatKm(vehicle.lastKm)} KM`,
        entity: vehicle,
        errors,
      };
    })
    .filter(
      (row) => row.label || row.secondary || (row.entity as Vehicle).type,
    );
}

function parseDrivers(
  rawRows: Record<string, unknown>[],
  existing: User[],
  vehicles: Vehicle[],
): PreviewRow[] {
  const seenLogin = new Set<string>();
  const seenPhone = new Set<string>();
  return rawRows
    .slice(0, 1000)
    .map((row, index) => {
      const name = cell(row, ["Nama Driver", "Nama", "Nama User"]);
      const loginId = (
        cell(row, ["ID Login", "ID Kurir", "User ID", "Username"]) ||
        cell(row, ["Nomor HP", "No HP", "Telepon", "Phone"])
      )
        .toUpperCase()
        .replace(/[^A-Z0-9._-]/g, "");
      const phone = normalizePhone(
        cell(row, ["Nomor HP", "No HP", "Telepon", "Phone"]),
      );
      const password = cell(row, ["Password", "Kata Sandi"]);
      const vehicleRef = cell(row, [
        "Kendaraan Utama",
        "Kode Mobil",
        "Plat Nomor",
      ]);
      const status = cell(row, ["Status"]);
      const note = cell(row, ["Keterangan", "Catatan"]);
      const errors: string[] = [];
      if (!name) errors.push("Nama Driver wajib diisi");
      if (!loginId) errors.push("ID Login wajib diisi");
      if (!phone) errors.push("Nomor HP wajib diisi");
      if (!password || password.length < 6)
        errors.push("Password minimal 6 karakter");
      if (
        loginId &&
        (seenLogin.has(loginId) ||
          existing.some(
            (item) =>
              item.role === "DRIVER" &&
              (item.loginId ?? "").toUpperCase() === loginId,
          ))
      )
        errors.push("ID Login duplikat");
      if (
        phone &&
        (seenPhone.has(phone) ||
          existing.some(
            (item) =>
              item.role === "DRIVER" && normalizePhone(item.phone) === phone,
          ))
      )
        errors.push("Nomor HP duplikat");
      seenLogin.add(loginId);
      seenPhone.add(phone);
      const vehicle = vehicleRef
        ? vehicles.find(
            (item) =>
              item.code.toLowerCase() === vehicleRef.toLowerCase() ||
              item.plate.replace(/\s/g, "").toLowerCase() ===
                vehicleRef.replace(/\s/g, "").toLowerCase(),
          )
        : undefined;
      if (vehicleRef && !vehicle)
        errors.push("Kendaraan Utama tidak ditemukan");
      const user: User = {
        id: createUuid(),
        name,
        loginId,
        phone,
        password,
        role: "DRIVER",
        active: normalizeStatus(status || "AKTIF"),
        vehicleId: vehicle?.id,
        note,
      };
      return {
        id: createUuid(),
        rowNumber: index + 2,
        label: name,
        secondary: `${loginId} · ${phone}`,
        detail: vehicle
          ? `${vehicle.plate} · ${vehicle.code}`
          : "Tanpa kendaraan utama",
        entity: user,
        errors,
      };
    })
    .filter((row) => row.label || row.secondary);
}
