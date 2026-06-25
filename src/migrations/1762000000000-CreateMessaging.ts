import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessaging1762000000000 implements MigrationInterface {
  name = 'CreateMessaging1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('users'))) {
      return;
    }

    await queryRunner.query(`
      CREATE TYPE "public"."messages_type_enum" AS ENUM('DIRECT', 'BROADCAST')
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "senderId" uuid NOT NULL,
        "recipientId" uuid,
        "body" text NOT NULL,
        "attachmentKeys" text,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "type" "public"."messages_type_enum" NOT NULL DEFAULT 'DIRECT',
        "broadcastId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_messages_sender_recipient_created" ON "messages" ("senderId", "recipientId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_messages_recipient_read" ON "messages" ("recipientId", "isRead")
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."broadcasts_targetaudience_enum" AS ENUM('ALL', 'KYC_APPROVED', 'UNVERIFIED', 'SPECIFIC_USERS')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."broadcasts_status_enum" AS ENUM('DRAFT', 'SENT')
    `);

    await queryRunner.query(`
      CREATE TABLE "broadcasts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "adminId" uuid NOT NULL,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "targetAudience" "public"."broadcasts_targetaudience_enum" NOT NULL,
        "targetUserIds" uuid[],
        "status" "public"."broadcasts_status_enum" NOT NULL DEFAULT 'DRAFT',
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "recipientCount" int NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcasts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_broadcasts_admin" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_broadcasts_admin_created" ON "broadcasts" ("adminId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('messages')) {
      await queryRunner.query('DROP TABLE "messages"');
      await queryRunner.query('DROP TYPE "public"."messages_type_enum"');
    }

    if (await queryRunner.hasTable('broadcasts')) {
      await queryRunner.query('DROP TABLE "broadcasts"');
      await queryRunner.query('DROP TYPE "public"."broadcasts_targetaudience_enum"');
      await queryRunner.query('DROP TYPE "public"."broadcasts_status_enum"');
    }
  }
}
