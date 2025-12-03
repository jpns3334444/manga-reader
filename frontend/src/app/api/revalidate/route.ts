import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

interface RevalidateRequest {
  paths: string[];
}

export async function POST(request: NextRequest) {
  // Verify secret token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!REVALIDATION_SECRET || token !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: RevalidateRequest = await request.json();

    if (!body.paths || !Array.isArray(body.paths)) {
      return NextResponse.json(
        { error: "Invalid request: paths array required" },
        { status: 400 }
      );
    }

    const revalidated: string[] = [];

    for (const path of body.paths) {
      if (typeof path === "string" && path.startsWith("/")) {
        revalidatePath(path);
        revalidated.push(path);
      }
    }

    return NextResponse.json({
      revalidated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate" },
      { status: 500 }
    );
  }
}
