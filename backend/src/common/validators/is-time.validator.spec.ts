import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { IsTimeHHMM } from "./is-time.validator";
import { describe, it, expect } from "@jest/globals";

class Dummy {
  @IsTimeHHMM()
  time!: string;
}

async function isValid(time: unknown): Promise<boolean> {
  const instance = plainToInstance(Dummy, { time });
  const errors = await validate(instance);
  return errors.length === 0;
}

describe("IsTimeHHMM", () => {
  it.each(["00:00", "08:00", "09:30", "18:45", "23:59"])(
    "aceita %s",
    async (time) => {
      expect(await isValid(time)).toBe(true);
    },
  );

  it.each(["25:99", "abc", "8h", "18:60", "24:00", "8:00", "08:0", "", "08:00:00"])(
    "rejeita %s",
    async (time) => {
      expect(await isValid(time)).toBe(false);
    },
  );

  it("rejeita valores que não são string", async () => {
    expect(await isValid(800)).toBe(false);
    expect(await isValid(null)).toBe(false);
    expect(await isValid(undefined)).toBe(false);
  });
});
