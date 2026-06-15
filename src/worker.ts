import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface Env {
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle R2 API routes
    if (path.startsWith("/api/r2/")) {
      // CORS preflight requests
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS, HEAD",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
          },
        });
      }

      try {
        if (path === "/api/r2/status" && request.method === "GET") {
          return await handleStatus(request, env);
        } else if (path === "/api/r2/presigned-upload-url" && request.method === "POST") {
          return await handlePresignedUploadUrl(request, env);
        } else if (path === "/api/r2/file" && request.method === "GET") {
          return await handleFileDownload(request, env);
        } else if (path === "/api/r2/delete" && request.method === "POST") {
          return await handleFileDelete(request, env);
        }

        return jsonResponse({ error: "Method not allowed or route not found" }, 404);
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // Otherwise, fall back to serving static assets (Vite frontend)
    return env.ASSETS.fetch(request);
  },
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;
  const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

  return jsonResponse({
    configured,
    bucketName: R2_BUCKET_NAME || "sristy-academic-notes",
    message: configured
      ? "R2 Cloudflare credentials initialized successfully via Cloudflare Workers."
      : "Missing required Cloudflare R2 credentials (R2_ENDPOINT, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY) in Cloudflare Workers environment variables.",
  });
}

async function handlePresignedUploadUrl(request: Request, env: Env): Promise<Response> {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;
  const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

  if (!configured) {
    return jsonResponse({
      error: "R2_NOT_CONFIGURED",
      message: "R2 Environment credentials are not defined in Cloudflare dashboard settings yet.",
    }, 412);
  }

  const { fileName, fileType } = (await request.json()) as { fileName?: string; fileType?: string };
  if (!fileName) {
    return jsonResponse({ error: "fileName parameter is required." }, 400);
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

  return jsonResponse({
    uploadUrl,
    storagePath: uniqueKey,
    fileUrl,
  });
}

async function handleFileDownload(request: Request, env: Env): Promise<Response> {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response("Parameter 'key' is required.", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
  if (!configured) {
    return new Response("S3 Storage credentials are not fully configured in Cloudflare environment dashboard.", {
      status: 412,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function handleFileDelete(request: Request, env: Env): Promise<Response> {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = env;

  const { storagePath } = (await request.json()) as { storagePath?: string };
  if (!storagePath) {
    return jsonResponse({ error: "storagePath parameter is required." }, 400);
  }

  if (!storagePath.startsWith("files/")) {
    return jsonResponse({ success: true, message: "Skipped deleting stub file configuration" });
  }

  const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
  if (!configured) {
    return jsonResponse({
      success: true,
      message: "Cleared DB entry, bypassed storage deletion since credentials are not configured in Cloudflare environment dashboard.",
    });
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

  return jsonResponse({ success: true, message: "Physical binary storage successfully cleared from Cloudflare R2 on edge." });
}
