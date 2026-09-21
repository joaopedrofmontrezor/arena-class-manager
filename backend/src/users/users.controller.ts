import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@UseGuards(AuthGuard("jwt"))
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query("role") role?: Role) {
    return this.usersService.findAll(role);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
