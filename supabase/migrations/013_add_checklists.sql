-- Checklist templates (admin-created)
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items within a checklist template
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links tasks to checklists with completion tracking
CREATE TABLE task_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE RESTRICT,
  item_completions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, checklist_id)
);

-- Indexes for performance
CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_task_checklists_task_id ON task_checklists(task_id);
CREATE INDEX idx_task_checklists_checklist_id ON task_checklists(checklist_id);

-- Enable RLS
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

-- Checklists: admins can manage, all authenticated users can read
CREATE POLICY "Admins can manage checklists" ON checklists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read checklists" ON checklists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Checklist items: admins can manage, all authenticated users can read
CREATE POLICY "Admins can manage checklist items" ON checklist_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read checklist items" ON checklist_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Task checklists: admins can manage, all authenticated users can read and update completions
CREATE POLICY "Admins can manage task checklists" ON task_checklists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can read task checklists" ON task_checklists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update task checklist completions" ON task_checklists
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Trigger to update updated_at on task_checklists
CREATE OR REPLACE FUNCTION update_task_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_checklist_updated_at
  BEFORE UPDATE ON task_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_task_checklist_updated_at();
