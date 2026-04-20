import { beforeEach, describe, expect, it, vi } from "vitest";

const createJQuantsClientMock = vi.fn();
const getListedInfoMock = vi.fn();

vi.mock("@/lib/providers/jquants", () => ({
  createJQuantsClient: (...args: unknown[]) => createJQuantsClientMock(...args),
}));

describe("/api/stocks/lookup route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getListedInfoMock.mockResolvedValue([
      { Code: "72030", CompanyName: "トヨタ自動車", Sector17Code: "6" },
    ]);
    createJQuantsClientMock.mockReturnValue({
      getListedInfo: getListedInfoMock,
    });
  });

  it("reuses the same J-Quants client across JP lookup requests", async () => {
    const { GET } = await import("@/app/api/stocks/lookup/route");

    await GET(new Request("http://localhost/api/stocks/lookup?code=7203&market=JP"));
    await GET(new Request("http://localhost/api/stocks/lookup?code=7203&market=JP"));

    expect(createJQuantsClientMock).toHaveBeenCalledTimes(1);
  });
});
