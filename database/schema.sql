-- Database schema for manga reader application
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create manga table
CREATE TABLE manga (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chapters table
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manga_id UUID REFERENCES manga(id) ON DELETE CASCADE,
    chapter_number DECIMAL(10, 2) NOT NULL,
    title VARCHAR(255),
    page_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(manga_id, chapter_number)
);

-- Create chapter_pages table
CREATE TABLE chapter_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    image_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, page_number)
);

-- Create indexes for better performance
CREATE INDEX idx_manga_slug ON manga(slug);
CREATE INDEX idx_manga_status ON manga(status);
CREATE INDEX idx_chapters_manga ON chapters(manga_id);
CREATE INDEX idx_chapters_number ON chapters(manga_id, chapter_number);
CREATE INDEX idx_pages_chapter ON chapter_pages(chapter_id);
CREATE INDEX idx_pages_number ON chapter_pages(chapter_id, page_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for manga table
CREATE TRIGGER update_manga_updated_at
    BEFORE UPDATE ON manga
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO manga (title, slug, description, status) VALUES
    ('One Piece', 'one-piece', 'The adventures of Monkey D. Luffy and his crew in search of the legendary One Piece treasure.', 'ongoing'),
    ('Naruto', 'naruto', 'The story of Naruto Uzumaki, a young ninja who seeks recognition from his peers and dreams of becoming the Hokage.', 'completed'),
    ('Attack on Titan', 'attack-on-titan', 'Humanity fights for survival against giant humanoid Titans.', 'completed');

-- Get manga IDs for sample chapters
DO $$
DECLARE
    one_piece_id UUID;
    naruto_id UUID;
    aot_id UUID;
    chapter_id UUID;
BEGIN
    SELECT id INTO one_piece_id FROM manga WHERE slug = 'one-piece';
    SELECT id INTO naruto_id FROM manga WHERE slug = 'naruto';
    SELECT id INTO aot_id FROM manga WHERE slug = 'attack-on-titan';

    -- Insert sample chapters for One Piece
    INSERT INTO chapters (manga_id, chapter_number, title, page_count) VALUES
        (one_piece_id, 1, 'Romance Dawn', 20),
        (one_piece_id, 2, 'They Call Him "Straw Hat Luffy"', 18);

    -- Insert sample chapters for Naruto
    INSERT INTO chapters (manga_id, chapter_number, title, page_count) VALUES
        (naruto_id, 1, 'Uzumaki Naruto!', 22),
        (naruto_id, 2, 'The Worst Client', 19);

    -- Insert sample chapters for Attack on Titan
    INSERT INTO chapters (manga_id, chapter_number, title, page_count) VALUES
        (aot_id, 1, 'To You, in 2000 Years', 45),
        (aot_id, 2, 'That Day', 40);
END $$;