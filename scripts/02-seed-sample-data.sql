-- Insert sample data for testing the Kanban board

-- First, let's create a sample team and user (assuming you have a user already)
-- You'll need to replace the user_id with an actual user ID from your auth.users table

-- Insert sample team
INSERT INTO teams (id, name, description) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Sample Team', 'A sample team for testing the Kanban board')
ON CONFLICT (id) DO NOTHING;

-- Insert sample team member (replace with actual user ID)
-- INSERT INTO team_members (team_id, user_id, role) 
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'YOUR_USER_ID_HERE', 'owner')
-- ON CONFLICT (team_id, user_id) DO NOTHING;

-- Insert sample project
INSERT INTO projects (id, team_id, name, description, status) 
VALUES (
  '660e8400-e29b-41d4-a716-446655440000', 
  '550e8400-e29b-41d4-a716-446655440000', 
  'Sample Project', 
  'A sample project to demonstrate the Kanban board functionality',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample task lists (Kanban columns)
INSERT INTO task_lists (id, project_id, name, position) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'To Do', 0),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', 'In Progress', 1),
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440000', 'Review', 2),
  ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440000', 'Done', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (id, task_list_id, title, description, position, priority) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Setup project structure', 'Initialize the project with proper folder structure and dependencies', 0, 'high'),
  ('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Design user interface', 'Create wireframes and mockups for the main user interface', 1, 'medium'),
  ('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', 'Write documentation', 'Document the API endpoints and user guide', 2, 'low'),
  ('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'Implement authentication', 'Add user login and registration functionality', 0, 'urgent'),
  ('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', 'Build dashboard', 'Create the main dashboard with key metrics', 1, 'high'),
  ('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440003', 'Test user flows', 'Perform end-to-end testing of critical user journeys', 0, 'medium'),
  ('880e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440004', 'Deploy to production', 'Set up production environment and deploy the application', 0, 'high')
ON CONFLICT (id) DO NOTHING;
