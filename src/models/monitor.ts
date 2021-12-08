import {
  BaseEntity,
  Column,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class TweetMonitorModel extends BaseEntity {
  @PrimaryColumn('varchar', { length: 32 })
  tweetId = '0';

  @Column('int')
  favCount = 0;

  @Column('int')
  retweetCount = 0;

  @Column('int')
  replyCount = 0;
}

@Entity()
export class HashtagMonitorModel extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id = 0;

  @Column('varchar', { length: 256, unique: true })
  hashtag = '';

  @Column('int')
  count = 0;

  @Column('boolean')
  active = true;
}

@Entity()
export class HashtagTweet extends BaseEntity {
  @PrimaryColumn('varchar', { length: 32 })
  tweetId = '0';

  @Column('varchar', { length: 512 })
  text = '';

  @Column('varchar', { length: 32 })
  userId = '0';

  @Column('varchar', { length: 64 })
  screenName = '';

  @Column('date')
  tweetAt?: Date;

  @Column('int')
  ruleId = 0;
}

@Entity()
export class ReplyTweet extends BaseEntity {
  @PrimaryColumn('varchar', { length: 32 })
  tweetId = '0';

  @Column('varchar', { length: 512 })
  text = '';

  @Column('varchar', { length: 32 })
  userId = '0';

  @Column('varchar', { length: 64 })
  screenName = '';

  @Column('date')
  tweetAt?: Date;

  @Column('varchar', { length: 32 })
  replyToId = '0';
}
