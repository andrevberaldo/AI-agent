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
- OpenAI API key (for GPT-4 model access)

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
OPENAI_API_KEY=sk-your-openai-api-key
```

Get your OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

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

## LangChain Deep Agent Architecture

### Agent Configuration
The application uses **LangChain's React Agent** with **OpenAI GPT-4** as the LLM backbone:

```typescript
// Configured in lib/agent.ts
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo',
  temperature: 0.7,
});

const agent = await createReactAgent({
  llm: model,
  tools: [getUsers, createUser, updateUser, deleteUser],
});
```

### Available Tools
The agent has access to 4 tools for user management:
1. **get_users**: Retrieve all users from the database
2. **create_user**: Create a new user (name, email required)
3. **update_user**: Update user details by ID
4. **delete_user**: Delete a user by ID

### Agent Flow
1. User sends message via Copilot Kit popup
2. Message routed to `/api/copilotkit` endpoint
3. Agent processes message and decides which tool(s) to use
4. Tools execute database operations
5. Agent formats response based on tool results
6. Response sent back to UI and stored in agent history

### Agent State Management
- **Thread ID**: Unique conversation identifier
- **Checkpoint**: Saves agent state at each step for resumability
- **History**: All messages and actions logged to PostgreSQL

## Development Notes

- The Deep Agent with OpenAI is fully integrated. Modify LLM settings in `lib/agent.ts`
- Add new tools by defining them with Zod schemas in `lib/agent.ts`
- Agent state and history are persisted in PostgreSQL (agent_state, agent_history tables)
- The agent uses tool calling and JSON schema validation for type safety

## CI/CD Pipeline

This project includes a complete automated CI/CD pipeline with GitHub Actions:

### PR Verify Workflow
Triggered on pull requests - runs automated checks:
- ✓ Lint & format validation
- ✓ Build verification
- ✓ Unit tests
- ✓ Security scanning
- ✓ Database schema validation

### Build and Deploy Workflow
Triggered on push to main - automates deployment:
- ✓ Build Next.js application
- ✓ Run smoke tests
- ✓ Deploy to staging
- ✓ Deploy to production (blue-green)
- ✓ Health verification
- ✓ Rollback capability

See [.github/WORKFLOWS.md](.github/WORKFLOWS.md) for detailed pipeline documentation.

### Status Badges
[![PR Verify](https://github.com/andrevberaldo/AI-agent/actions/workflows/pr-verify.yml/badge.svg)](https://github.com/andrevberaldo/AI-agent/actions)
[![Build and Deploy](https://github.com/andrevberaldo/AI-agent/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/andrevberaldo/AI-agent/actions)

## Future Enhancements

- Advanced agent capabilities with LangChain Deep Agent
- Custom tool definitions for the agent
- User authentication and authorization
- Session management for agent conversations
- Real-time updates with WebSockets
- Container image scanning and security audits
- Canary deployments with gradual rollout
- Automated performance benchmarking
