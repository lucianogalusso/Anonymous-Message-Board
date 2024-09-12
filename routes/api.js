'use strict';

const mongoose = require('mongoose');
const moment = require('moment');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

const boardSchema = new Schema({
  name: { type: String, required: true }
});

const BOARD = mongoose.model("Board", boardSchema);

const threadSchema = new Schema({
  text: { type: String, required: true },
  created_on: { type: String, required: true },
  bumped_on: { type: String, required: true },
  board_id: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  reported: Boolean,
  delete_password: String,
  replies: [{ type: Schema.Types.ObjectId, ref: 'Thread' }]
});

const THREAD = mongoose.model("Thread", threadSchema);

module.exports = function (app) {
  
  /*
    POST request to /api/threads/{board} with form data including text and delete_password. The saved database record will have at least the fields _id, text, created_on(date & time), bumped_on(date & time, starts same as created_on), reported (boolean), delete_password, & replies (array).
    GET request to /api/threads/{board}. Returned will be an array of the most recent 10 bumped threads on the board with only the most recent 3 replies for each. The reported and delete_password fields will not be sent to the client.
    PUT request to /api/threads/{board} and pass along the thread_id. Returned will be the string reported. The reported value of the thread_id will be changed to true.
    DELETE request to /api/threads/{board} and pass along the thread_id & delete_password to delete the thread. Returned will be the string incorrect password or success.

    POST request to /api/replies/{board} with form data including text, delete_password, & thread_id. This will update the bumped_on date to the comment's date. In the thread's replies array, an object will be saved with at least the properties _id, text, created_on, delete_password, & reported.
    GET request to /api/replies/{board}?thread_id={thread_id}. Returned will be the entire thread with all its replies, also excluding the same fields from the client as the previous test.
    DELETE request to /api/replies/{board} and pass along the thread_id, reply_id, & delete_password. Returned will be the string incorrect password or success. On success, the text of the reply_id will be changed to [deleted].
    PUT request to /api/replies/{board} and pass along the thread_id & reply_id. Returned will be the string reported. The reported value of the reply_id will be changed to true.
  */

  const createThread = (text, board_id, delete_password) => {

    let now = moment();
    let formattedDate = now.format('YYYY-MM-DD HH:mm:ss');

    let thread = new THREAD({
      text: text,
      created_on: formattedDate,
      bumped_on: formattedDate,
      board_id: board_id,
      reported: false,
      delete_password: delete_password,
      replies: []
    });

    // Devolvemos la promesa
    return thread.save();
  };
  
  app.route('/api/threads/:board')
    .all(function (req, res, next) {
      const boardName = req.params.board;
      BOARD.findOne({ name: boardName})
        .then((boardFound) => {
          if (req.method != 'POST' && !boardFound)
            return res.json({error: "no board found"});
          req.board = boardFound;
          next();
        })
        .catch((err) => {
          return res.json(err);
        });
    })
    .post(function (req, res) {

      const board = req.board;
      const text = req.body.text || "";
      const delete_password = req.body.delete_password || "";
      let threadPromise = null;

      if (board === null) {
        let paramBoard = req.params.board;
        let newBoard = new BOARD({ name: paramBoard});
        threadPromise = newBoard.save()
          .then((savedBoard) => {
            return createThread(text, savedBoard._id, delete_password);
          });
      } else {
        threadPromise = createThread(text, board._id, delete_password);
      }

      threadPromise
        .then((savedThread) => {
          res.json(savedThread);
        })
        .catch((err) => {
          res.status.json(err);
        });
    })
    .get(function (req, res) {
      
      THREAD.find().sort({created_on:-1}).limit(10).select({reported:0, delete_password:0}).populate('replies')
        .then((threads) => {
          if (!threads) 
            return res.json([]);
          threads.forEach(thread => {
            //ver campo reported y delete_password
            thread.replies.sort((a, b) => new Date(b.created_on) - new Date(a.created_on));
            thread.replies.slice(0, 3);
          });
          return res.json(threads);
        })
        .catch((err) => {
          return res.json(err);
        });

    })
    .put(function (req, res) {
      const stocks = [].concat(req.query.stock);
      let like = req.query.like;
      const ip = req.ip;

      if (like === undefined || like === 'false')
        like = false;

      if (stocks.length > 2)
        return res.json({ error: 'More than 2 stocks not allowed' });

    })
    .delete(function (req, res) {
      const stocks = [].concat(req.query.stock);
      let like = req.query.like;
      const ip = req.ip;

      if (like === undefined || like === 'false')
        like = false;

      if (stocks.length > 2)
        return res.json({ error: 'More than 2 stocks not allowed' });

    });

    
  app.route('/api/replies/:board')
    .all(function (req, res, next) {
      const boardName = req.params.board;
      BOARD.findOne({ name: boardName})
        .then((boardFound) => {
          if (!boardFound)
            return res.json({error: "no board found"});
          req.board = boardFound;
          next();
        })
        .catch((err) => {
          return res.json(err);
        });
    })
    .post(function (req, res) {
      const board = req.board;
      const text = req.body.text || "";
      const delete_password = req.body.delete_password || "";
      const thread_id = req.body.thread_id || "";

      let now = moment();
      let formattedDate = now.format('YYYY-MM-DD HH:mm:ss');

      THREAD.findById(thread_id)
        .then((originalThread) => {
          if (!originalThread)
            return res.json({error: "invalid id"});

          console.log("originalThread: ", originalThread);
          createThread(text, board._id, delete_password)
            .then((savedThread) => {

              console.log("savedThread: ", savedThread);

              originalThread.bumped_on = formattedDate;
              originalThread.replies.push(savedThread._id);

              console.log("originalThread: ", originalThread);

              originalThread.save()
                .then((originalThread) => {

                  console.log("originalThread: ", originalThread);

                  THREAD.findById(originalThread._id).populate('replies')
                    .then((originalThread) => {
                      console.log("originalThread: ", originalThread);
                      return res.json(originalThread);
                    })
                    .catch((err) => {
                      return res.json(err);
                    });
                })
                .catch((err) => {
                  return res.json(err);
                });
            })
            .catch((err) => {
              return res.json(err);
            });
        })
        .catch((err) => {
          return res.json(err);
        });
    })
    .get(function (req, res) {
      const thread_id = req.query.thread_id;
      let finalThreadId = "";

      if (finalThreadId !== undefined)
        finalThreadId = thread_id;
      
      THREAD.findOneById(finalThreadId).select({reported:0, delete_password:0}).populate('replies')
        .then((thread) => {
          if (!thread) 
            return res.json([]);
          return res.json(thread);
        })
        .catch((err) => {
          return res.json(err);
        });

    })
    .put(function (req, res) {
      const stocks = [].concat(req.query.stock);
      let like = req.query.like;
      const ip = req.ip;

      if (like === undefined || like === 'false')
        like = false;

      if (stocks.length > 2)
        return res.json({ error: 'More than 2 stocks not allowed' });

    })
    .delete(function (req, res) {
      const stocks = [].concat(req.query.stock);
      let like = req.query.like;
      const ip = req.ip;

      if (like === undefined || like === 'false')
        like = false;

      if (stocks.length > 2)
        return res.json({ error: 'More than 2 stocks not allowed' });

    });

};
