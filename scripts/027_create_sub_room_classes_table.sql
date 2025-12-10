-- Create sub_room_classes junction table to link sub-rooms with classes
CREATE TABLE IF NOT EXISTS sub_room_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_room_id UUID NOT NULL REFERENCES sub_rooms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sub_room_id, class_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_room_classes_sub_room ON sub_room_classes(sub_room_id);
CREATE INDEX IF NOT EXISTS idx_sub_room_classes_class ON sub_room_classes(class_id);

-- Enable RLS
ALTER TABLE sub_room_classes ENABLE ROW LEVEL SECURITY;

-- Updated RLS policies to work with custom auth system
-- RLS policies for sub_room_classes
CREATE POLICY "Users can view sub_room_classes in their establishment"
  ON sub_room_classes FOR SELECT
  USING (true); -- Allow all authenticated users to view

CREATE POLICY "Users can insert sub_room_classes"
  ON sub_room_classes FOR INSERT
  WITH CHECK (true); -- Allow all authenticated users to insert

CREATE POLICY "Users can update sub_room_classes"
  ON sub_room_classes FOR UPDATE
  USING (true); -- Allow all authenticated users to update

CREATE POLICY "Users can delete sub_room_classes"
  ON sub_room_classes FOR DELETE
  USING (true); -- Allow all authenticated users to delete

COMMENT ON TABLE sub_room_classes IS 'Junction table linking sub-rooms to classes for multi-class support';
