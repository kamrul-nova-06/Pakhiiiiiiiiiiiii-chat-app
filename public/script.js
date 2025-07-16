document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // --- DOM Elements ---
    const activeUsersScroll = document.getElementById('activeUsersScroll');
    const recentChatsList = document.getElementById('recentChatsList');
    const chatArea = document.getElementById('chatArea');
    const currentChatPhoto = document.getElementById('currentChatPhoto');
    const currentChatName = document.getElementById('currentChatName');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const backToChatsBtn = document.getElementById('backToChats');
    const groupCreateIcon = document.getElementById('groupCreateIcon');
    const groupCreationModal = document.getElementById('groupCreationModal');
    const groupModalCloseBtn = groupCreationModal.querySelector('.close-button');
    const groupNameInput = document.getElementById('groupName');
    const groupPasswordInput = document.getElementById('groupPassword');
    const groupMemberSelection = document.getElementById('groupMemberSelection');
    const createGroupBtn = document.getElementById('createGroupBtn');
    const groupModalMessage = document.getElementById('groupModalMessage');
    const imageInput = document.getElementById('imageInput');
    const fileInput = document.getElementById('fileInput');

    // --- Global State ---
    let currentUser = {}; // { username, profilePic }
    let activeChat = { type: 'group', name: 'Group Chat', photo: 'chat-icon.png' }; // current selected chat
    let privateChatHistory = JSON.parse(localStorage.getItem('privateChatHistory')) || {};
    let groupChatHistory = JSON.parse(localStorage.getItem('groupChatHistory')) || [];
    let allUsers = []; // Stores all known users for group creation, etc.

    // --- Utility Functions ---
    function getUrlParams() {
        const params = {};
        window.location.search.substring(1).split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[key] = decodeURIComponent(value);
        });
        return params;
    }

    function saveChatHistory() {
        localStorage.setItem('privateChatHistory', JSON.stringify(privateChatHistory));
        localStorage.setItem('groupChatHistory', JSON.stringify(groupChatHistory));
    }

    function generateMessageId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // --- UI Rendering Functions ---

    function renderActiveUsers(users) {
        activeUsersScroll.innerHTML = '';
        allUsers = users; // Update global user list

        // Add Group Chat icon as the first 'user' for quick access
        const groupChatIconDiv = document.createElement('div');
        groupChatIconDiv.className = 'user-avatar group-chat-icon';
        groupChatIconDiv.innerHTML = `<img src="chat-icon.png" alt="Group Chat Icon"> <span class="username">Group Chat</span>`;
        groupChatIconDiv.addEventListener('click', () => selectChat('group', 'Group Chat', 'chat-icon.png'));
        activeUsersScroll.appendChild(groupChatIconDiv);


        users.forEach(user => {
            if (user.username === currentUser.username) return; // Don't show self in active users list
            const userDiv = document.createElement('div');
            userDiv.className = `user-avatar ${user.active ? 'active' : ''}`;
            userDiv.dataset.username = user.username;
            userDiv.innerHTML = `
                <img src="${user.profilePic}" alt="${user.username}">
                <span class="username">${user.username}</span>
                <span class="active-dot"></span>
            `;
            userDiv.addEventListener('click', () => selectChat('private', user.username, user.profilePic));
            activeUsersScroll.appendChild(userDiv);
        });
    }

    function renderRecentChats() {
        recentChatsList.innerHTML = ''; // Clear existing
        // Re-add group chat item first
        const groupChatItem = document.createElement('div');
        groupChatItem.className = 'chat-item';
        if (activeChat.type === 'group') groupChatItem.classList.add('selected');
        groupChatItem.dataset.chatType = 'group';
        groupChatItem.dataset.chatName = 'Group Chat';
        groupChatItem.innerHTML = `
            <img src="chat-icon.png" alt="Group Icon">
            <div class="chat-info">
                <div class="name">Group Chat</div>
                <div class="last-message">${groupChatHistory.length > 0 ? (groupChatHistory[groupChatHistory.length - 1].message.length > 30 ? groupChatHistory[groupChatHistory.length - 1].message.substring(0, 30) + '...' : groupChatHistory[groupChatHistory.length - 1].message) : 'Start a group conversation!'}</div>
            </div>
        `;
        groupChatItem.addEventListener('click', () => selectChat('group', 'Group Chat', 'chat-icon.png'));
        recentChatsList.appendChild(groupChatItem);


        // Add private chats based on history
        const uniquePrivateChats = new Set();
        const chatKeys = Object.keys(privateChatHistory);

        chatKeys.forEach(key => {
            const participants = key.split('-');
            const otherUser = participants.find(p => p !== currentUser.username);
            if (otherUser && !uniquePrivateChats.has(otherUser)) {
                uniquePrivateChats.add(otherUser);
                const lastMessage = privateChatHistory[key][privateChatHistory[key].length - 1];
                const otherUserProfile = allUsers.find(u => u.username === otherUser);
                const otherUserPic = otherUserProfile ? otherUserProfile.profilePic : 'default1.png'; // Fallback
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                if (activeChat.type === 'private' && activeChat.name === otherUser) chatItem.classList.add('selected');
                chatItem.dataset.chatType = 'private';
                chatItem.dataset.chatName = otherUser;
                chatItem.innerHTML = `
                    <img src="${otherUserPic}" alt="${otherUser}">
                    <div class="chat-info">
                        <div class="name">${otherUser}</div>
                        <div class="last-message">${lastMessage ? (lastMessage.message.length > 30 ? lastMessage.message.substring(0, 30) + '...' : lastMessage.message) : 'No messages yet.'}</div>
                    </div>
                `;
                chatItem.addEventListener('click', () => selectChat('private', otherUser, otherUserPic));
                recentChatsList.appendChild(chatItem);
            }
        });
    }


    function displayMessage(msg, isSelf = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isSelf ? 'sent' : 'received');
        messageDiv.dataset.messageId = msg.id || generateMessageId(); // Assign an ID for deletion

        let content = '';
        if (!isSelf && activeChat.type === 'group') {
             content += `<div class="sender-name">${msg.from}</div>`;
        }
        if (msg.isImage) {
            content += `<img src="${msg.message}" alt="Image">`;
        } else if (msg.isFile) {
            content += `<a href="${msg.fileData}" download="${msg.fileName}">${msg.fileName}</a>`;
        } else {
            content += `<div class="message-text">${msg.message}</div>`;
        }
        content += `<span class="timestamp">${msg.timestamp}</span>`;

        if (isSelf) {
            // Add delete button for own messages (client-side hide)
            content += `<button class="delete-message-btn" data-message-id="${messageDiv.dataset.messageId}">&#x2715;</button>`; // 'X' icon
        }

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        bubble.innerHTML = content;
        messageDiv.appendChild(bubble);
        messagesContainer.prepend(messageDiv); // Prepend to show new messages at bottom (using flex-direction: column-reverse)

        // Add event listener for delete button
        if (isSelf) {
            messageDiv.querySelector('.delete-message-btn').addEventListener('click', (e) => {
                const msgIdToDelete = e.target.dataset.messageId;
                // Visually hide the message
                messageDiv.style.display = 'none';
                // You could also emit to server to log the hide, but per req, it's client-side only.
                // socket.emit('delete-message', { messageId: msgIdToDelete, from: currentUser.username });
            });
        }
    }


    function selectChat(type, name, photo) {
        activeChat.type = type;
        activeChat.name = name;
        activeChat.photo = photo;

        currentChatName.textContent = name;
        currentChatPhoto.src = photo;

        chatArea.classList.add('active'); // Show chat area
        if (window.innerWidth <= 768) {
            // On mobile, hide sidebar and show back button
            document.querySelector('.sidebar').style.display = 'none';
            backToChatsBtn.style.display = 'block';
        }

        // Highlight selected chat in recent chats list
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.chatType === type && item.dataset.chatName === name) {
                item.classList.add('selected');
            }
        });

        // Clear previous messages and load new history
        messagesContainer.innerHTML = '';
        if (type === 'group') {
            groupChatHistory.forEach(msg => displayMessage(msg, msg.from === currentUser.username));
        } else {
            const chatKey1 = `${currentUser.username}-${name}`;
            const chatKey2 = `${name}-${currentUser.username}`;
            const history = privateChatHistory[chatKey1] || privateChatHistory[chatKey2] || [];
            history.forEach(msg => displayMessage(msg, msg.from === currentUser.username));
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
    }

    // --- Event Listeners ---

    backToChatsBtn.addEventListener('click', () => {
        chatArea.classList.remove('active');
        document.querySelector('.sidebar').style.display = 'flex'; // Show sidebar
        backToChatsBtn.style.display = 'none';
    });

    sendMessageBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            const msgData = {
                message: message,
                timestamp: new Date().toLocaleTimeString(),
                from: currentUser.username, // Add sender for local display
                id: generateMessageId()
            };

            if (activeChat.type === 'group') {
                socket.emit('group-message', msgData);
                groupChatHistory.push(msgData); // Add to local history immediately
            } else if (activeChat.type === 'private') {
                msgData.to = activeChat.name; // Add recipient for private message
                socket.emit('private-message', msgData);

                // Add to local private chat history
                const chatKey1 = `${currentUser.username}-${activeChat.name}`;
                const chatKey2 = `${activeChat.name}-${currentUser.username}`;
                const activeKey = privateChatHistory[chatKey1] ? chatKey1 : (privateChatHistory[chatKey2] ? chatKey2 : chatKey1);
                if (!privateChatHistory[activeKey]) {
                    privateChatHistory[activeKey] = [];
                }
                privateChatHistory[activeKey].push(msgData);
            }
            displayMessage(msgData, true); // Display own message immediately
            saveChatHistory();
            renderRecentChats(); // Update last message in recent chats
            messageInput.value = '';
            socket.emit('typing', { target: activeChat.type === 'group' ? 'group' : activeChat.name, isTyping: false });
        }
    });

    messageInput.addEventListener('input', () => {
        const target = activeChat.type === 'group' ? 'group' : activeChat.name;
        if (messageInput.value.trim()) {
            socket.emit('typing', { target, isTyping: true });
        } else {
            socket.emit('typing', { target, isTyping: false });
        }
    });

    // --- Image Sending ---
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result;
                const msgData = {
                    message: base64Image,
                    timestamp: new Date().toLocaleTimeString(),
                    from: currentUser.username,
                    isImage: true,
                    id: generateMessageId()
                };

                if (activeChat.type === 'group') {
                    socket.emit('group-message', msgData);
                    groupChatHistory.push(msgData);
                } else if (activeChat.type === 'private') {
                    msgData.to = activeChat.name;
                    socket.emit('private-message', msgData);
                    const chatKey1 = `${currentUser.username}-${activeChat.name}`;
                    const chatKey2 = `${activeChat.name}-${currentUser.username}`;
                    const activeKey = privateChatHistory[chatKey1] ? chatKey1 : (privateChatHistory[chatKey2] ? chatKey2 : chatKey1);
                    if (!privateChatHistory[activeKey]) privateChatHistory[activeKey] = [];
                    privateChatHistory[activeKey].push(msgData);
                }
                displayMessage(msgData, true);
                saveChatHistory();
                renderRecentChats();
            };
            reader.readAsDataURL(file);
        }
    });

    // --- File Sharing ---
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.size < 5 * 1024 * 1024) { // Max 5MB file size
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64File = e.target.result;
                const msgData = {
                    message: `File: ${file.name}`,
                    timestamp: new Date().toLocaleTimeString(),
                    from: currentUser.username,
                    isFile: true,
                    fileName: file.name,
                    fileData: base64File,
                    id: generateMessageId()
                };

                if (activeChat.type === 'group') {
                    socket.emit('group-message', msgData);
                    groupChatHistory.push(msgData);
                } else if (activeChat.type === 'private') {
                    msgData.to = activeChat.name;
                    socket.emit('private-message', msgData);
                    const chatKey1 = `${currentUser.username}-${activeChat.name}`;
                    const chatKey2 = `${activeChat.name}-${currentUser.username}`;
                    const activeKey = privateChatHistory[chatKey1] ? chatKey1 : (privateChatHistory[chatKey2] ? chatKey2 : chatKey1);
                    if (!privateChatHistory[activeKey]) privateChatHistory[activeKey] = [];
                    privateChatHistory[activeKey].push(msgData);
                }
                displayMessage(msgData, true);
                saveChatHistory();
                renderRecentChats();
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('File is too large. Please select a file smaller than 5MB.');
        }
    });


    // --- Group Creation Modal Logic ---
    groupCreateIcon.addEventListener('click', () => {
        groupCreationModal.style.display = 'flex';
        groupModalMessage.textContent = '';
        groupNameInput.value = '';
        groupPasswordInput.value = '';
        groupMemberSelection.innerHTML = ''; // Clear previous members

        // Populate active users for selection (exclude self)
        allUsers.filter(u => u.username !== currentUser.username).forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-checkbox';
            userDiv.innerHTML = `
                <input type="checkbox" id="user-${user.username}" value="${user.username}">
                <img src="${user.profilePic}" alt="${user.username}">
                <label for="user-${user.username}"><span>${user.username}</span></label>
            `;
            groupMemberSelection.appendChild(userDiv);
        });
    });

    groupModalCloseBtn.addEventListener('click', () => {
        groupCreationModal.style.display = 'none';
    });

    createGroupBtn.addEventListener('click', () => {
        const groupName = groupNameInput.value.trim();
        const groupPassword = groupPasswordInput.value.trim();
        const selectedMembers = Array.from(groupMemberSelection.querySelectorAll('input[type="checkbox"]:checked'))
                                     .map(checkbox => checkbox.value);

        if (!groupName) {
            groupModalMessage.textContent = 'Group name is required.';
            return;
        }
        if (selectedMembers.length === 0) {
            groupModalMessage.textContent = 'Please select at least one member.';
            return;
        }

        // In a full app, you'd send this to the server to create the group
        // For this demo, we'll just log it and close the modal.
        console.log('Creating group:', { groupName, groupPassword, selectedMembers });
        groupModalMessage.textContent = `Group "${groupName}" created (frontend simulated).`;
        // You'd typically get a confirmation from the server and then add this group to your chat list.
        setTimeout(() => {
            groupCreationModal.style.display = 'none';
        }, 1500);
    });


    // --- Socket.io Handlers ---

    socket.on('connect', () => {
        console.log('Connected to server via Socket.io');
        // Get username and profile pic from URL params (passed from login.html)
        const params = getUrlParams();
        currentUser.username = params.username || localStorage.getItem('username');
        currentUser.profilePic = params.profilePic || localStorage.getItem('profilePic');

        if (currentUser.username) {
            socket.emit('set-active', currentUser.username);
            // Ensure chat area is hidden until a chat is selected
            if (window.innerWidth > 768) { // On desktop, group chat is default selected
                selectChat('group', 'Group Chat', 'chat-icon.png');
            } else {
                chatArea.classList.remove('active');
            }
        } else {
            // If no username found (e.g., direct access without login), redirect to login
            window.location.href = 'login.html';
        }
    });

    socket.on('user-list-update', (users) => {
        console.log('User list updated:', users);
        renderActiveUsers(users);
        renderRecentChats(); // Rerender recent chats to update active status
    });

    socket.on('group-message', (msg) => {
        console.log('Received group message:', msg);
        if (msg.from !== currentUser.username) {
            if (activeChat.type === 'group') {
                displayMessage(msg, false);
            }
            playNotificationSound();
        }
        groupChatHistory.push(msg);
        saveChatHistory();
        renderRecentChats(); // Update last message
    });

    socket.on('private-message', (msg) => {
  
