"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  File,
  FolderOpen,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { safeUploadName, uploadToImageKit } from "@/lib/imagekit/client";

type ImageKitFile = {
  fileId: string;
  name: string;
  url: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  filePath: string;
  fileType: "image" | "non-image";
  size: number;
  height?: number;
  width?: number;
  createdAt?: string;
};

const pageSize = 24;

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function fileDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function FileManagerPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ImageKitFile[]>([]);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ skip: String(page * pageSize), limit: String(pageSize) });
      if (search) query.set("search", search);
      const response = await fetch(`/api/imagekit/files?${query}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal memuat file ImageKit.");
      setFiles(Array.isArray(body) ? body : []);
    } catch (cause) {
      setFiles([]);
      setError(cause instanceof Error ? cause.message : "Gagal memuat file.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const uploadFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const items = Array.from(selected);
    const tooLarge = items.find((item) => item.size > 20 * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} melebihi batas 20 MB.`);
      return;
    }
    setUploading(true);
    setError("");
    setNotice("");
    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        await uploadToImageKit({
          file: item,
          fileName: safeUploadName(item.name),
          folder: "/movetra/file-manager",
          tags: ["movetra", "file-manager"],
          onProgress: (value) => setProgress(Math.round(((index + value / 100) / items.length) * 100)),
        });
      }
      setNotice(`${items.length} file berhasil diunggah ke ImageKit.`);
      setPage(0);
      await loadFiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload gagal.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = async (file: ImageKitFile) => {
    if (!window.confirm(`Hapus permanen “${file.name}” dari ImageKit? URL file ini tidak akan bisa dipakai lagi.`)) return;
    setDeleting(file.fileId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/imagekit/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.fileId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gagal menghapus file.");
      setNotice(`${file.name} telah dihapus.`);
      await loadFiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menghapus file.");
    } finally {
      setDeleting(null);
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setNotice("URL file disalin.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950">File Manager</h2>
          <p className="mt-1 text-sm text-slate-500">Kelola seluruh aset baru Movetra yang tersimpan di ImageKit.</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => void uploadFiles(event.target.files)}
          />
          <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? `Mengunggah ${progress}%` : "Upload File"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row">
          <form className="flex flex-1 gap-2" onSubmit={submitSearch}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <Input
                className="pl-11"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari nama file..."
              />
            </div>
            <Button type="submit" variant="outline">Cari</Button>
          </form>
          <Button variant="outline" onClick={() => void loadFiles()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Segarkan
          </Button>
        </CardContent>
      </Card>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-jne-blue" />
        </div>
      ) : files.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 font-bold text-slate-700">Belum ada file ditemukan</p>
            <p className="mt-1 text-sm text-slate-500">Upload file pertama atau ubah kata pencarian.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {files.map((file) => (
            <Card key={file.fileId} className="overflow-hidden">
              <div className="grid aspect-[16/10] place-items-center overflow-hidden bg-slate-100">
                {file.fileType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.thumbnail || file.thumbnailUrl || file.url} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                  <File className="h-14 w-14 text-slate-300" />
                )}
              </div>
              <CardContent className="space-y-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800" title={file.name}>{file.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    {file.fileType === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5" />}
                    {formatBytes(file.size)} · {fileDate(file.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" title="Salin URL" onClick={() => void copyUrl(file.url)}><Clipboard className="h-4 w-4" /></Button>
                  <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50" title="Buka file"><ExternalLink className="h-4 w-4" /></a>
                  <Button className="ml-auto" size="icon" variant="danger" title="Hapus permanen" disabled={deleting === file.fileId} onClick={() => void removeFile(file)}>
                    {deleting === file.fileId ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Halaman {page + 1}</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft className="h-4 w-4" /> Sebelumnya</Button>
          <Button variant="outline" disabled={files.length < pageSize || loading} onClick={() => setPage((value) => value + 1)}>Berikutnya <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
