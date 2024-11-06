import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationEmail1730899918688 implements MigrationInterface {
    name = 'AddOrganizationEmail1730899918688'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" ADD "email" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN "email"`);
    }

}
