import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "public", "templates");
const previewDir = path.join(root, ".template-previews");
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

async function buildTemplate({ fileName, title, headers, examples, widths, instructions }) {
  const workbook = Workbook.create();
  const dataSheet = workbook.worksheets.add("Data");
  dataSheet.showGridLines = false;
  dataSheet.getRange(`A1:F${examples.length + 1}`).values = [headers, ...examples];
  dataSheet.getRange("A1:F1").format = {
    fill: "#172D72",
    font: { bold: true, color: "#FFFFFF", size: 11 },
    rowHeight: 28,
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: "#172D72" },
  };
  dataSheet.getRange(`A2:F${examples.length + 1}`).format = {
    fill: "#F7F9FC",
    font: { color: "#172033" },
    rowHeight: 24,
    verticalAlignment: "center",
    borders: { preset: "inside", style: "thin", color: "#E2E8F0" },
  };
  widths.forEach((width, index) => { dataSheet.getRangeByIndexes(0, index, examples.length + 1, 1).format.columnWidth = width; });
  dataSheet.getRange("D2:D500").format.numberFormat = "#,##0";
  dataSheet.getRange("E2:E500").dataValidation = { rule: { type: "list", values: ["AKTIF", "NONAKTIF"] } };
  dataSheet.freezePanes.freezeRows(1);
  const table = dataSheet.tables.add(`A1:F${examples.length + 1}`, true, fileName.includes("KENDARAAN") ? "TemplateKendaraan" : "TemplateDriver");
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;

  const helpSheet = workbook.worksheets.add("Petunjuk");
  helpSheet.showGridLines = false;
  helpSheet.mergeCells("A1:F1");
  helpSheet.getRange("A1:F1").values = [[title]];
  helpSheet.getRange("A1:F1").format = { fill: "#172D72", font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 36, verticalAlignment: "center" };
  helpSheet.mergeCells("A2:F2");
  helpSheet.getRange("A2:F2").values = [["Movetra · Template Import Massal"]];
  helpSheet.getRange("A2:F2").format = { fill: "#E31E24", font: { bold: true, color: "#FFFFFF" }, rowHeight: 26, verticalAlignment: "center" };
  const instructionRows = instructions.map((text, index) => [`${index + 1}.`, text, null, null, null, null]);
  helpSheet.getRange(`A4:F${instructionRows.length + 3}`).values = instructionRows;
  helpSheet.getRange(`A4:A${instructionRows.length + 3}`).format = { font: { bold: true, color: "#E31E24" }, horizontalAlignment: "center" };
  helpSheet.getRange(`B4:F${instructionRows.length + 3}`).merge(true);
  helpSheet.getRange(`B4:F${instructionRows.length + 3}`).format = { wrapText: true, font: { color: "#334155" }, rowHeight: 30, verticalAlignment: "center" };
  helpSheet.getRange("A1:F12").format.columnWidth = 18;
  helpSheet.getRange("A1:A12").format.columnWidth = 6;
  helpSheet.getRange("B1:F12").format.columnWidth = 22;

  const check = await workbook.inspect({ kind: "table", range: `Data!A1:F${examples.length + 1}`, include: "values,formulas", tableMaxRows: 10, tableMaxCols: 8 });
  console.log(check.ndjson);
  for (const sheetName of ["Data", "Petunjuk"]) {
    const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1.5, format: "png" });
    await fs.writeFile(path.join(previewDir, `${fileName}-${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(path.join(outputDir, `${fileName}.xlsx`));
  await fs.rm(path.join(outputDir, `${fileName}.xlsx.inspect.ndjson`), { force: true });
}

await buildTemplate({
  fileName: "TEMPLATE_IMPORT_KENDARAAN_JNE",
  title: "Template Import Data Kendaraan",
  headers: ["Kode Mobil", "Plat Nomor", "Jenis Kendaraan", "KM Terakhir", "Status", "Keterangan"],
  examples: [
    ["TGR042", "B 1234 XYZ", "Mobil Box", 0, "AKTIF", "Armada Tangerang"],
    ["RENTAL-02", "B 9876 ABC", "Blind Van", 12500, "AKTIF", "Kendaraan sewa"],
  ],
  widths: [18, 18, 22, 16, 16, 30],
  instructions: [
    "Isi data pada sheet Data. Jangan mengubah nama kolom pada baris pertama.",
    "Kode Mobil, Plat Nomor, dan Jenis Kendaraan wajib diisi. Plat nomor tidak boleh duplikat.",
    "KM Terakhir harus berupa angka tanpa tanda titik pemisah ribuan.",
    "Status hanya boleh AKTIF atau NONAKTIF.",
    "Hapus baris contoh sebelum mengimpor data sebenarnya, lalu simpan sebagai XLSX atau CSV.",
  ],
});

await buildTemplate({
  fileName: "TEMPLATE_IMPORT_DRIVER_JNE",
  title: "Template Import Data Driver",
  headers: ["Nama Driver", "Nomor HP", "Password", "Kendaraan Utama", "Status", "Keterangan"],
  examples: [
    ["Satria Pratama", "081234567891", "jne12345", "TGR042", "AKTIF", "Driver area Tangerang"],
    ["Fajar Nugraha", "081234567892", "jne12345", "B 9876 ABC", "AKTIF", "Driver pengganti"],
  ],
  widths: [24, 20, 18, 22, 16, 32],
  instructions: [
    "Isi data pada sheet Data. Jangan mengubah nama kolom pada baris pertama.",
    "Nama Driver, Nomor HP, dan Password wajib diisi. Nomor HP tidak boleh duplikat.",
    "Password minimal 6 karakter. Kolom Kendaraan Utama boleh berisi Kode Mobil atau Plat Nomor yang sudah terdaftar.",
    "Status hanya boleh AKTIF atau NONAKTIF.",
    "Hapus baris contoh sebelum mengimpor data sebenarnya, lalu simpan sebagai XLSX atau CSV.",
  ],
});
