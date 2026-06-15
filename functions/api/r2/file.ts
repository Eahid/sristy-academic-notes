import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface Env {
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = context.env;

    const url = new URL(context.request.url);
    const key = url.searchParams.get("key");
    if (!key) {
      return new Response("Parameter 'key' is required.", { status: 400 });
    }

    const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
    if (!configured) {
      return new Response("S3 Storage credentials are not fully configured in Cloudflare environment dashboard.", { status: 412 });
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

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return new Response(null, {
      status: 302,
      headers: {
        Location: downloadUrl,
      },
    });
  } catch (error: any) {
    return new Response(`Failed to build pre-signed redirect URL: ${error.message}`, { status: 500 });
  }
};
