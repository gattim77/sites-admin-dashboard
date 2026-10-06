declare namespace Cloudflare {
  interface Env {
 GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
