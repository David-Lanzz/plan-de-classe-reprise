-- Fix RLS policies for sub_room_classes table
-- This script can be run multiple times safely

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sub_room_classes in their establishment" ON public.sub_room_classes;
DROP POLICY IF EXISTS "Users can insert sub_room_classes in their establishment" ON public.sub_room_classes;
DROP POLICY IF EXISTS "Users can update sub_room_classes in their establishment" ON public.sub_room_classes;
DROP POLICY IF EXISTS "Users can delete sub_room_classes in their establishment" ON public.sub_room_classes;

-- Recreate policies with correct permissions
CREATE POLICY "Users can view sub_room_classes in their establishment"
  ON public.sub_room_classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_rooms sr
      JOIN public.teacher_classes tc ON sr.id = sub_room_classes.sub_room_id
      WHERE tc.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sub_room_classes in their establishment"
  ON public.sub_room_classes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sub_rooms sr
      WHERE sr.id = sub_room_id
      AND EXISTS (
        SELECT 1 FROM public.teacher_classes tc
        WHERE tc.teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update sub_room_classes in their establishment"
  ON public.sub_room_classes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_rooms sr
      JOIN public.teacher_classes tc ON sr.id = sub_room_classes.sub_room_id
      WHERE tc.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sub_room_classes in their establishment"
  ON public.sub_room_classes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sub_rooms sr
      JOIN public.teacher_classes tc ON sr.id = sub_room_classes.sub_room_id
      WHERE tc.teacher_id = auth.uid()
    )
  );
