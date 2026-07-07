import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Cloudflare R2 S3 Client conditionally (lazy checking to prevent crash)
let s3Client: S3Client | null = null;
const getR2Config = () => {
  const accountIdEndpoint = process.env.R2_ENDPOINT; // Expecting: https://<account_id>.r2.cloudflarestorage.com
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || "sristy-academic-notes";

  if (!accountIdEndpoint || !accessKeyId || !secretAccessKey) {
    return {
      configured: false,
      bucketName,
      error: "Missing required Cloudflare R2 credentials (R2_ENDPOINT, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY) in your environment settings.",
    };
  }

  // Clean the endpoint (must be a valid URL without trailing slash)
  const cleanEndpoint = accountIdEndpoint.replace(/\/$/, "");

  return {
    configured: true,
    bucketName,
    endpoint: cleanEndpoint,
    accessKeyId,
    secretAccessKey,
  };
};

function getS3Client() {
  if (s3Client) return s3Client;

  const config = getR2Config();
  if (!config.configured) {
    throw new Error(config.error);
  }

  s3Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
    },
    // R2 requires path-style routing in some clients, but standard works well. Force path style if needed:
    forcePathStyle: true,
  });

  return s3Client;
}

// SECURE R2 ENDPOINTS

// 1. Get status of Cloudflare R2 integration
app.get("/api/r2/status", (req, res) => {
  const config = getR2Config();
  res.json({
    configured: config.configured,
    bucketName: config.bucketName,
    message: config.configured ? "R2 Cloudflare credentials initialized successfully." : config.error,
  });
});

// 2. Obtain a presigned upload URL
app.post("/api/r2/presigned-upload-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: "fileName parameter is required." });
    }

    const config = getR2Config();
    if (!config.configured) {
      return res.status(412).json({ error: "R2_NOT_CONFIGURED", message: config.error });
    }

    const s3 = getS3Client();
    
    // Generate a secure unique R2 Object Key
    const fileExtension = path.extname(fileName) || "";
    const baseName = path.basename(fileName, fileExtension).replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueKey = `files/${Date.now()}_${baseName}${fileExtension}`;

    // Prepare S3 PutObjectCommand parameters
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: uniqueKey,
      ContentType: fileType || "application/octet-stream",
    });

    // Generate link valid for 1 hour for client to upload directly
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // Construct local secure proxy URL for accessing the file
    const fileUrl = `/api/r2/file?key=${encodeURIComponent(uniqueKey)}`;

    res.json({
      uploadUrl,
      storagePath: uniqueKey,
      fileUrl,
    });
  } catch (error: any) {
    console.error("Failed to generate presigned upload URL: ", error);
    res.status(500).json({ error: "Failed to generate presigned upload URL.", details: error.message });
  }
});

// 3. Download/Preview file via secured same-origin proxy stream to bypass browser iframe blockages
app.get("/api/r2/file", async (req, res) => {
  try {
    const key = req.query.key as string;
    const url = req.query.url as string;
    const isDownload = req.query.download === "true";

    // A. If an external or Firebase Storage absolute URL is explicitly requested to be proxied
    if (url) {
      console.log(`[FileProxy] Server-side proxying external url (isDownload: ${isDownload}): ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch external fallback asset. Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);

      let filename = "preview_file";
      try {
        const parsedUrl = new URL(url);
        filename = path.basename(parsedUrl.pathname) || "preview_file";
      } catch (e) {}

      res.setHeader("Content-Disposition", `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename)}"`);

      const arrayBuf = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    }

    // B. Otherwise, require 'key' for Cloudflare R2 object store
    if (!key) {
      return res.status(400).send("Parameter 'key' or 'url' is required.");
    }

    const config = getR2Config();
    if (!config.configured) {
      // S3 is unconfigured, fallback: check if 'key' is actually an absolute URL
      if (key.startsWith("http://") || key.startsWith("https://")) {
        console.log(`[FileProxy] R2 not configured but key is a URL, proxying: ${key}`);
        const response = await fetch(key);
        if (!response.ok) {
          throw new Error(`Failed to fetch key-url: ${response.status}`);
        }
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(path.basename(key))}"`);

        const arrayBuf = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }
      return res.status(412).send(`S3 Storage not configured on backend: ${config.error}`);
    }

    const s3 = getS3Client();

    // Fetch the object direct body from S3/R2 bucket
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    try {
      const s3Response = await s3.send(command);
      
      const contentType = s3Response.ContentType || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(path.basename(key))}"`);

      if (s3Response.Body) {
        const stream = s3Response.Body as any;
        if (typeof stream.pipe === 'function') {
          stream.pipe(res);
        } else {
          const bytes = await s3Response.Body.transformToByteArray();
          res.send(Buffer.from(bytes));
        }
      } else {
        res.status(404).send("File content body was empty.");
      }
    } catch (s3Err: any) {
      console.warn(`[FileProxy] S3 direct stream failed for key '${key}', falling back to pre-signed redirect:`, s3Err.message);
      const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
      res.redirect(downloadUrl);
    }
  } catch (error: any) {
    console.error(`S3 failed to load R2 file:`, error);
    res.status(500).send(`Failed to deliver file asset: ${error.message}`);
  }
});

// 4. Hard delete object from R2 bucket
app.post("/api/r2/delete", async (req, res) => {
  try {
    const { storagePath } = req.body;
    if (!storagePath) {
      return res.status(400).json({ error: "storagePath parameter is required." });
    }

    // Ignore if deleting a dummy pre-seeded asset
    if (!storagePath.startsWith("files/")) {
      return res.json({ success: true, message: "Skipped deleting stub file configuration" });
    }

    const config = getR2Config();
    if (!config.configured) {
      // If R2 is not fully configured, log warning but return status success so database entry is cleared
      console.warn("Deleted Firestore record bypass: Cloudflare R2 Credentials are not set.");
      return res.json({ success: true, message: "Cleared DB reference, skipped S3 bucket deletion since credentials are unconfigured." });
    }

    const s3 = getS3Client();

    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: storagePath,
    });

    await s3.send(command);
    res.json({ success: true, message: "Physical binary storage successfully cleared from Cloudflare R2." });
  } catch (error: any) {
    console.error(`Failed to delete binary storage from R2 for '${req.body.storagePath}':`, error);
    res.status(500).json({ error: "Failed to release physical file binary from R2.", details: error.message });
  }
});

// 5. Migrate files to another S3-compatible cloud storage bucket
app.post("/api/r2/migrate", async (req, res) => {
  try {
    const { targetConfig, files } = req.body;
    if (!targetConfig) {
      return res.status(400).json({ error: "targetConfig parameter is required." });
    }
    const { endpoint, accessKeyId, secretAccessKey, bucketName } = targetConfig;
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(400).json({ error: "Target S3 credentials (endpoint, accessKeyId, secretAccessKey, bucketName) are incomplete." });
    }
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files list provided for migration." });
    }

    // Clean endpoint
    const cleanTargetEndpoint = endpoint.replace(/\/$/, "");

    // Initialize Target S3 Client
    const targetS3 = new S3Client({
      region: "auto",
      endpoint: cleanTargetEndpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    const currentConfig = getR2Config();
    let currentS3: S3Client | null = null;
    if (currentConfig.configured) {
      try {
        currentS3 = getS3Client();
      } catch (err) {
        console.warn("Could not load current S3 client for migration fetch:", err);
      }
    }

    const processed: any[] = [];
    const failed: any[] = [];

    for (const file of files) {
      const { storagePath, fileName, fileUrl } = file;
      if (!storagePath) continue;

      try {
        let fileBuffer: Uint8Array | Buffer | null = null;
        let contentType = "application/octet-stream";

        // Try getting from current S3 if configured AND the key matches R2 storage path
        if (currentS3 && storagePath.startsWith("files/")) {
          try {
            console.log(`[Migrator] Fetching '${storagePath}' from active R2 bucket...`);
            const getObj = await currentS3.send(new GetObjectCommand({
              Bucket: currentConfig.bucketName,
              Key: storagePath,
            }));
            if (getObj.Body) {
              fileBuffer = await getObj.Body.transformToByteArray();
              contentType = getObj.ContentType || contentType;
            }
          } catch (r2FetchErr: any) {
            console.warn(`[Migrator] Failed to fetch '${storagePath}' from current R2, trying public URL fallback:`, r2FetchErr.message);
          }
        }

        // Fallback: If not fetched from R2 (or if it's stored on standard Firebase Storage), fetch via public fileUrl
        // We use full qualified URL if it starts with http/https, otherwise self-host URL
        if (!fileBuffer && fileUrl) {
          let resolvedUrl = fileUrl;
          if (fileUrl.startsWith("/")) {
            const localAppUrl = process.env.APP_URL || `http://localhost:${PORT}`;
            resolvedUrl = `${localAppUrl.replace(/\/$/, "")}${fileUrl}`;
          }
          console.log(`[Migrator] Fetching from public web URL: ${resolvedUrl}`);
          const webRes = await fetch(resolvedUrl);
          if (webRes.ok) {
            const arrayBuf = await webRes.arrayBuffer();
            fileBuffer = new Uint8Array(arrayBuf);
            contentType = webRes.headers.get("content-type") || contentType;
          } else {
            throw new Error(`Public URL fetch returned status ${webRes.status}`);
          }
        }

        if (!fileBuffer) {
          throw new Error("Could not acquire file data from either S3 storage or public download URL.");
        }

        // Upload to target S3 client
        console.log(`[Migrator] Uploading to target S3 bucket '${bucketName}' key '${storagePath}'...`);
        await targetS3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: storagePath,
          Body: fileBuffer,
          ContentType: contentType,
        }));

        processed.push({
          storagePath,
          fileName,
          size: fileBuffer.length,
          status: "migrated"
        });
      } catch (err: any) {
        console.error(`[Migrator] Failed to transfer '${fileName}' (${storagePath}):`, err);
        failed.push({
          storagePath,
          fileName,
          error: err.message || String(err)
        });
      }
    }

    res.json({
      success: true,
      summary: `Transferred ${processed.length} of ${files.length} files successfully.`,
      processed,
      failed
    });

  } catch (error: any) {
    console.error("Migration error: ", error);
    res.status(500).json({ error: "Failed to process transfer request.", details: error.message });
  }
});

// BOOTSTRAP VITE OR STATIC SERVING MIDDLEWARE

async function start() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode with Hot Reload Proxying via Vite Express middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite Development server initialized with Express.");
  } else {
    // Production Build Static Resource Assets serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static assets initialized.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server successfully active on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to bootstrap custom server: ", err);
});