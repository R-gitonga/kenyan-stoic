CREATE TABLE posts (
    id UUID PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE
        CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
    excerpt TEXT NOT NULL DEFAULT '',
    body_markdown TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('reflection', 'poem', 'other')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT published_timestamp_required CHECK (status <> 'published' OR published_at IS NOT NULL)
);
