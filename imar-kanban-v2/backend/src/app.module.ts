import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import configuration from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProjectsModule } from "./projects/projects.module";
import { BoardsModule } from "./boards/boards.module";
import { IssuesModule } from "./issues/issues.module";
import { CommentsModule } from "./comments/comments.module";
import { SprintsModule } from "./sprints/sprints.module";
import { LabelsModule } from "./labels/labels.module";
import { EpicsModule } from "./epics/epics.module";
import { IssueTypesModule } from "./issue-types/issue-types.module";
import { FormSubmissionsModule } from "./form-submissions/form-submissions.module";
import { PagesModule } from "./pages/pages.module";
import { UploadsModule } from "./uploads/uploads.module";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { ResponseTransformInterceptor } from "./common/interceptors/response-transform.interceptor";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    BoardsModule,
    IssuesModule,
    CommentsModule,
    SprintsModule,
    LabelsModule,
    EpicsModule,
    IssueTypesModule,
    FormSubmissionsModule,
    PagesModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
