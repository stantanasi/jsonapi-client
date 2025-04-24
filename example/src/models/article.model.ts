import { model, Schema } from '@stantanasi/jsonapi-client';
import Comment from './comment.model';
import People from './people.model';

export interface IArticle {
  title: string;
  createdAt: Date;
  updatedAt: Date;

  author: People;
  comments: Comment[];
}

export const ArticleSchema = new Schema<IArticle>({
  attributes: {
    title: {},

    createdAt: {
      type: Date,
    },

    updatedAt: {
      type: Date,
    },
  },

  relationships: {
    author: {
      type: 'people',
    },

    comments: {
      type: 'comments',
    },
  },
});


class Article extends model(ArticleSchema) { }

Article.register('articles');

export default Article
