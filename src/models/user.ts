import { TwitterApi } from 'twitter-api-v2';
import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
import { config } from '../config';

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

  @Column('boolean')
  webhookActivated = false;

  getClient() {
    return new TwitterApi({
      appKey: config.twitter.consumerKey,
      appSecret: config.twitter.consumerSecret,
      accessToken: this.accessToken,
      accessSecret: this.accessSecret,
    });
  }
}
