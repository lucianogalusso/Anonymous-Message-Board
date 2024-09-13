const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

    /* 
    Creating a new thread: POST request to /api/threads/{board}
    Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}
    Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password
    Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password
    Reporting a thread: PUT request to /api/threads/{board}
    Creating a new reply: POST request to /api/replies/{board}
    Viewing a single thread with all replies: GET request to /api/replies/{board}
    Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password
    Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password
    
    Reporting a reply: PUT request to /api/replies/{board}
    */

    const board = "test";
    let text = "first thread";
    let delete_password = "a";
    let textReply = "first reply";
    let delete_passwordReply = "b";
    let thread_id, board_id, reply_id;

    test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
        
        chai.request(server)
        .post(`/api/threads/${board}`)
        .send({ text: text, delete_password: delete_password })
        .end(function(err, res){
            thread_id = res.body._id;
            board_id = res.body.board_id;
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, 'text');
            assert.equal(res.body.text, text);
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies);
            done();
        });
    });

    test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
        chai.request(server)
        .post(`/api/replies/${board}`)
        .send({ text: textReply, delete_password: delete_passwordReply, thread_id: thread_id })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, '_id');
            assert.equal(res.body._id, thread_id);
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            //assert.notEqual(res.body.bumped_on, bumped_on);
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies);
            reply_id = res.body.replies[res.body.replies.length-1]._id;
            let replyFound = false;
            res.body.replies.forEach(replyThread => {
                if (replyThread.text == textReply) 
                    replyFound = true;
                assert.isObject(replyThread);
                assert.property(replyThread, '_id');
                assert.property(replyThread, 'text');
                assert.notProperty(replyThread, 'delete_password');
                assert.notProperty(replyThread, 'reported');
                assert.property(replyThread, 'board_id');
                assert.equal(replyThread.board_id, null);
                assert.property(replyThread, 'created_on');
                assert.property(replyThread, 'bumped_on');
                assert.property(replyThread, 'replies');
                assert.isArray(replyThread.replies);
                assert.equal(replyThread.replies.length, 0);
            });
            assert.equal(replyFound, true);
            done();
        });
    });

    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
        chai.request(server)
        .get(`/api/threads/${board}`)
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isBelow(res.body.length, 11);
            assert.property(res.body[0], '_id');
            assert.property(res.body[0], 'text');
            assert.property(res.body[0], 'created_on');
            assert.property(res.body[0], 'bumped_on');
            assert.property(res.body[0], 'board_id');
            assert.property(res.body[0], 'replies');
            assert.isArray(res.body[0].replies);
            assert.isBelow(res.body[0].replies.length, 4);
            assert.notProperty(res.body[0], 'delete_password');
            assert.notProperty(res.body[0], 'reported');
            done();
        });
    });

    test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
        chai.request(server)
        .put(`/api/threads/${board}`)
        .send({ thread_id: thread_id})
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");
            done();
        });
    });

    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
        chai.request(server)
        .get(`/api/replies/${board}`)
        .query({ thread_id: thread_id })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, '_id');
            assert.equal(res.body._id, thread_id);
            assert.property(res.body, 'text');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            assert.property(res.body, 'board_id');
            assert.equal(res.body.board_id, board_id);
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies);

            res.body.replies.forEach(replyThread => {
                assert.isObject(replyThread);
                assert.property(replyThread, '_id');
                assert.property(replyThread, 'text');
                assert.notProperty(replyThread, 'delete_password');
                assert.notProperty(replyThread, 'reported');
                assert.property(replyThread, 'board_id');
                assert.equal(replyThread.board_id, null);
                assert.property(replyThread, 'created_on');
                assert.property(replyThread, 'bumped_on');
                assert.property(replyThread, 'replies');
                assert.isArray(replyThread.replies);
                assert.equal(replyThread.replies.length, 0);
            });

            done();
        });
    });

    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
        chai.request(server)
        .delete(`/api/replies/${board}`)
        .send({ thread_id: thread_id, delete_password: "bla", reply_id: reply_id })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");
            done();
        });
    });

    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
        chai.request(server)
        .delete(`/api/replies/${board}`)
        .send({ thread_id: thread_id, delete_password: delete_passwordReply, reply_id: reply_id })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
        });
    });

    test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
        chai.request(server)
        .put(`/api/replies/${board}`)
        .send({ thread_id: thread_id, reply_id: reply_id })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");
            done();
        });
    });

    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
        chai.request(server)
        .delete(`/api/threads/${board}`)
        .send({ thread_id: thread_id, delete_password: "bla" })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");
            done();
        });
    });

    test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
        chai.request(server)
        .delete(`/api/threads/${board}`)
        .send({ thread_id: thread_id, delete_password: delete_password })
        .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
        });
    });

});