-- Migration: Add new fields to manga table
-- Run this on existing database to add genres, author, artist, year columns

-- Add new columns if they don't exist
ALTER TABLE manga ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}';
ALTER TABLE manga ADD COLUMN IF NOT EXISTS author VARCHAR(255);
ALTER TABLE manga ADD COLUMN IF NOT EXISTS artist VARCHAR(255);
ALTER TABLE manga ADD COLUMN IF NOT EXISTS year INTEGER;

-- Update existing sample data with realistic values
UPDATE manga SET
    genres = ARRAY['Action', 'Adventure', 'Fantasy'],
    author = 'Eiichiro Oda',
    artist = 'Eiichiro Oda',
    year = 1997
WHERE slug = 'one-piece';

UPDATE manga SET
    genres = ARRAY['Action', 'Adventure', 'Martial Arts'],
    author = 'Masashi Kishimoto',
    artist = 'Masashi Kishimoto',
    year = 1999
WHERE slug = 'naruto';

UPDATE manga SET
    genres = ARRAY['Action', 'Drama', 'Horror'],
    author = 'Hajime Isayama',
    artist = 'Hajime Isayama',
    year = 2009
WHERE slug = 'attack-on-titan';
