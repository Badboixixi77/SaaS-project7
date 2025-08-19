-- Add analytics tables for tracking productivity metrics
CREATE TABLE IF NOT EXISTS task_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'created', 'updated', 'moved', 'completed', 'commented'
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add time tracking table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- calculated field
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add team analytics summary table (for caching)
CREATE TABLE IF NOT EXISTS team_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_in_progress INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  comments_added INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, date)
);

-- Add RLS policies
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_analytics ENABLE ROW LEVEL SECURITY;

-- Task activities can be viewed by team members
CREATE POLICY "Team members can view task activities" ON task_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = task_activities.task_id AND tm.user_id = auth.uid()
    )
  );

-- Users can create task activities for tasks in their teams
CREATE POLICY "Users can create task activities" ON task_activities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = task_activities.task_id AND tm.user_id = auth.uid()
    )
  );

-- Time entries policies
CREATE POLICY "Team members can view time entries" ON time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = time_entries.task_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own time entries" ON time_entries
  FOR ALL USING (auth.uid() = user_id);

-- Team analytics can be viewed by team members
CREATE POLICY "Team members can view team analytics" ON team_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_analytics.team_id AND tm.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at);
CREATE INDEX IF NOT EXISTS idx_team_analytics_team_id_date ON team_analytics(team_id, date);

-- Function to update duration when time entry is completed
CREATE OR REPLACE FUNCTION update_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_entry_duration_trigger
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entry_duration();

-- Function to log task activities
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, new_values)
    VALUES (NEW.id, NEW.created_by, 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, old_values, new_values)
    VALUES (NEW.id, auth.uid(), 'updated', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();
