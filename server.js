const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { get } = require('https');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();

// Create the Mongoose schema
const userSchema = new mongoose.Schema({
    username: String,
    roomname: String
});

const User = mongoose.model('User', userSchema);


const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(bodyParser.urlencoded({ extended: true }));

//set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatVerse Bot';

// mongoose.connect("Database URL", { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => {
//         console.log('Connected to MongoDB successfully!');
//     })
//     .catch((error) => {
//         console.error('Error connecting to MongoDB:', error);
//     });


//Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to ChatVerse!'));

        // Brodcast when a user connects
        socket.broadcast
            .to(user.room)
            .emit('message', formatMessage(botName, `${user.username} has joined the chat`));

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });

        const newUser = new User({
            username: user.username,
            roomname: user.room
        });

        newUser.save()
            .then(savedUser => {
                console.log('User saved successfully:', savedUser);
            })
            .catch(error => {
                console.error('Error saving user:', error);
            });

    });


    // Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`));

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room) // Updated line
            });

        }
    });

});

// Handle the POST request to update data in the database
app.post('/users', function (req, res) {
    const username = req.body.username;
    const roomname = req.body.roomname;

    // Create a new user document
    const newUser = new User({
        username,
        roomname
    });

    newUser.save()
        .then(savedUser => {
            console.log('User saved successfully:', savedUser);
            res.status(200).send('User saved successfully');
        })
        .catch(error => {
            console.error('Error saving user:', error);
            res.status(500).send('Internal Server Error');
        });
});



// Run the server
const PORT = 3300 || process.enc.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));