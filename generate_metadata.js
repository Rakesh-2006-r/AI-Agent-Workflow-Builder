const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const dir = path.join(__dirname, 'nhost', 'metadata', 'databases', 'default', 'tables');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const tables = {
  'public_org_members': {
    table: { name: 'org_members', schema: 'public' },
    object_relationships: [
      { name: 'organization', using: { foreign_key_constraint_on: 'org_id' } }
    ],
    select_permissions: ['owner', 'editor', 'viewer'].map(role => ({
      role,
      permission: {
        columns: ['id', 'user_id', 'org_id', 'role', 'created_at'],
        filter: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } }
      }
    })),
    insert_permissions: [
      { role: 'owner', permission: { check: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' }, role: { _eq: 'owner' } } } }, columns: ['user_id', 'org_id', 'role'] } }
    ],
    update_permissions: [
      { role: 'owner', permission: { filter: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' }, role: { _eq: 'owner' } } } }, columns: ['role'] } }
    ],
    delete_permissions: [
      { role: 'owner', permission: { filter: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' }, role: { _eq: 'owner' } } } } } }
    ]
  },
  'public_workflows': {
    table: { name: 'workflows', schema: 'public' },
    object_relationships: [
      { name: 'organization', using: { foreign_key_constraint_on: 'org_id' } }
    ],
    array_relationships: [
      { name: 'steps', using: { foreign_key_constraint_on: { column: 'workflow_id', table: { name: 'workflow_steps', schema: 'public' } } } },
      { name: 'triggers', using: { foreign_key_constraint_on: { column: 'workflow_id', table: { name: 'workflow_triggers', schema: 'public' } } } },
      { name: 'runs', using: { foreign_key_constraint_on: { column: 'workflow_id', table: { name: 'workflow_runs', schema: 'public' } } } }
    ],
    select_permissions: ['owner', 'editor', 'viewer'].map(role => ({
      role,
      permission: {
        columns: ['id', 'org_id', 'name', 'description', 'created_at', 'updated_at'],
        filter: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } }
      }
    })),
    insert_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        check: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } },
        columns: ['org_id', 'name', 'description']
      }
    })),
    update_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        filter: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } },
        columns: ['name', 'description', 'updated_at']
      }
    })),
    delete_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        filter: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } }
      }
    }))
  },
  'public_workflow_steps': {
    table: { name: 'workflow_steps', schema: 'public' },
    object_relationships: [
      { name: 'workflow', using: { foreign_key_constraint_on: 'workflow_id' } }
    ],
    select_permissions: ['owner', 'editor', 'viewer'].map(role => ({
      role,
      permission: {
        columns: ['id', 'workflow_id', 'type', 'config', 'step_order', 'created_at'],
        filter: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } }
      }
    })),
    insert_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        check: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } },
        columns: ['workflow_id', 'type', 'config', 'step_order']
      }
    })),
    update_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        filter: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } },
        columns: ['type', 'config', 'step_order']
      }
    })),
    delete_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        filter: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } }
      }
    }))
  },
  'public_workflow_triggers': {
    table: { name: 'workflow_triggers', schema: 'public' },
    object_relationships: [
      { name: 'workflow', using: { foreign_key_constraint_on: 'workflow_id' } }
    ],
    select_permissions: ['owner', 'editor', 'viewer'].map(role => ({
      role,
      permission: {
        columns: ['id', 'workflow_id', 'type', 'config', 'created_at'],
        filter: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } }
      }
    })),
    insert_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        check: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } },
        columns: ['workflow_id', 'type', 'config']
      }
    })),
    delete_permissions: ['owner', 'editor'].map(role => ({
      role,
      permission: {
        filter: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } }
      }
    }))
  },
  'public_workflow_runs': {
    table: { name: 'workflow_runs', schema: 'public' },
    object_relationships: [
      { name: 'workflow', using: { foreign_key_constraint_on: 'workflow_id' } }
    ],
    array_relationships: [
      { name: 'step_runs', using: { foreign_key_constraint_on: { column: 'run_id', table: { name: 'step_runs', schema: 'public' } } } }
    ],
    select_permissions: ['owner', 'editor', 'viewer'].map(role => ({
      role,
      permission: {
        columns: ['id', 'workflow_id', 'status', 'started_at', 'completed_at'],
        filter: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } }
      }
    }))
  },
  'public_step_runs': {
    table: { name: 'step_runs', schema: 'public' },
    object_relationships: [
      { name: 'workflow_run', using: { foreign_key_constraint_on: 'run_id' } },
      { name: 'step', using: { foreign_key_constraint_on: 'step_id' } }
    ],
    select_permissions: ['owner', 'editor', 'viewer'].map(role => ({
      role,
      permission: {
        columns: ['id', 'run_id', 'step_id', 'status', 'input', 'output', 'error', 'attempt_count', 'approved_by', 'approved_at', 'started_at', 'completed_at'],
        filter: { workflow_run: { workflow: { organization: { org_members: { user_id: { _eq: 'X-Hasura-User-Id' } } } } } }
      }
    }))
  }
};

for (const [filename, content] of Object.entries(tables)) {
  fs.writeFileSync(path.join(dir, `${filename}.yaml`), yaml.stringify(content));
}
console.log('Metadata written!');
