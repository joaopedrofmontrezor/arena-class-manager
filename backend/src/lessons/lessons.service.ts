import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LessonType, Role } from "@prisma/client";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { VALOR_TURMA_PROFESSOR, VALOR_AUXILIAR } from "./lessons.constants";

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  private resolveProfessorValue(
    type: LessonType,
    professorValue?: number,
  ): number {
    if (type === LessonType.TURMA) {
      return VALOR_TURMA_PROFESSOR;
    }

    if (
      professorValue === undefined ||
      professorValue === null ||
      Number.isNaN(professorValue)
    ) {
      throw new BadRequestException(
        "Aulas do tipo PERSONAL exigem um valor válido.",
      );
    }
    if (professorValue <= 0) {
      throw new BadRequestException("O valor da aula deve ser maior que zero.");
    }
    return professorValue;
  }

  private async assertValidAssistant(assistantId: string, professorId: string) {
    if (assistantId === professorId) {
      throw new BadRequestException(
        "O professor da aula não pode ser o próprio auxiliar.",
      );
    }

    const assistant = await this.prisma.user.findUnique({
      where: { id: assistantId },
    });
    if (!assistant || !assistant.active || assistant.role !== Role.PROFESSOR) {
      throw new BadRequestException("Auxiliar inválido ou inativo.");
    }
  }

  async create(professorId: string, dto: CreateLessonDto) {
    await this.assertValidAssistant(dto.assistantId, professorId);
    const professorValue = this.resolveProfessorValue(
      dto.type,
      dto.professorValue,
    );

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
    if (!lesson) throw new NotFoundException("Aula não encontrada");
    return lesson;
  }

  private assertOwnerOrSelf(
    lessonProfessorId: string,
    userId: string,
    role: string,
  ) {
    if (lessonProfessorId !== userId && role !== "OWNER") {
      throw new ForbiddenException(
        "Você não tem permissão para alterar esta aula",
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

    const finalType = dto.type ?? lesson.type;
    const typeChanged = dto.type !== undefined && dto.type !== lesson.type;

    let finalProfessorValueInput: number | undefined;
    if (dto.professorValue !== undefined) {
      finalProfessorValueInput = dto.professorValue;
    } else if (!typeChanged) {
      finalProfessorValueInput = Number(lesson.professorValue);
    } else {
      finalProfessorValueInput = undefined;
    }

    const professorValue = this.resolveProfessorValue(
      finalType,
      finalProfessorValueInput,
    );

    const finalAssistantId = dto.assistantId ?? lesson.assistantId;
    await this.assertValidAssistant(finalAssistantId, lesson.professorId);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        type: finalType,
        assistantId: finalAssistantId,
        professorValue,
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
