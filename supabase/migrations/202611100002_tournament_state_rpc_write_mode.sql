-- The browser calls this state RPC with POST and Supabase/PostgREST assigns
-- STABLE functions a read-only transaction, even for POST. Mark the wrapper
-- VOLATILE so the call can complete in a read-write transaction.
alter function public.draftix_tournament_state(text, text) volatile;

notify pgrst, 'reload schema';
