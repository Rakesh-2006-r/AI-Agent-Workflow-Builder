CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    usage_quota INT NOT NULL DEFAULT 100,
    usage_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('llm_call', 'http_request', 'db_write', 'notify', 'conditional_branch', 'approval_gate')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    step_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('manual', 'webhook', 'scheduled', 'database_event')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE step_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    input JSONB,
    output JSONB,
    error TEXT,
    attempt_count INT NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Postgres View for Usage Stats (Computed Field alternative)
CREATE VIEW org_usage_stats AS
SELECT 
    o.id AS org_id,
    o.name AS org_name,
    o.usage_count,
    o.usage_quota,
    COUNT(wr.id) AS total_runs
FROM organizations o
LEFT JOIN workflows w ON o.id = w.org_id
LEFT JOIN workflow_runs wr ON w.id = wr.workflow_id
GROUP BY o.id, o.name, o.usage_count, o.usage_quota;
