import { Module } from "@nestjs/common";
import { LessonsService } from "./lessons.service";
import { LessonsController } from "./lessons.controller";
import { ClosingModule } from "../closing/closing.module";

@Module({
  imports: [ClosingModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
