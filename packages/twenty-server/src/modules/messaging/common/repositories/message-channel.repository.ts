import { Injectable } from '@nestjs/common';

import { EntityManager } from 'typeorm';

import { WorkspaceDataSourceService } from 'src/engine/workspace-datasource/workspace-datasource.service';
import {
  MessageChannelSyncStage,
  MessageChannelSyncStatus,
  MessageChannelWorkspaceEntity,
} from 'src/modules/messaging/common/standard-objects/message-channel.workspace-entity';

@Injectable()
export class MessageChannelRepository {
  constructor(
    private readonly workspaceDataSourceService: WorkspaceDataSourceService,
  ) {}

  public async getAll(
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<MessageChannelWorkspaceEntity[]> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    return await this.workspaceDataSourceService.executeRawQuery(
      `SELECT * FROM ${dataSourceSchema}."messageChannel"`,
      [],
      workspaceId,
      transactionManager,
    );
  }

  public async getByIds(
    ids: string[],
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<MessageChannelWorkspaceEntity[]> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    return await this.workspaceDataSourceService.executeRawQuery(
      `SELECT * FROM ${dataSourceSchema}."messageChannel" WHERE "id" = ANY($1)`,
      [ids],
      workspaceId,
      transactionManager,
    );
  }

  public async getById(
    id: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<MessageChannelWorkspaceEntity> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    const messageChannels =
      await this.workspaceDataSourceService.executeRawQuery(
        `SELECT * FROM ${dataSourceSchema}."messageChannel" WHERE "id" = $1`,
        [id],
        workspaceId,
        transactionManager,
      );

    return messageChannels[0];
  }

  public async getIdsByWorkspaceMemberId(
    workspaceMemberId: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<MessageChannelWorkspaceEntity[]> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    const messageChannelIds =
      await this.workspaceDataSourceService.executeRawQuery(
        `SELECT "messageChannel".id FROM ${dataSourceSchema}."messageChannel" "messageChannel"
        JOIN ${dataSourceSchema}."connectedAccount" ON "messageChannel"."connectedAccountId" = ${dataSourceSchema}."connectedAccount"."id"
        WHERE ${dataSourceSchema}."connectedAccount"."accountOwnerId" = $1`,
        [workspaceMemberId],
        workspaceId,
        transactionManager,
      );

    return messageChannelIds;
  }

  public async updateSyncStatus(
    id: string,
    syncStatus: MessageChannelSyncStatus,
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<void> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    const needsToUpdateSyncedAt =
      syncStatus === MessageChannelSyncStatus.ACTIVE;

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "syncStatus" = $1 ${
        needsToUpdateSyncedAt ? `, "syncedAt" = NOW()` : ''
      } WHERE "id" = $2`,
      [syncStatus, id],
      workspaceId,
      transactionManager,
    );
  }

  public async updateSyncStage(
    id: string,
    syncStage: MessageChannelSyncStage,
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<void> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    const needsToUpdateSyncStageStartedAt =
      syncStage === MessageChannelSyncStage.MESSAGES_IMPORT_ONGOING ||
      syncStage === MessageChannelSyncStage.MESSAGE_LIST_FETCH_ONGOING;

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "syncStage" = $1 ${
        needsToUpdateSyncStageStartedAt ? `, "syncStageStartedAt" = NOW()` : ''
      } WHERE "id" = $2`,
      [syncStage, id],
      workspaceId,
      transactionManager,
    );
  }

  public async resetSyncStageStartedAt(
    id: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ): Promise<void> {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "syncStageStartedAt" = NULL WHERE "id" = $1`,
      [id],
      workspaceId,
      transactionManager,
    );
  }

  public async updateLastSyncCursorIfHigher(
    id: string,
    syncCursor: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ) {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "syncCursor" = $1
      WHERE "id" = $2
      AND ("syncCursor" < $1 OR "syncCursor" = '')`,
      [syncCursor, id],
      workspaceId,
      transactionManager,
    );
  }

  public async resetSyncCursor(
    id: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ) {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "syncCursor" = ''
      WHERE "id" = $1`,
      [id],
      workspaceId,
      transactionManager,
    );
  }

  public async incrementThrottleFailureCount(
    id: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ) {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "throttleFailureCount" = "throttleFailureCount" + 1
      WHERE "id" = $1`,
      [id],
      workspaceId,
      transactionManager,
    );
  }

  public async resetThrottleFailureCount(
    id: string,
    workspaceId: string,
    transactionManager?: EntityManager,
  ) {
    const dataSourceSchema =
      this.workspaceDataSourceService.getSchemaName(workspaceId);

    await this.workspaceDataSourceService.executeRawQuery(
      `UPDATE ${dataSourceSchema}."messageChannel" SET "throttleFailureCount" = 0
      WHERE "id" = $1`,
      [id],
      workspaceId,
      transactionManager,
    );
  }
}
