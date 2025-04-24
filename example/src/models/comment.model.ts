import { model, Schema } from '@stantanasi/jsonapi-client';
import Article from './article.model';
import People from './people.model';

export interface IComment {
  body: string;
  createdAt: Date;
  updatedAt: Date;

  article: Article;
  author: People;
}

export const CommentSchema = new Schema<IComment>({
  attributes: {
    body: {},

    createdAt: {
      type: Date,
    },

    updatedAt: {
      type: Date,
    },
  },

  relationships: {
    article: {
      type: 'articles',
    },

    author: {
      type: 'people',
    },
  },
});


class Comment extends model(CommentSchema) { }

Comment.register('comments');

export default Comment
