import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto, ResetPasswordDto } from "./dto/update-user.dto";
import { RoleQueryDto } from "./dto/role-query.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";

@UseGuards(AuthGuard("jwt"))
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAllProfessors();
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  findAllAdmin(@Query() query: RoleQueryDto) {
    return this.usersService.findAllAdmin(query.role);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  update(
    @CurrentUser() currentUser: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, currentUser.userId, dto);
  }

  @Patch(":id/password")
  @UseGuards(RolesGuard)
  @Roles("OWNER")
  resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }
}
