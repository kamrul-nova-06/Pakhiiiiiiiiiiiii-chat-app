# # Pakhiiiiiiiiiiiii 🐦 Chat Application

This is a real-time Messenger-style web chat application built with Node.js, Express, Socket.io, and vanilla JavaScript.

## Features (Planned/Implemented in parts)

* User Login System
* Real-time Group and Private Chat
* Persistent Messages
* Image and File Sharing
* Typing Indicators
* Mobile-Optimized UI
* Message Notifications

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/pakhiiiiiiiiiiiiii-chat-app.git](https://github.com/yourusername/pakhiiiiiiiiiiiiii-chat-app.git)
    cd pakhiiiiiiiiiiiiii-chat-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the server:**
    ```bash
    npm start
    ```

4.  **Access the application:**
    Open your browser and go to `http://localhost:3000/login.html`

## Project Structure

* `server.js`: Backend server using Express and Socket.io.
* `public/`: Contains all frontend assets (HTML, CSS, JavaScript, images).
    * `login.html`: User login page.
    * `index.html`: Main chat application interface.
    * `script.js`: Frontend JavaScript logic for chat.
    * `notify.js`: Handles notification sounds.
    * `default1.png`, `default2.png`, `chat-icon.png`: Static assets.

## Deployment on Render & GitHub

This application is designed to be deployable on platforms like Render, which supports Node.js applications.

1.  **GitHub Repository:** Push your code to a GitHub repository.
2.  **Render Deployment:**
    * Create a new Web Service on Render.
    * Connect your GitHub repository.
    * Set the `Build Command` to `npm install`.
    * Set the `Start Command` to `node server.js`.
    * Ensure the `PORT` environment variable is set (Render automatically provides this, typically `10000`).
    * Deploy the service.

## Admin Features

* **Reset All Data:** This feature is intended for admin use only. In a production environment, this would be a secure API endpoint. For this example, it's mentioned as a GitHub trigger, implying a CI/CD pipeline step or a custom GitHub Action that executes a script to wipe data. (Not implemented in this basic example for security reasons).

## Future Enhancements

* Database integration for persistent user and chat data.
* More robust authentication and session management.
* Advanced UI/UX features (emojis, reactions).
* Group management features (kick, leave, admin roles).
* Full voice message support.
