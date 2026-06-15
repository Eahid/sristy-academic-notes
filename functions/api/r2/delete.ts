import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

interface Env {
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = context.env;

    const { storagePath } = (await context.request.json()) as { storagePath?: string };
    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: "storagePath parameter is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!storagePath.startsWith("files/")) {
      return new Response(
        JSON.stringify({ success: true, message: "Skipped deleting stub file configuration" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
    if (!configured) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Cleared DB entry, bypassed storage deletion since credentials are not configured in Cloudflare environment dashboard.",
        }),
        { headers: { "Content-Type": "application/json" } }
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

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: storagePath,
    });

    await s3.send(command);

    return new Response(
      JSON.stringify({ success: true, message: "Physical binary storage successfully cleared from Cloudflare R2 on edge." }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Failed to release physical file binary from R2.",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
