import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LessonType } from "@prisma/client";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { VALOR_TURMA_PROFESSOR, VALOR_AUXILIAR } from "./lessons.constants";

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async create(professorId: string, dto: CreateLessonDto) {
    const professorValue =
      dto.type === LessonType.TURMA
        ? VALOR_TURMA_PROFESSOR
        : dto.professorValue!;

    return this.prisma.lesson.create({
      data: {
        date: new Date(dto.date),
        time: dto.time,
        type: dto.type,
        professorId,
        assistantId: dto.assistantId,
        professorValue,
        assistantValue: VALOR_AUXILIAR,
        observation: dto.observation,
      },
    });
  }

  findMineByPeriod(professorId: string, start: Date, end: Date) {
    return this.prisma.lesson.findMany({
      where: { professorId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
      include: {
        assistant: { select: { id: true, name: true } },
      },
    });
  }

  async findOneOrThrow(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException("Aula nao encontrada");
    return lesson;
  }

  private assertOwnerOrSelf(
    lessonProfessorId: string,
    userId: string,
    role: string,
  ) {
    if (lessonProfessorId !== userId && role !== "OWNER") {
      throw new ForbiddenException(
        "Voce nao tem permissao para alterar esta aula",
      );
    }
  }

  async update(
    lessonId: string,
    userId: string,
    role: string,
    dto: UpdateLessonDto,
  ) {
    const lesson = await this.findOneOrThrow(lessonId);
    this.assertOwnerOrSelf(lesson.professorId, userId, role);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        type: dto.type,
        assistantId: dto.assistantId,
        professorValue: dto.professorValue,
        observation: dto.observation,
      },
    });
  }

  async remove(lessonId: string, userId: string, role: string) {
    const lesson = await this.findOneOrThrow(lessonId);
    this.assertOwnerOrSelf(lesson.professorId, userId, role);

    return this.prisma.lesson.delete({ where: { id: lessonId } });
  }
}
