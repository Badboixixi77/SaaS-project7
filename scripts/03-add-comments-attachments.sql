-- Add comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments for tasks in their teams" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = comments.task_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments for tasks in their teams" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = comments.task_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for attachments
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for tasks in their teams" ON attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = attachments.task_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attachments for tasks in their teams" ON attachments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = attachments.task_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments" ON attachments
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);
