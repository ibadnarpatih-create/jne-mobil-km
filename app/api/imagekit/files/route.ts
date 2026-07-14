import { authErrorResponse, requireApiUser } from "@/lib/server/auth";
import { deleteImageKitFile, listImageKitFiles } from "@/lib/imagekit/server";

export async function GET(request: Request) {
  try {
    await requireApiUser(true);
    const url = new URL(request.url);
    const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 24));
    const name = url.searchParams.get("search")?.trim().slice(0, 100) || undefined;
    return Response.json(await listImageKitFiles({ skip, limit, name }));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApiUser(true);
    const { fileId } = (await request.json()) as { fileId?: string };
    if (!fileId) return Response.json({ error: "fileId wajib diisi." }, { status: 400 });
    await deleteImageKitFile(fileId);
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
