import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useState } from 'react';
import WorkflowBuilder from './WorkflowBuilder';
import { Plus, Settings, Play } from 'lucide-react';

const GET_ORGS_AND_WORKFLOWS = gql`
  query GetOrgs($userId: uuid!) {
    organizations(where: {org_members: {user_id: {_eq: $userId}}}) {
      id
      name
      usage_quota
      usage_count
      org_members(where: {user_id: {_eq: $userId}}) {
        role
      }
      workflows {
        id
        name
        description
        updated_at
      }
    }
  }
`;

const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($org_id: uuid!, $name: String!) {
    insert_workflows_one(object: {org_id: $org_id, name: $name}) {
      id
    }
  }
`;

const CREATE_ORG = gql`
  mutation CreateOrg($name: String!, $userId: uuid!) {
    insert_organizations_one(object: {
      name: $name, 
      org_members: {
        data: [{ user_id: $userId, role: "owner" }]
      }
    }) {
      id
      name
    }
  }
`;

export default function Dashboard({ userId }: { userId: any }) {
  const { data, loading, error, refetch } = useQuery(GET_ORGS_AND_WORKFLOWS, {
    variables: { userId },
    skip: !userId
  });

  const [createWorkflow] = useMutation(CREATE_WORKFLOW);
  const [createOrg] = useMutation(CREATE_ORG);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading data: {error.message}</div>;

  const orgs = data?.organizations || [];
  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
        <p>You are not a member of any organization.</p>
        <button 
          onClick={async () => {
            if (isCreatingOrg) return;
            const name = prompt('Enter Organization Name:');
            if (name) {
              setIsCreatingOrg(true);
              try {
                await createOrg({ variables: { name, userId } });
                await refetch();
              } catch (e) {
                console.error(e);
                alert("Failed to create organization. Check permissions.");
              }
              setIsCreatingOrg(false);
            }
          }}
          disabled={isCreatingOrg}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          {isCreatingOrg ? 'Creating...' : 'Create Organization'}
        </button>
      </div>
    );
  }

  // For simplicity in this assignment demo, we'll just use the first org the user is part of.
  const org = orgs[0];
  const role = org.org_members[0]?.role;
  const usagePercentage = Math.min((org.usage_count / org.usage_quota) * 100, 100);

  if (activeWorkflowId) {
    return (
      <WorkflowBuilder 
        workflowId={activeWorkflowId} 
        orgRole={role}
        onBack={() => { setActiveWorkflowId(null); refetch(); }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-white">{org.name}</h2>
          <p className="text-sm text-gray-400 capitalize">Role: {role}</p>
        </div>
        <div className="flex flex-col items-end gap-2 w-1/3">
          <div className="flex justify-between w-full text-sm font-medium">
            <span className="text-gray-400">Quota Usage</span>
            <span className={usagePercentage > 90 ? 'text-red-400' : 'text-green-400'}>
              {org.usage_count} / {org.usage_quota}
            </span>
          </div>
          <div className="w-full bg-gray-700 h-2.5 rounded-full overflow-hidden">
            <div 
              className={`h-2.5 rounded-full ${usagePercentage > 90 ? 'bg-red-500' : 'bg-green-500'}`} 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Workflows</h3>
        {['owner', 'editor'].includes(role) && (
          <button 
            onClick={async () => {
              const name = prompt('Workflow Name:');
              if (name) {
                await createWorkflow({ variables: { org_id: org.id, name } });
                refetch();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            <Plus size={18} /> New Workflow
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {org.workflows.map((w: any) => (
          <div key={w.id} className="group flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors cursor-pointer" onClick={() => setActiveWorkflowId(w.id)}>
            <div className="p-5 flex-1">
              <h4 className="font-bold text-lg text-white mb-2">{w.name}</h4>
              <p className="text-sm text-gray-400 line-clamp-2">{w.description || "No description provided."}</p>
            </div>
            <div className="bg-gray-800/50 p-4 border-t border-gray-700 flex justify-between items-center">
              <span className="text-xs text-gray-500">Updated {new Date(w.updated_at).toLocaleDateString()}</span>
              <Settings size={16} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
