import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function IsDateOnly(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "isDateOnly",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidCalendarDate(value);
        },

        defaultMessage(_args: ValidationArguments): string {
          return `${propertyName.toString()} deve estar no formato YYYY-MM-DD e representar uma data válida.`;
        },
      },
    });
  };
}
