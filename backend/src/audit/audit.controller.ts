import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuditService } from "./audit.service";
import { AuditQueryDto } from "./dto/audit-query.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

export const LIMITE_PADRAO_AUDITORIA = 30;

@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles("OWNER")
@Controller("audit")
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  listar(@Query() query: AuditQueryDto) {
    return this.audit.listar({
      periodStart: query.periodStart ? new Date(query.periodStart) : undefined,
      professorId: query.professorId,
      cursor: query.cursor,
      limite: query.limit ?? LIMITE_PADRAO_AUDITORIA,
    });
  }
}
