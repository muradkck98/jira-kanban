import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CommentsService } from "./comments.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Comments")
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get("issues/:issueId/comments")
  findByIssue(@Param("issueId", ParseUUIDPipe) issueId: string) {
    return this.commentsService.findByIssue(issueId);
  }

  @Post("issues/:issueId/comments")
  create(
    @Param("issueId", ParseUUIDPipe) issueId: string,
    @Body("content") content: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.commentsService.create(issueId, content, userId);
  }

  @Patch("comments/:id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("content") content: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.commentsService.update(id, content, userId);
  }

  @Delete("comments/:id")
  remove(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") userId: string) {
    return this.commentsService.remove(id, userId);
  }
}
