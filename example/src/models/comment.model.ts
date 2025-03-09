import { model, Schema } from '@stantanasi/jsonapi-client';
import Article from './article.model';
import People from './people.model';

export interface IComment {
  id: string;

  body: string;
  createdAt: Date;
  updatedAt: Date;

  article: Article;
  author: People;
}

export const CommentSchema = new Schema<IComment>({
  attributes: {
    body: {},

    createdAt: {},

    updatedAt: {},
  },

  relationships: {
    article: {},

    author: {},
  },
});


export default class Comment extends model<IComment>('comments', CommentSchema) { }
