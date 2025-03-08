import { model, Schema } from '@stantanasi/jsonapi-client';

export interface IComment {
  id: string;

  body: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = new Schema<IComment>({
  body: {},
});


class Comment extends model<IComment>('comments', CommentSchema) { }
export default Comment
