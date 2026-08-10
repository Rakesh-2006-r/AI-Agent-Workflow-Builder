import { Request, Response } from 'express';
import fetch from 'node-fetch'; // Requires node-fetch if Node < 18, Nhost has Node 18+ fetch built-in but we assume standard Node handler

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  // In Nhost, Hasura Actions send the payload in req.body.input
  // Also req.body.session_variables contains the 'x-hasura-user-id' and 'x-hasura-role'
  const { workflow_id } = req.body.input;
  const session_vars = req.body.session_variables || {};
  const user_id = session_vars['x-hasura-user-id'];
  
  if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

  // 1. Verify caller is owner/editor of the workflow's org and check quota
  const hasuraEndpoint = process.env.NHOST_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  const adminSecret = process.env.NHOST_ADMIN_SECRET || 'myadminsecretkey';

  const checkQuery = `
    query checkPermissions($workflow_id: uuid!, $user_id: uuid!) {
      workflows_by_pk(id: $workflow_id) {
        organization {
          id
          usage_quota
          usage_count
          org_members(where: {user_id: {_eq: $user_id}}) {
            role
          }
        }
        steps(order_by: {step_order: asc}) {
          id
          type
          config
        }
      }
    }
  `;

  try {
    const checkRes = await fetch(hasuraEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret
      },
      body: JSON.stringify({
        query: checkQuery,
        variables: { workflow_id, user_id }
      })
    });
    
    const { data, errors } = (await checkRes.json()) as any;
    
    if (errors || !data?.workflows_by_pk) {
      return res.status(403).json({ message: 'Workflow not found or access denied' });
    }

    const org = data.workflows_by_pk.organization;
    const members = org.org_members;
    
    if (!members.length || !['owner', 'editor'].includes(members[0].role)) {
      return res.status(403).json({ message: 'Must be owner or editor to trigger' });
    }

    if (org.usage_count >= org.usage_quota) {
      return res.status(402).json({ message: 'Quota exceeded' });
    }

    // 2. Create Workflow Run
    const insertRunMutation = `
      mutation createRun($workflow_id: uuid!) {
        insert_workflow_runs_one(object: {workflow_id: $workflow_id, status: "running"}) {
          id
        }
      }
    `;

    const runRes = await fetch(hasuraEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': adminSecret },
      body: JSON.stringify({ query: insertRunMutation, variables: { workflow_id } })
    });
    
    const runData = (await runRes.json()) as any;
    const run_id = runData.data.insert_workflow_runs_one.id;
    const steps = data.workflows_by_pk.steps;
    
    // Asynchronous Execution Logic
    // We start the execution in the background so we can return the run_id to the caller immediately
    // In a real robust system, this would push to a queue (like RabbitMQ or pg-boss)
    // For this assignment, we do an async execution
    
    executeSteps(hasuraEndpoint, adminSecret, run_id, steps, org.id).catch(console.error);

    return res.status(200).json({ run_id });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

async function executeSteps(hasuraEndpoint: string, adminSecret: string, run_id: string, steps: any[], org_id: string) {
  let runStatus = 'completed';
  
  for (const step of steps) {
    // Insert step_run as running
    let stepRunId = await insertStepRun(hasuraEndpoint, adminSecret, run_id, step.id, 'running');
    
    if (step.type === 'approval_gate') {
      // Pause the run
      await updateStepRun(hasuraEndpoint, adminSecret, stepRunId, 'paused');
      await updateWorkflowRun(hasuraEndpoint, adminSecret, run_id, 'paused');
      return; // Stop execution, it will be resumed by approveStep
    }

    try {
      let output = null;
      if (step.type === 'llm_call') {
        output = await executeLlmCall(step.config);
      } else if (step.type === 'http_request') {
        output = await executeHttpCall(step.config);
      } else if (step.type === 'conditional_branch') {
        // Logic based on previous step output... simplified for demo
        output = { branch_taken: true };
      }
      
      await updateStepRun(hasuraEndpoint, adminSecret, stepRunId, 'completed', output);
    } catch (e: any) {
      await updateStepRun(hasuraEndpoint, adminSecret, stepRunId, 'failed', null, e.message);
      runStatus = 'failed';
      break;
    }
  }

  await updateWorkflowRun(hasuraEndpoint, adminSecret, run_id, runStatus);
  
  if (runStatus === 'completed') {
    await incrementQuota(hasuraEndpoint, adminSecret, org_id);
  }
}

// Helpers
async function insertStepRun(endpoint: string, secret: string, run_id: string, step_id: string, status: string) {
  const q = `mutation insertStepRun($run_id: uuid!, $step_id: uuid!, $status: String!) { insert_step_runs_one(object: {run_id: $run_id, step_id: $step_id, status: $status}) { id } }`;
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': secret }, body: JSON.stringify({ query: q, variables: { run_id, step_id, status } }) });
  const data = (await res.json()) as any;
  return data.data.insert_step_runs_one.id;
}

async function updateStepRun(endpoint: string, secret: string, id: string, status: string, output: any = null, error: any = null) {
  const q = `mutation updateStepRun($id: uuid!, $status: String!, $output: jsonb, $error: String) { update_step_runs_by_pk(pk_columns: {id: $id}, _set: {status: $status, output: $output, error: $error}) { id } }`;
  await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': secret }, body: JSON.stringify({ query: q, variables: { id, status, output, error } }) });
}

async function updateWorkflowRun(endpoint: string, secret: string, id: string, status: string) {
  const q = `mutation updateWorkflowRun($id: uuid!, $status: String!) { update_workflow_runs_by_pk(pk_columns: {id: $id}, _set: {status: $status}) { id } }`;
  await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': secret }, body: JSON.stringify({ query: q, variables: { id, status } }) });
}

async function incrementQuota(endpoint: string, secret: string, org_id: string) {
  const q = `mutation incQuota($org_id: uuid!) { update_organizations_by_pk(pk_columns: {id: $org_id}, _inc: {usage_count: 1}) { id } }`;
  await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': secret }, body: JSON.stringify({ query: q, variables: { org_id } }) });
}

async function executeLlmCall(config: any) {
  // Stubbed LLM Call as requested
  return new Promise(resolve => setTimeout(() => resolve({ response: "LLM Result: It works!" }), 1000));
}

async function executeHttpCall(config: any) {
  return new Promise(resolve => setTimeout(() => resolve({ statusCode: 200, data: "HTTP OK" }), 500));
}
