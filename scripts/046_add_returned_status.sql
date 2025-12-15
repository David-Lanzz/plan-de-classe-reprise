-- Add returned status support to sub_room_proposals
-- This allows teachers to send proposals back to delegates for modifications

-- Update status check constraint to include 'returned'
ALTER TABLE sub_room_proposals 
DROP CONSTRAINT IF EXISTS sub_room_proposals_status_check;

ALTER TABLE sub_room_proposals
ADD CONSTRAINT sub_room_proposals_status_check 
CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'returned'));

-- Ensure teacher_comments column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sub_room_proposals' 
    AND column_name = 'teacher_comments'
  ) THEN
    ALTER TABLE sub_room_proposals ADD COLUMN teacher_comments TEXT;
  END IF;
END $$;

-- Add index on is_submitted for faster filtering
CREATE INDEX IF NOT EXISTS idx_sub_room_proposals_is_submitted 
ON sub_room_proposals(is_submitted);

-- Add composite index for teacher queries
CREATE INDEX IF NOT EXISTS idx_sub_room_proposals_teacher_submitted
ON sub_room_proposals(teacher_id, is_submitted);

COMMENT ON COLUMN sub_room_proposals.teacher_comments IS 'Comments from teacher when returning a proposal for modifications';
COMMENT ON COLUMN sub_room_proposals.is_submitted IS 'False for drafts, true for submitted proposals visible to teachers';
