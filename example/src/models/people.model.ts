import { model, Schema } from '@stantanasi/jsonapi-client';
import Article from './article.model';
import Comment from './comment.model';

export interface IPeople {
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

    createdAt: {
      type: Date,
    },

    updatedAt: {
      type: Date,
    },
  },

  relationships: {
    articles: {},

    comments: {},
  },
});


class People extends model(PeopleSchema) { }

People.register('people');

export default People
