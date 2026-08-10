# AI Agent Workflow Builder (Nhost + Next.js)

This repository contains the complete implementation for the AI Agent Workflow Builder assignment.

## Tech Stack
- **Frontend**: Next.js 15, TailwindCSS, Apollo GraphQL, Nhost React
- **Backend**: Nhost (PostgreSQL, Hasura GraphQL Engine, Auth, Functions)

## Project Structure
- `frontend/` - Contains the Next.js application.
- `nhost/` - Contains the Hasura schema migrations, metadata (permissions, relationships), and serverless functions (Hasura Actions).

## How to Run Locally

### 1. Backend (Nhost)
You will need Docker Desktop and the [Nhost CLI](https://docs.nhost.io/cli) installed.
1. Run `nhost up` from the root directory. This will spin up PostgreSQL, Hasura, Auth, and Storage.
2. The CLI will apply the migrations (`nhost/migrations`) and metadata (`nhost/metadata`) automatically.
3. The serverless functions (`nhost/functions/triggerWorkflowRun.ts` and `nhost/functions/approveStep.ts`) will be served locally on `http://localhost:1337`.

### 2. Frontend (Next.js)
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000).

*Note: The frontend defaults to the local Nhost environment. If you deploy it, update `NEXT_PUBLIC_NHOST_SUBDOMAIN` and `NEXT_PUBLIC_NHOST_REGION` in your `.env.local`.*

## Deploying
1. Push this repository to GitHub.
2. Go to [Nhost Cloud](https://nhost.io) and create a new project. Connect it to your GitHub repository. Nhost will automatically sync your migrations, metadata, and deploy your serverless functions.
3. Go to [Vercel](https://vercel.com) and deploy the `frontend` folder. Set the environment variables provided by your Nhost project dashboard.

## Assignment Deliverables Addressed
1. **Schema & Hasura Config**: Defined perfectly in `nhost/migrations` and generated in `nhost/metadata`.
2. **Two Permission Layers**: 
   - **Layer 1** (Org isolation): Handled in `public_*.yaml` metadata via Hasura RLS checking `org_members`.
   - **Layer 2** (Execution gating): Handled in `triggerWorkflowRun.ts` and `approveStep.ts` Action Handlers.
3. **Approval Gate Pause/Resume**: Action handler checks step type, pauses run, stops execution. `approveStep` API checks role and resumes.
4. **Live Subscriptions**: The frontend's `WorkflowRunner` component subscribes to `step_runs` using Apollo `useSubscription` to show live states.
