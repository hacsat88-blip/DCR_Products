import { describe, it, expect } from "vitest";
import { createTestDb } from "./helper";
import {
  listPortfolio,
  upsertPortfolio,
  getPortfolioById,
  removePortfolio,
} from "../repositories/portfolioRepo";

describe("portfolioRepo", () => {
  it("inserts, lists, updates and removes", () => {
    const db = createTestDb() as never;
    const a = upsertPortfolio(db, {
      code: "7203",
      market: "JP",
      name: "Toyota",
      quantity: 100,
      avgCost: 2500,
      currency: "JPY",
    });
    expect(a.id).toBeTypeOf("number");

    const list = listPortfolio(db);
    expect(list).toHaveLength(1);

    const updated = upsertPortfolio(db, {
      id: a.id,
      code: "7203",
      market: "JP",
      name: "Toyota Motor",
      quantity: 200,
      avgCost: 2400,
      currency: "JPY",
    });
    expect(updated.name).toBe("Toyota Motor");
    expect(updated.quantity).toBe(200);

    const fetched = getPortfolioById(db, a.id);
    expect(fetched?.name).toBe("Toyota Motor");

    removePortfolio(db, a.id);
    expect(listPortfolio(db)).toHaveLength(0);
  });
});
