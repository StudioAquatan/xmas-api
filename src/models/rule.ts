import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RuleModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column('int')
  ruleSetId = 0;

  @Column('int')
  priority = 0;

  // @Column('enum', { enum: ['none', 'fav', 'retweet', 'reply', 'hashtag'] })
  @Column('text')
  trigger: 'always' | 'fav' | 'retweet' | 'reply' | 'hashtag' = 'always';

  @Column('simple-array')
  triggerTweets: string[] = [];

  @Column('simple-array')
  triggerHashtags: string[] = [];

  @Column('simple-array')
  collectTweets: string[] = [];

  @Column('simple-array')
  collectHashtags: string[] = [];

  @Column('varchar', { length: 1024 * 32 })
  conditionJson = '[]';

  @Column('int', { nullable: true })
  timeout: number | null = null;

  @Column('int')
  targetPattern = 0;
}
