import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  
  @Get()
  findAll(@Query('role') role?: Role, @Query('all') all?: string) {
    if (all === 'true') return this.usersService.findAll(role);
    return this.usersService.findAllProfessors();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  
  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto.newPassword);
  }
}
