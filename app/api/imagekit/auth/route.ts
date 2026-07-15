import { getUploadAuthParams } from "@imagekit/next/server";
import { requireApiUser, authErrorResponse } from "@/lib/server/auth";
import { getImageKitConfig } from "@/lib/imagekit/server";

export async function GET() {
  try {
    const user = await requireApiUser();
    const { publicKey, privateKey, urlEndpoint } = getImageKitConfig();
    const authenticationParameters = getUploadAuthParams({ publicKey, privateKey });
    return Response.json(
      { ...authenticationParameters, publicKey, urlEndpoint, userId: user.id },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
