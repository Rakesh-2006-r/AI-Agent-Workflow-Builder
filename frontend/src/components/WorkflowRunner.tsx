import { useSubscription, gql } from '@apollo/client';
import { X, CheckCircle2, Circle, Loader2, PauseCircle, AlertCircle } from 'lucide-react';

const RUN_SUBSCRIPTION = gql`
  subscription StreamRun($runId: uuid!) {
    workflow_runs_by_pk(id: $runId) {
      id
      status
      step_runs(order_by: {started_at: asc}) {
        id
        status
        output
        error
        step {
          type
        }
      }
    }
  }
`;

async function approveStepAPI(step_run_id: string, nhostUrl: string) {
  const res = await fetch(`${nhostUrl}/v1/functions/approveStep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { step_run_id } })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function WorkflowRunner({ runId, onClose, orgRole }: { runId: string, onClose: () => void, orgRole: string }) {
  const { data, loading, error } = useSubscription(RUN_SUBSCRIPTION, { variables: { runId } });

  if (loading) return <div>Waiting for run to start...</div>;
  if (error) return <div>Subscription error: {error.message}</div>;

  const run = data.workflow_runs_by_pk;
  const isOwnerOrEditor = ['owner', 'editor'].includes(orgRole);

  const handleApprove = async (stepRunId: string) => {
    try {
      await approveStepAPI(stepRunId, process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || 'http://localhost:1337');
    } catch (e: any) {
      alert("Failed to approve: " + e.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="text-green-400" size={24} />;
      case 'running': return <Loader2 className="text-blue-400 animate-spin" size={24} />;
      case 'paused': return <PauseCircle className="text-yellow-400" size={24} />;
      case 'failed': return <AlertCircle className="text-red-400" size={24} />;
      default: return <Circle className="text-gray-600" size={24} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <h3 className="font-bold text-lg flex items-center gap-2">
          Run Execution 
          <span className={`text-sm px-2 py-1 rounded ${
            run.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            run.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            run.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {run.status.toUpperCase()}
          </span>
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded"><X size={20}/></button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-4">
        {run.step_runs.length === 0 ? (
          <div className="text-gray-500">Initializing...</div>
        ) : (
          run.step_runs.map((sr: any, idx: number) => (
            <div key={sr.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                {getStatusIcon(sr.status)}
                {idx < run.step_runs.length - 1 && <div className="w-0.5 h-full bg-gray-700 my-1"></div>}
              </div>
              <div className="flex-1 bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-white capitalize">{sr.step.type}</h4>
                  <span className="text-xs text-gray-500">{sr.status}</span>
                </div>
                
                {sr.output && (
                  <div className="mt-2 p-3 bg-gray-900 rounded border border-gray-700 text-sm overflow-x-auto">
                    <pre className="text-green-300">{JSON.stringify(sr.output, null, 2)}</pre>
                  </div>
                )}
                
                {sr.error && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-800/50 rounded text-sm text-red-300">
                    {sr.error}
                  </div>
                )}

                {sr.status === 'paused' && sr.step.type === 'approval_gate' && (
                  <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-yellow-400">Approval Required</h5>
                      <p className="text-sm text-yellow-200/70">An owner or editor must approve to continue.</p>
                    </div>
                    {isOwnerOrEditor ? (
                      <button 
                        onClick={() => handleApprove(sr.id)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium shadow transition-colors"
                      >
                        Approve
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500 bg-gray-800 px-3 py-1 rounded">Viewer Cannot Approve</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
