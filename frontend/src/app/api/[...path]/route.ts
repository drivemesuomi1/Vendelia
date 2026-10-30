import { handleApiRequest } from "@/lib/backend-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleApiRequest;
export const HEAD = handleApiRequest;
export const POST = handleApiRequest;
export const PUT = handleApiRequest;
export const PATCH = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
