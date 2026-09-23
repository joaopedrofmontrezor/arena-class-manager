import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Role } from "@prisma/client";

export interface CurrentUserData {
  userId: string;
  role: Role;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserData }>();
    return request.user;
  },
);
