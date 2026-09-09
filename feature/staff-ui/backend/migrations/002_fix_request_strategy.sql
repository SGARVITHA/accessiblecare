-- ==============================================================================
-- Migration: 002_fix_request_strategy.sql
-- Description: Correct interpreter_request_groups strategy default from 'BROADCAST' to 'PARALLEL_TOP_N'
-- ==============================================================================

ALTER TABLE interpreter_request_groups
ALTER COLUMN strategy SET DEFAULT 'PARALLEL_TOP_N';
