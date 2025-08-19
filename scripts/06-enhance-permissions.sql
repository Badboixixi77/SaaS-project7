-- Add viewer role to existing role check constraint
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check 
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- Create permissions table for granular permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  UNIQUE(role, permission, resource)
);

-- Insert default permissions for each role
INSERT INTO role_permissions (role, permission, resource) VALUES
-- Owner permissions (full access)
('owner', 'create', 'team'),
('owner', 'read', 'team'),
('owner', 'update', 'team'),
('owner', 'delete', 'team'),
('owner', 'manage_members', 'team'),
('owner', 'manage_billing', 'team'),
('owner', 'create', 'project'),
('owner', 'read', 'project'),
('owner', 'update', 'project'),
('owner', 'delete', 'project'),
('owner', 'create', 'task'),
('owner', 'read', 'task'),
('owner', 'update', 'task'),
('owner', 'delete', 'task'),
('owner', 'create', 'comment'),
('owner', 'read', 'comment'),
('owner', 'update', 'comment'),
('owner', 'delete', 'comment'),
('owner', 'upload', 'attachment'),
('owner', 'read', 'attachment'),
('owner', 'delete', 'attachment'),
('owner', 'read', 'analytics'),

-- Admin permissions (most access, no billing/team deletion)
('admin', 'read', 'team'),
('admin', 'update', 'team'),
('admin', 'manage_members', 'team'),
('admin', 'create', 'project'),
('admin', 'read', 'project'),
('admin', 'update', 'project'),
('admin', 'delete', 'project'),
('admin', 'create', 'task'),
('admin', 'read', 'task'),
('admin', 'update', 'task'),
('admin', 'delete', 'task'),
('admin', 'create', 'comment'),
('admin', 'read', 'comment'),
('admin', 'update', 'comment'),
('admin', 'delete', 'comment'),
('admin', 'upload', 'attachment'),
('admin', 'read', 'attachment'),
('admin', 'delete', 'attachment'),
('admin', 'read', 'analytics'),

-- Member permissions (standard user access)
('member', 'read', 'team'),
('member', 'read', 'project'),
('member', 'create', 'task'),
('member', 'read', 'task'),
('member', 'update', 'task'),
('member', 'create', 'comment'),
('member', 'read', 'comment'),
('member', 'update', 'comment'),
('member', 'upload', 'attachment'),
('member', 'read', 'attachment'),
('member', 'read', 'analytics'),

-- Viewer permissions (read-only access)
('viewer', 'read', 'team'),
('viewer', 'read', 'project'),
('viewer', 'read', 'task'),
('viewer', 'read', 'comment'),
('viewer', 'read', 'attachment');

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION user_has_permission(
  user_id UUID,
  team_id UUID,
  permission_name VARCHAR(100),
  resource_name VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
BEGIN
  -- Get user's role in the team
  SELECT role INTO user_role
  FROM team_members
  WHERE team_members.user_id = user_has_permission.user_id
    AND team_members.team_id = user_has_permission.team_id;
  
  -- If user is not a team member, return false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the role has the required permission
  RETURN EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = user_role
      AND permission = permission_name
      AND resource = resource_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies with permission checks

-- Teams policies
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
CREATE POLICY "Users can view teams they are members of" ON teams
  FOR SELECT USING (
    user_has_permission(auth.uid(), id, 'read', 'team')
  );

DROP POLICY IF EXISTS "Team owners and admins can update teams" ON teams;
CREATE POLICY "Team owners and admins can update teams" ON teams
  FOR UPDATE USING (
    user_has_permission(auth.uid(), id, 'update', 'team')
  );

CREATE POLICY "Team owners can delete teams" ON teams
  FOR DELETE USING (
    user_has_permission(auth.uid(), id, 'delete', 'team')
  );

-- Projects policies
DROP POLICY IF EXISTS "Users can view projects of their teams" ON projects;
CREATE POLICY "Users can view projects of their teams" ON projects
  FOR SELECT USING (
    user_has_permission(auth.uid(), team_id, 'read', 'project')
  );

CREATE POLICY "Users can create projects in their teams" ON projects
  FOR INSERT WITH CHECK (
    user_has_permission(auth.uid(), team_id, 'create', 'project')
  );

CREATE POLICY "Users can update projects in their teams" ON projects
  FOR UPDATE USING (
    user_has_permission(auth.uid(), team_id, 'update', 'project')
  );

CREATE POLICY "Users can delete projects in their teams" ON projects
  FOR DELETE USING (
    user_has_permission(auth.uid(), team_id, 'delete', 'project')
  );

-- Task lists policies
DROP POLICY IF EXISTS "Users can view task lists of their team projects" ON task_lists;
CREATE POLICY "Users can view task lists of their team projects" ON task_lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_lists.project_id
        AND user_has_permission(auth.uid(), p.team_id, 'read', 'project')
    )
  );

CREATE POLICY "Users can create task lists in their team projects" ON task_lists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_lists.project_id
        AND user_has_permission(auth.uid(), p.team_id, 'create', 'task')
    )
  );

CREATE POLICY "Users can update task lists in their team projects" ON task_lists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = task_lists.project_id
        AND user_has_permission(auth.uid(), p.team_id, 'update', 'task')
    )
  );

-- Tasks policies
DROP POLICY IF EXISTS "Users can view tasks of their team projects" ON tasks;
CREATE POLICY "Users can view tasks of their team projects" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_lists tl
      JOIN projects p ON tl.project_id = p.id
      WHERE tl.id = tasks.task_list_id
        AND user_has_permission(auth.uid(), p.team_id, 'read', 'task')
    )
  );

CREATE POLICY "Users can create tasks in their team projects" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_lists tl
      JOIN projects p ON tl.project_id = p.id
      WHERE tl.id = tasks.task_list_id
        AND user_has_permission(auth.uid(), p.team_id, 'create', 'task')
    )
  );

CREATE POLICY "Users can update tasks in their team projects" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM task_lists tl
      JOIN projects p ON tl.project_id = p.id
      WHERE tl.id = tasks.task_list_id
        AND user_has_permission(auth.uid(), p.team_id, 'update', 'task')
    )
  );

CREATE POLICY "Users can delete tasks in their team projects" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM task_lists tl
      JOIN projects p ON tl.project_id = p.id
      WHERE tl.id = tasks.task_list_id
        AND user_has_permission(auth.uid(), p.team_id, 'delete', 'task')
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_resource ON role_permissions(permission, resource);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);
