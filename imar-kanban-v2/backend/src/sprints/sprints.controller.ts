import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SprintsService } from "./sprints.service";

@ApiTags("Sprints")
@ApiBearerAuth()
@Controller()
export class SprintsController {
  constructor(private sprintsService: SprintsService) {}

  @Get("projects/:projectId/sprints")
  findByProject(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.sprintsService.findByProject(projectId);
  }

  @Get("sprints/:id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.sprintsService.findOne(id);
  }

  @Post("projects/:projectId/sprints")
  create(@Param("projectId", ParseUUIDPipe) projectId: string, @Body() dto: any) {
    return this.sprintsService.create(projectId, dto);
  }

  @Patch("sprints/:id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.sprintsService.update(id, dto);
  }

  @Post("sprints/:id/start")
  start(@Param("id", ParseUUIDPipe) id: string) {
    return this.sprintsService.start(id);
  }

  @Post("sprints/:id/complete")
  complete(@Param("id", ParseUUIDPipe) id: string) {
    return this.sprintsService.complete(id);
  }

  @Delete("sprints/:id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.sprintsService.remove(id);
  }
}
