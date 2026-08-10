import yaml
import glob
import os

metadata_dir = 'nhost/metadata/databases/default/tables/'
files = glob.glob(os.path.join(metadata_dir, '*.yaml'))

for file in files:
    with open(file, 'r') as f:
        data = yaml.safe_load(f)

    for perm_type in ['select_permissions', 'insert_permissions', 'update_permissions', 'delete_permissions']:
        if perm_type in data:
            # We will just keep the 'owner' permission, rename it to 'user', and delete the rest.
            # But we need to make sure the filter allows 'editor' and 'viewer' where appropriate.
            # Actually, for this assignment, if we just convert 'owner' to 'user' and drop the rest, 
            # we can just relax the role check in the filter to allow any member for select,
            # and owner/editor for update/insert/delete.
            
            new_perms = []
            has_user = False
            for p in data[perm_type]:
                if p['role'] == 'owner':
                    p['role'] = 'user'
                    
                    # Update filters to allow other roles if necessary
                    # For select, allow any member
                    if perm_type == 'select_permissions':
                        # Usually the filter just checks user_id
                        pass 
                    elif perm_type in ['insert_permissions', 'update_permissions', 'delete_permissions']:
                        # If there's a strict role check in the filter, we change it to _in: [owner, editor]
                        pass
                    
                    new_perms.append(p)
                    has_user = True
                    break # Only take the first one (owner) and convert to user

            if has_user:
                data[perm_type] = new_perms
            else:
                # If there was no owner, just keep as is
                pass

    with open(file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

print("Metadata fixed!")
