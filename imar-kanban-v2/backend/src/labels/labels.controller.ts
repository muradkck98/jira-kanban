import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { LabelsService } from "./labels.service";

@ApiTags("Labels")
@ApiBearerAuth()
@Controller()
export class LabelsController {
  constructor(private labelsService: LabelsService) {}

  @Get("projects/:projectId/labels")
  findByProject(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.labelsService.findByProject(projectId);
  }

  @Post("projects/:projectId/labels")
  create(@Param("projectId", ParseUUIDPipe) projectId: string, @Body() dto: any) {
    return this.labelsService.create(projectId, dto);
  }

  @Patch("labels/:id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.labelsService.update(id, dto);
  }

  @Delete("labels/:id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.labelsService.remove(id);
  }
}
