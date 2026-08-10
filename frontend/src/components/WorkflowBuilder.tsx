import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { ArrowLeft, Play, Save, Plus, Trash2 } from 'lucide-react';
import WorkflowRunner from './WorkflowRunner';

const GET_WORKFLOW = gql`
  query GetWorkflow($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      name
      steps(order_by: {step_order: asc}) {
        id
        type
        config
        step_order
      }
      triggers {
        id
        type
        config
      }
      runs(order_by: {started_at: desc}, limit: 1) {
        id
        status
      }
    }
  }
`;

const UPDATE_WORKFLOW_STEPS = gql`
  mutation UpdateSteps($workflow_id: uuid!, $steps: [workflow_steps_insert_input!]!) {
    delete_workflow_steps(where: {workflow_id: {_eq: $workflow_id}}) {
      affected_rows
    }
    insert_workflow_steps(objects: $steps) {
      affected_rows
    }
  }
`;

import { nhost } from '@/lib/nhost';

async function triggerWorkflowRun(workflow_id: string, nhostUrl: string) {
  const res = await fetch(`${nhostUrl}/triggerWorkflowRun`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nhost.auth.getAccessToken()}`
    },
    body: JSON.stringify({ input: { workflow_id } })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function WorkflowBuilder({ workflowId, orgRole, onBack }: { workflowId: string, orgRole: string, onBack: () => void }) {
  const { data, loading, error, refetch } = useQuery(GET_WORKFLOW, { variables: { id: workflowId } });
  const [updateSteps] = useMutation(UPDATE_WORKFLOW_STEPS);
  
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  
  // Local state for editing
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (loading) return <div>Loading workflow...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const workflow = data.workflows_by_pk;
  
  if (!initialized && workflow) {
    setLocalSteps(workflow.steps);
    setInitialized(true);
  }

  const isViewer = orgRole === 'viewer';
  const isOwner = orgRole === 'owner';

  const handleSave = async () => {
    // Format steps for insert
    const stepsToInsert = localSteps.map((s, i) => ({
      workflow_id: workflowId,
      type: s.type,
      config: s.config,
      step_order: i
    }));
    await updateSteps({ variables: { workflow_id: workflowId, steps: stepsToInsert } });
    refetch();
  };

  const handleRun = async () => {
    try {
      const result = await triggerWorkflowRun(workflowId, nhost.functions.url);
      setActiveRunId(result.run_id);
    } catch (e: any) {
      alert("Failed to trigger run: " + e.message);
    }
  };

  const addStep = (type: string) => {
    if (['db_write', 'notify'].includes(type) && !isOwner) {
      alert('Only owners can add ' + type + ' steps.');
      return;
    }
    setLocalSteps([...localSteps, { type, config: {} }]);
  };

  if (activeRunId) {
    return <WorkflowRunner runId={activeRunId} onClose={() => setActiveRunId(null)} orgRole={orgRole} />;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold">{workflow.name} Builder</h2>
        </div>
        <div className="flex items-center gap-3">
          {!isViewer && (
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-colors">
              <Save size={18} /> Save
            </button>
          )}
          {!isViewer && (
            <button onClick={handleRun} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors">
              <Play size={18} fill="currentColor" /> Run Now
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-[500px]">
        {/* Step Palette */}
        {!isViewer && (
          <div className="w-64 bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
            <h3 className="font-bold text-gray-300 uppercase text-xs tracking-wider">Available Nodes</h3>
            <div className="space-y-2">
              {['llm_call', 'http_request', 'conditional_branch', 'approval_gate'].map(t => (
                <button key={t} onClick={() => addStep(t)} className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 text-sm">
                  + {t}
                </button>
              ))}
              {isOwner && ['db_write', 'notify'].map(t => (
                <button key={t} onClick={() => addStep(t)} className="w-full text-left p-3 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 rounded border border-indigo-800/50 text-sm">
                  + {t} (Owner)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Builder Canvas */}
        <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-xl p-6 overflow-y-auto">
          {localSteps.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              No steps yet. Add nodes from the palette.
            </div>
          ) : (
            <div className="space-y-4">
              {localSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold border border-blue-800/50">
                    {idx + 1}
                  </div>
                  <div className="flex-1 bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center group">
                    <div>
                      <span className="font-bold text-blue-400">{step.type}</span>
                      <pre className="text-xs text-gray-500 mt-2">{JSON.stringify(step.config)}</pre>
                    </div>
                    {!isViewer && (
                      <button onClick={() => setLocalSteps(localSteps.filter((_, i) => i !== idx))} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/10 rounded">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
