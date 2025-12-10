-- Verifica il constraint sulla colonna tipo
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'visits'::regclass 
AND contype = 'c';

-- Verifica la struttura della tabella visits
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'visits'
ORDER BY ordinal_position;

