import { describe, expect, it } from "vitest";

import { correlationMatrix, pearson } from "../correlation";

describe("pearson", () => {
  it("returns 1 for perfectly positively correlated series", () => {
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 10);
  });

  it("returns -1 for perfectly negatively correlated series", () => {
    expect(pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });

  it("returns NaN for empty or length-mismatched input", () => {
    expect(Number.isNaN(pearson([], []))).toBe(true);
    expect(Number.isNaN(pearson([1, 2, 3], [1, 2]))).toBe(true);
  });

  it("returns NaN when one series has zero variance", () => {
    expect(Number.isNaN(pearson([1, 1, 1, 1], [1, 2, 3, 4]))).toBe(true);
  });
});

describe("correlationMatrix", () => {
  it("builds a symmetric matrix with 1 on the diagonal", () => {
    const { labels, matrix } = correlationMatrix({
      A: [1, 2, 3, 4, 5],
      B: [2, 4, 6, 8, 10],
      C: [5, 4, 3, 2, 1],
    });
    expect(labels).toEqual(["A", "B", "C"]);
    expect(matrix[0]![0]).toBe(1);
    expect(matrix[1]![1]).toBe(1);
    expect(matrix[2]![2]).toBe(1);
    expect(matrix[0]![1]).toBeCloseTo(1, 10);
    expect(matrix[0]![2]).toBeCloseTo(-1, 10);
    // symmetric
    expect(matrix[1]![0]).toBeCloseTo(matrix[0]![1]!, 10);
    expect(matrix[2]![0]).toBeCloseTo(matrix[0]![2]!, 10);
  });
});
