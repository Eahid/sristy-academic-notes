interface Env {
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = context.env;

  const configured = !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

  return new Response(
    JSON.stringify({
      configured,
      bucketName: R2_BUCKET_NAME || "sristy-academic-notes",
      message: configured
        ? "R2 Cloudflare credentials initialized successfully via Pages Functions."
        : "Missing required Cloudflare R2 credentials (R2_ENDPOINT, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY) in Cloudflare Pages environment variables.",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
