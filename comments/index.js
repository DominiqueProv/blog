/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

const app = express();
// local data
const commentsByPostId = {};

app.use(bodyParser.json());
app.use(cors());
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});
app.post('/posts/:id/comments', async (req, res) => {
  // create randon id for demo
  const commentId = randomBytes(4).toString('hex');
  // extract content
  const { content } = req.body;
  // comment equal the array of comment already there
  // or if empty return a empty array (prevent error)
  const comments = commentsByPostId[req.params.id] || [];
  // insert comment in the array with Id and the string
  comments.push({ id: commentId, content, status: 'pending' });
  // update the object with the new array
  commentsByPostId[req.params.id] = comments;

  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });
  // sent back the object
  res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);
  const { type, data } = req.body;
  if (type === 'CommentModerated') {
    //update status of comment with matching postId
    const { postId, id, status, content } = data;
    console.log(postId, id, status);
    const comments = commentsByPostId[postId];
    console.log(comments);
    const comment = comments.find((comment) => {
      return comment.id === id;
    });
    console.log(comment);
    comment.status = status;
    // after updating the status of the post, I send the data back to the Event bus/broker
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        content,
        status,
        postId,
      },
    });
  }
  res.send({});
});

app.listen(4001, () => {
  console.log('Listening on 4001');
});
