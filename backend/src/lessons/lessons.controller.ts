import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { LessonsService } from "./lessons.service";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { getPeriodoAtual } from "../closing/period.util";
import { PeriodoQueryDto } from "../common/dto/periodo-query.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("lessons")
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(user.userId, dto);
  }

  @Get()
  findMine(
    @CurrentUser() user: CurrentUserData,
    @Query() query: PeriodoQueryDto,
  ) {
    const periodo =
      query.start && query.end
        ? { start: new Date(query.start), end: new Date(query.end) }
        : getPeriodoAtual();
    return this.lessonsService.findMineByPeriod(
      user.userId,
      periodo.start,
      periodo.end,
    );
  }

  @Patch(":id")
  update(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, user.userId, user.role, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: CurrentUserData, @Param("id") id: string) {
    return this.lessonsService.remove(id, user.userId, user.role);
  }
}
