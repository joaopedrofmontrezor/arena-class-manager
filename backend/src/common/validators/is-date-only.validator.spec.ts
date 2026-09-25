import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { IsDateOnly } from "./is-date-only.validator";
import { describe, it, expect } from "@jest/globals";

class Dummy {
  @IsDateOnly()
  date!: string;
}

async function isValid(date: unknown): Promise<boolean> {
  const instance = plainToInstance(Dummy, { date });
  const errors = await validate(instance);
  return errors.length === 0;
}

describe("IsDateOnly", () => {
  it.each(["2026-01-01", "2026-09-15", "2026-09-16", "2026-12-31", "2028-02-29"])(
    "aceita %s (data de calendário real)",
    async (date) => {
      expect(await isValid(date)).toBe(true);
    },
  );

  it.each([
    "2026-02-30", 
    "2027-02-29", 
    "2026-13-01", 
    "2026-00-10", 
    "2026-09-31", 
    "10/09/2026", 
    "2026-9-5",
    "abc",
    "",
  ])("rejeita %s", async (date) => {
    expect(await isValid(date)).toBe(false);
  });

  it("rejeita valores que não são string", async () => {
    expect(await isValid(20260910)).toBe(false);
    expect(await isValid(null)).toBe(false);
    expect(await isValid(new Date())).toBe(false);
  });
});
