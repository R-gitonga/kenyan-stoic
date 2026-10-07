-- Explicit, optional local samples. These are not the author's real writing.
-- Refuse accidental seeding into an unrelated or production database.
DO $$
BEGIN
    IF current_database() <> 'kenyan_stoic_dev' THEN
        RAISE EXCEPTION 'Development fixtures require kenyan_stoic_dev';
    END IF;
END $$;

INSERT INTO posts (id, slug, title, excerpt, body_markdown, kind, status, published_at)
VALUES
('00000000-0000-4000-8000-000000000001', 'sample-a-morning-pause', 'Sample reflection: A morning pause', 'Development sample — a short reflection for testing the reading page.',
$body$This is **sample writing**, created to test the site. It is not a personal account from the author.

## A small exercise

Before the day gathers speed, pause and ask: what is within my control?

> Attention is something we can practice.

A useful reading space leaves room for a thought to settle.$body$, 'reflection', 'published', '2026-10-07T06:00:00Z'),
('00000000-0000-4000-8000-000000000002', 'sample-between-steps', 'Sample poem: Between steps', 'Development sample — line breaks and stanza spacing.',
$body$Sample poem — not the author's work.

A breath before the road,
a moment before the noise,
a space to choose.

The morning moves.
We take one step.$body$, 'poem', 'published', '2026-10-07T06:05:00Z'),
('00000000-0000-4000-8000-000000000003', 'sample-private-draft', 'Private development draft', 'This draft must never appear publicly.', 'Private fixture body.', 'reflection', 'draft', NULL)
ON CONFLICT DO NOTHING;
