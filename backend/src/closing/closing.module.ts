import { Module } from "@nestjs/common";
import { ClosingService } from "./closing.service";
import { ClosingPeriodsService } from "./closing-periods.service";
import { ClosingController } from "./closing.controller";

@Module({
  controllers: [ClosingController],
  providers: [ClosingService, ClosingPeriodsService],
  exports: [ClosingPeriodsService],
})
export class ClosingModule {}
