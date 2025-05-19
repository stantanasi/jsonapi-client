import { connect } from "@stantanasi/jsonapi-client";
import { Article, Comment, People } from "./models";

connect({
  baseURL: 'https://example.com',
});


// GET /articles HTTP/1.1
Article.find()
  .then((articles) => console.log(articles));

// GET /articles/1 HTTP/1.1
Article.findById('1')
  .then((article) => console.log(article));

// GET /articles/1/author HTTP/1.1
Article.findById('1').get('author')
  .then((author) => console.log(author));

// GET /articles/1/comments HTTP/1.1
Article.findById('1').get('comments')
  .then((comments) => console.log(comments));


// GET /comments HTTP/1.1
Comment.find()
  .then((comments) => console.log(comments));

// GET /comments/5 HTTP/1.1
Comment.findById('5')
  .then((comment) => console.log(comment));

// GET /comments/5/article HTTP/1.1
Comment.findById('5').get('article')
  .then((article) => console.log(article));

// GET /comments/5/author HTTP/1.1
Comment.findById('5').get('author')
  .then((author) => console.log(author));


// GET /people HTTP/1.1
People.find()
  .then((peoples) => console.log(peoples));

// GET /people/9 HTTP/1.1
People.findById('9')
  .then((people) => console.log(people));

// GET /people/9/articles HTTP/1.1
People.findById('9').get('articles')
  .then((articles) => console.log(articles));

// GET /people/9/comments HTTP/1.1
People.findById('9').get('comments')
  .then((comments) => console.log(comments));
