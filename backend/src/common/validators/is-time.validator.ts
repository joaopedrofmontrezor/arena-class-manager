import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

const HH_MM_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function IsTimeHHMM(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: "isTimeHHMM",
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && HH_MM_REGEX.test(value);
        },

        defaultMessage(_args: ValidationArguments): string {
          return `${propertyName.toString()} deve estar no formato HH:mm.`;
        },
      },
    });
  };
}
