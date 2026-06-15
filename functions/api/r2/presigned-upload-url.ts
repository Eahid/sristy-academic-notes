import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface Env {
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = context.env;

    const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
    if (!configured) {
      return new Response(
        JSON.stringify({
          error: "R2_NOT_CONFIGURED",
          message: "R2 Environment credentials are not defined in Cloudflare dashboard settings yet.",
        }),
        { status: 412, headers: { "Content-Type": "application/json" } }
      );
    }

    const { fileName, fileType } = (await context.request.json()) as { fileName?: string; fileType?: string };
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: "fileName parameter is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const cleanEndpoint = R2_ENDPOINT!.replace(/\/$/, "");
    const bucketName = R2_BUCKET_NAME || "sristy-academic-notes";

    const s3 = new S3Client({
      region: "auto",
      endpoint: cleanEndpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    const lastDotIndex = fileName.lastIndexOf(".");
    const fileExtension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";
    let baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    baseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

    const uniqueKey = `files/${Date.now()}_${baseName}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      ContentType: fileType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const fileUrl = `/api/r2/file?key=${encodeURIComponent(uniqueKey)}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        storagePath: uniqueKey,
        fileUrl,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate presigned upload URL.",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
