const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs'); // For file-based persistence (simple demo, not for production)

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory storage for demonstration purposes.
// In a real app, you'd use a database (MongoDB, PostgreSQL, etc.)
let users = []; // { id, username, profilePic, active: boolean, lastActive: Date }
let messages = []; // { type: 'group' | 'private', from: string, to: string | 'group', message: string, timestamp: Date, isImage: boolean, isFile: boolean, fileName: string }
let privateChatHistory = {}; // { 'user1-user2': [{...}] }
let groupChatHistory = []; // [{...}]
let typingUsers = {}; // { socketId: username }

// --- Persistence (Simplified File-based for Demo, DO NOT USE IN PRODUCTION) ---
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || [];
            messages = data.messages || [];
            privateChatHistory = data.privateChatHistory || {};
            groupChatHistory = data.groupChatHistory || [];
            console.log('Data loaded from data.json');
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        const data = { users, messages, privateChatHistory, groupChatHistory };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('Data saved to data.json');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Load data when server starts
loadData();

// --- Socket.io Handlers ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Initial user login/registration
    socket.on('user-login', ({ username, profilePic }) => {
        // Check for duplicate username (simplified, case-sensitive)
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            // Suggest alternatives (simplified)
            const suggestion = `${username}${Math.floor(Math.random() * 100)}`;
            socket.emit('login-failed', { message: 'Username taken', suggestion });
            return;
        }

        // Add new user
        const newUser = {
            id: socket.id,
            username,
            profilePic,
            active: true,
            lastActive: new Date(),
        };
        users.push(newUser);
        socket.username = username; // Store username on socket for easy access

        saveData(); // Save updated users

        socket.emit('login-success', newUser);
        io.emit('user-list-update', users.map(u => ({ username: u.username, profilePic: u.profilePic, active: u.active })));
        console.log(`User ${username} logged in.`);
    });

    // Update user status to active and broadcast
    socket.on('set-active', (username) => {
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
            users[userIndex].active = true;
            users[userIndex].lastActive = new Date();
            socket.username = username; // Ensure socket has username
            saveData();
            io.emit('user-list-update', users.map(u => ({ username: u.username, profilePic: u.profilePic, active: u.active })));
        }
    });

    // Handle group chat messages
    socket.on('group-message', (msg) => {
        const messageData = {
            from: socket.username,
            message: msg.message,
            timestamp: new Date().toLocaleTimeString(),
            isImage: msg.isImage || false,
            isFile: msg.isFile || false,
            fileName: msg.fileName || '',
            fileData: msg.fileData || ''
        };
        groupChatHistory.push(messageData);
        saveData();
        io.emit('group-message', messageData); // Broadcast to all connected clients
        console.log(`Group message from ${socket.username}: ${msg.message}`);
    });

    // Handle private chat messages
    socket.on('private-message', ({ to, message, isImage, isFile, fileName, fileData }) => {
        const fromUser = socket.username;
        const messageData = {
            from: fromUser,
            to: to,
            message: message,
            timestamp: new Date().toLocaleTimeString(),
            isImage: isImage || false,
            isFile: isFile || false,
            fileName: fileName || '',
            fileData: fileData || ''
        };

        // Store private message
        const chatKey1 = `${fromUser}-${to}`;
        const chatKey2 = `${to}-${fromUser}`;
        if (!privateChatHistory[chatKey1] && !privateChatHistory[chatKey2]) {
             privateChatHistory[chatKey1] = [];
        }
        const activeChatKey = privateChatHistory[chatKey1] ? chatKey1 : chatKey2;
        privateChatHistory[activeChatKey].push(messageData);
        saveData();

        // Emit message to sender and receiver
        const recipientSocket = users.find(u => u.username === to);
        if (recipientSocket) {
            io.to(recipientSocket.id).emit('private-message', messageData);
        }
        socket.emit('private-message', messageData); // Also send back to sender for display
        console.log(`Private message from ${fromUser} to ${to}: ${message}`);
    });

    // Typing indicator
    socket.on('typing', ({ target, isTyping }) => {
        if (isTyping) {
            typingUsers[socket.id] = socket.username;
        } else {
            delete typingUsers[socket.id];
        }
        // Broadcast typing status to relevant users (group or private)
        if (target === 'group') {
            socket.broadcast.emit('typing-status', { username: socket.username, isTyping, target });
        } else {
            // For private chat, target should be the other user's username
            const recipientSocket = users.find(u => u.username === target);
            if (recipientSocket) {
                io.to(recipientSocket.id).emit('typing-status', { username: socket.username, isTyping, target });
            }
        }
    });

    // Request chat history
    socket.on('request-chat-history', ({ type, targetUser }) => {
        if (type === 'group') {
            socket.emit('chat-history', { type: 'group', messages: groupChatHistory });
        } else if (type === 'private' && targetUser) {
            const chatKey1 = `${socket.username}-${targetUser}`;
            const chatKey2 = `${targetUser}-${socket.username}`;
            const history = privateChatHistory[chatKey1] || privateChatHistory[chatKey2] || [];
            socket.emit('chat-history', { type: 'private', messages: history });
        }
    });

    // Delete message (sender only hides it)
    socket.on('delete-message', ({ messageId }) => {
        // In a real application, you might mark a message as 'deletedForSender' in the DB.
        // For this demo, it's primarily a client-side action.
        console.log(`Message ${messageId} to be hidden for sender ${socket.username}`);
        // No server-side action needed for client-side hide.
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const userIndex = users.findIndex(u => u.id === socket.id);
        if (userIndex !== -1) {
            users[userIndex].active = false;
            users[userIndex].lastActive = new Date(); // Mark last active time
            saveData(); // Save updated user status
            delete typingUsers[socket.id]; // Remove from typing list
            io.emit('user-list-update', users.map(u => ({ username: u.username, profilePic: u.profilePic, active: u.active })));
            console.log(`User ${users[userIndex].username} disconnected.`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}/login.html in your browser`);
});

      
