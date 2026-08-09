# AI Agent - Fullstack Application

A modern fullstack application built with **Next.js**, **Material UI**, **Copilot Kit**, **LangChain Deep Agent**, and **PostgreSQL**.

## Features

- **User CRUD Management**: Full Create, Read, Update, Delete functionality for users
- **Copilot Kit Integration**: AI-powered assistant for user management
- **LangChain Deep Agent**: Advanced agent-based AI capabilities
- **PostgreSQL Database**: Persistent storage with agent state management
- **Material UI**: Modern, responsive UI components
- **TypeScript**: Full type safety across the stack

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI Components**: Material UI v5
- **AI/Agent**: Copilot Kit + LangChain
- **Database**: PostgreSQL
- **HTTP Client**: Axios

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file in the root directory:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ai_agent
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **Run database migration**:
```bash
npm run db:migrate
```

## Running the Application

**Development mode**:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

**Production build**:
```bash
npm run build
npm start
```

## API Endpoints

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/[id]` - Get a specific user
- `PUT /api/users/[id]` - Update a user
- `DELETE /api/users/[id]` - Delete a user

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── users/           # User API routes
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Main page with user management UI
├── lib/
│   ├── db.ts                # Database utilities
│   └── agent.ts             # Agent and state management
├── scripts/
│   └── migrate.js           # Database migration script
├── .env.local               # Environment variables
├── next.config.js           # Next.js configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Agent State Table
```sql
CREATE TABLE agent_state (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) UNIQUE NOT NULL,
  checkpoint_id VARCHAR(255),
  state JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Agent History Table
```sql
CREATE TABLE agent_history (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES agent_state(thread_id) ON DELETE CASCADE
);
```

## Next Steps

1. Configure your PostgreSQL database connection in `.env.local`
2. Run the database migration: `npm run db:migrate`
3. Start the development server: `npm run dev`
4. Navigate to `http://localhost:3000` and start using the application
5. Click "Need help?" to interact with the Copilot Kit assistant

## Development Notes

- The Copilot Kit is configured with a basic setup. Customize the instructions in `app/layout.tsx` and `app/page.tsx`
- Agent tools are defined in `lib/agent.ts`. Add more tools as needed
- Database queries are executed through `lib/db.ts` which handles connection pooling

## Future Enhancements

- Advanced agent capabilities with LangChain Deep Agent
- Custom tool definitions for the agent
- User authentication and authorization
- Session management for agent conversations
- Real-time updates with WebSockets
