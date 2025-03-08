import { model, Schema } from '@stantanasi/jsonapi-client';
import Article from './article.model';
import Comment from './comment.model';

export interface IPeople {
  id: string;

  'first-name': string;
  'last-name': string;
  twitter: string | null;

  articles: Article[];
  comments: Comment[];

  createdAt: Date;
  updatedAt: Date;
}

export const PeopleSchema = new Schema<IPeople>({
  'first-name': {},

  'last-name': {},

  twitter: {},


  articles: {},

  comments: {},
});


class People extends model<IPeople>('people', PeopleSchema) { }
export default People
