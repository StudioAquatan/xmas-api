import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class UserModel extends BaseEntity {
  @PrimaryColumn('bigint')
  userId = '0';

  @Column('varchar', { length: 64 })
  accessToken = '';

  @Column('varchar', { length: 64 })
  accessSecret = '';

  @Column('varchar', { length: 64 })
  screenName = '';
}
