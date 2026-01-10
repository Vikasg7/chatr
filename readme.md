# Chatr
Chatr is a real-time chat application built with Next.js, React, and WebSockets. It allows users to create chat rooms, send direct messages, and communicate in real-time.

## Features
- User authentication
- Create and join chat rooms
- Direct messaging between users
- Real-time message updates using WebSockets

## Installation
1. Clone the repository:
   ```bash
   $ git clone https://github.com/Vikasg7/chatr
   ```
2. Navigate to the project directory:
   ```bash
   $ cd chatr
   ```
3. Install dependencies for both server and client:
   ```bash
   $ cd server
   $ npm install
   $ cd ../client
   $ npm install
   ```
4. Set up environment variables for the server and client as needed.  
5. Start the development servers:
   - For the server:
     ```bash
     $ cd server
     $ npm run dev
     ```
   - For the client:
     ```bash
     $ cd client
     $ npm run dev
     ```
6. Open your browser and navigate to `http://localhost:3000` to access the application.

## Usage
- Register a new account or log in with existing credentials.
- Create or join chat rooms to start messaging.
- Use the direct messaging feature to chat privately with other users.

## TODO
- [x] if the user is offline.. Voice/Video call shouldn't happen
- [x] call shouldn't go through if the websocket is in closed state or user is offline
- [x] broken attachments link in attachments
- [x] add reply to the message feature
- [x] revamp mobile UI
- [x] add infinite scrolling in chat list and messages
- [x] add loading indicator for messages
- [x] hide logout and theme button in the profile menu on the top right corner
- [ ] three accepted the friend request notifications
- [ ] the chat at from logged out account was showing up in the newly logged in acccount in the same browser window.
- [ ] when clicking on the + icon friend in the SearchFriendModal, it should send the friend request straight away