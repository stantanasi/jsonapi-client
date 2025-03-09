import { model, Schema } from '@stantanasi/jsonapi-client';
import Comment from './comment.model';
import People from './people.model';

export interface IArticle {
  id: string;

  title: string;
  createdAt: Date;
  updatedAt: Date;

  author: People;
  comments: Comment[];
}

export const ArticleSchema = new Schema<IArticle>({
  attributes: {
    title: {},

    createdAt: {},

    updatedAt: {},
  },

  relationships: {
    author: {},

    comments: {},
  },
});


export default class Article extends model('articles', ArticleSchema) { }
