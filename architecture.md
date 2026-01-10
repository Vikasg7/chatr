# Chatr Architecture & Data Flows

This document provides a technical overview of how Chatr works under the hood. Understanding these patterns is essential for full-stack system design and interview preparation.

---

## 🏗 System Overview

Chatr follows a modern full-stack architecture with a clear separation between the persistent state (Database), the business logic (Server), and the presentation layer (Client).

```mermaid
graph TD
    subgraph Client ["Client (Next.js)"]
        RT["React & Framer Motion"]
        UC["useChat Hook (State)"]
        UW["useWebRTC Hook"]
        SW["Service Worker (Push)"]
    end

    subgraph Server ["Server (Express)"]
        WSS["WSService (WebSocket)"]
        API["REST API (Auth/Files)"]
    end

    subgraph Storage ["Storage & External"]
        DB[(PostgreSQL / Prisma)]
        WP["Web Push Service"]
    end

    RT <--> UC
    UC <--> WSS
    RT <--> UW
    WSS <--> DB
    API <--> DB
    WSS -- signaling --> UW
    WSS -- trigger --> WP
    WP -- push --> SW
```

### Key Components:
- **Client (Next.js)**: A React-based frontend using the App Router. It manages real-time state via custom hooks (`useChat`, `useWebRTC`) and handles UI responsiveness with Framer Motion.
- **Server (Express)**: A Node.js backend that serves two roles:
    1. **REST API**: Handles CRUD operations for authentication, file uploads, and historical data fetching.
    2. **WebSocket Server**: Powers the real-time engine for messaging, status updates, and WebRTC signaling.
- **ORM (Prisma)**: Acts as the bridge between TypeScript and the PostgreSQL database, providing type-safe queries and easy migrations.

---

## � Database Schema (ER Model)

The database is designed to handle flexible communication patterns, supporting both direct 1-on-1 chats and group rooms.

```mermaid
erDiagram
    USER ||--o{ MESSAGE : sends
    USER ||--o{ REACTION : gives
    USER ||--o{ FRIEND : "initiates/receives"
    USER ||--o{ ROOM_MEMBER : joins
    USER ||--o{ PUSH_SUBSCRIPTION : registers

    FRIEND ||--o{ MESSAGE : contains
    ROOM ||--o{ ROOM_MEMBER : "has members"
    ROOM ||--o{ MESSAGE : "contains"
    
    MESSAGE ||--o{ REACTION : "has"
    MESSAGE ||--o{ MESSAGE : "replies to (Self-Ref)"
```

### Core Models:
- **`User`**: Stores identity, credentials (hashed), and relationships.
- **`Friend`**: Represents a 1-on-1 connection status (PENDING/ACCEPTED) between two users.
- **`Message`**: The central entity. It can belong to either a `Friend` (DM) or a `Room` (Group). Supports attachments and self-referencing for replies.
- **`Reaction`**: Allows users to attach emojis to messages.
- **`PushSubscription`**: Stores Web Push credentials linked to a user's browser for offline notifications.

---

## �💬 Real-Time Messaging Flow

Chatr uses **WebSockets** for instant message delivery instead of traditional HTTP polling.

### 1. Connection & Authorization
- When the client mounts, it establishes a WebSocket connection using a **JWT** stored in a secure cookie.
- The server validates the token and maps the `Socket ID` to the `User ID`.

### 2. The Message Lifecycle
```mermaid
sequenceDiagram
    participant C1 as Client A
    participant S as Server
    participant DB as Database
    participant C2 as Client B

    C1->>S: WebSocket: "message:new" (JSON)
    S->>S: Validate Ownership & Rate Limit
    S->>DB: Prisma: Create Message
    S->>S: Add Link Metadata (OpenGraph)
    S-->>C1: Broadcast to sender's other tabs
    S->>C2: WebSocket: "message:new"
    Note over S,C2: If User B is offline:
    S->>DB: Fetch Push Subscriptions
    S->>C2: Web Push Notification
```

---

## 📞 WebRTC Calling Flow (Signaling)

Peer-to-peer (P2P) connections cannot be established without a "matchmaker." Chatr uses the WebSocket server as a **Signaling Server**.

```mermaid
sequenceDiagram
    participant A as Caller (User A)
    participant S as Signaling Server (WS)
    participant B as Callee (User B)

    A->>S: "call:request"
    S->>B: "call:request" (Ringing In)
    B->>S: "call:answer" (User Clicked Accept)
    S->>A: "call:answer" (Ringing Stops)
    
    rect rgb(240, 240, 240)
    Note over A,B: WebRTC Negotiation
    A->>S: ICE Candidate / Offer
    S->>B: ICE Candidate / Offer
    B->>S: ICE Candidate / Answer
    S->>A: ICE Candidate / Answer
    end

    Note over A,B: Direct P2P Media Stream (SRTP)
    A-->>B: Audio/Video Data
    B-->>A: Audio/Video Data
```

---

## 🔒 Security & Performance Features

### 🛡 Security
- **JWT Authentication**: Uses session tokens for stateless authorization.
- **HttpOnly Cookies**: Prevents client-side scripts from accessing tokens, mitigating XSS risks.
- **Rate Limiting**: The WebSocket server monitors message frequency to prevent DoS attacks and spam.
- **Input Sanitization**: All user-generated content is sanitized to prevent injection attacks.

### 🚀 Performance
- **Optimistic UI**: The client updates the UI immediately while the message is still being sent to the server.
- **Pagination (Infinite Scroll)**: Historical messages are fetched in chunks to keep initial load times low.
- **Memory Pruning**: The client keeps only the most recent 500 messages in memory per chat to prevent memory leaks on long-lived sessions.
- **WebSocket Reconnections**: Automatic exponential backoff reconnection logic ensures a stable experience on flakey networks.
