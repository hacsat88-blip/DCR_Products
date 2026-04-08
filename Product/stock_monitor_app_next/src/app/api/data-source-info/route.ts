import { NextResponse } from "next/server";

import { buildDataSourceInfo } from "@/lib/dataSourceInfo";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(buildDataSourceInfo(), { status: 200 });
}
