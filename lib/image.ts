export async function compressImage(file: File): Promise<string> {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/))
    throw new Error("File harus berupa JPG, PNG, atau WEBP.");
  const src = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = src;
    });
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.82;
    let result = canvas.toDataURL("image/jpeg", quality);
    while (result.length > 2_600_000 && quality > 0.42) {
      quality -= 0.1;
      result = canvas.toDataURL("image/jpeg", quality);
    }
    return result;
  } finally {
    URL.revokeObjectURL(src);
  }
}
