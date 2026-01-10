# Chatr

Chatr is a high-performance, real-time communication platform built with modern web technologies. It features a seamless messaging experience with support for rich media, reactions, and peer-to-peer calling.

**🌐 Live App:** [https://chatr-client.onrender.com/](https://chatr-client.onrender.com/)

## ✨ Features

- **🚀 Real-Time Messaging**: Instant delivery using WebSockets with reliable sync.
- **📞 Audio & Video Calls**: High-quality peer-to-peer calling powered by WebRTC.
- **📎 Rich Media Attachments**: Support for Images, Videos, Audio, and Generic Files.
- **🔗 Link Previews**: Automatic metadata fetching for shared URLs.
- **💬 Enhanced Interactivity**:
    - **Reactions**: Add emoji reactions to messages.
    - **Replies**: Quote and reply to specific messages.
    - **Edit/Delete**: Full control over your sent messages.
- **🔔 Smart Notifications**:
    - **Push Notifications**: Stay connected even when the app is in the background.
    - **Unread Tracking**: Visual indicators for new messages.
- **📱 Responsive Design**: A stunning, premium UI that works perfectly on desktop and mobile.
- **📜 Infinite Scrolling**: Efficiently load message history and friend lists.
- **🔒 Secure Architecture**: JWT-based authentication with HttpOnly cookies and rate limiting.

## 🛠 Tech Stack

- **Frontend**: Next.js, React, TypeScript, Framer Motion, Vanilla CSS (Semantic Variable System).
- **Backend**: Node.js, TypeScript, WebSocket (ws), Prisma ORM.
- **Database**: PostgreSQL (via Prisma).
- **Other**: WebRTC, Web Push API, JWT.

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Vikasg7/chatr
   cd chatr
   ```

2. **Server Setup**:
   ```bash
   cd server
   npm install
   # Configure .env with DATABASE_URL, JWT_SECRET, VAPID keys, etc.
   npx prisma db push
   npm run dev
   ```

3. **Client Setup**:
   ```bash
   cd ../client
   npm install
   # Configure .env with NEXT_PUBLIC_SERVER_URL
   npm run dev
   ```

4. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000) to start chatting.

## 💡 Usage

- **Get Started**: Register a new account or use the "Try Demo" feature.
- **Add Friends**: Use the search icon to find users by email and send friend requests.
- **Communicate**: Click on a friend from the sidebar to start a real-time conversation.
- **Call**: Use the phone or video icons in the chat header to start a call.
