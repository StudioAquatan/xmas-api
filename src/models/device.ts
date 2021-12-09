import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class DeviceModel extends BaseEntity {
  @PrimaryColumn('varchar', { length: 64 })
  deviceId = '';

  @Column('int', { nullable: true })
  ruleId: number | null = null;
}
