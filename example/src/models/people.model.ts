import { model, Schema } from '@stantanasi/jsonapi-client';
import Article from './article.model';
import Comment from './comment.model';

export interface IPeople {
  id: string;

  'first-name': string;
  'last-name': string;
  twitter: string | null;
  createdAt: Date;
  updatedAt: Date;

  articles: Article[];
  comments: Comment[];
}

export const PeopleSchema = new Schema<IPeople>({
  attributes: {
    'first-name': {},

    'last-name': {},

    twitter: {},

    createdAt: {},

    updatedAt: {},
  },

  relationships: {
    articles: {},

    comments: {},
  },
});


class People extends model<IPeople>('people', PeopleSchema) { }
export default People
