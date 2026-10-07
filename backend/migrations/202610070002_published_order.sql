CREATE INDEX posts_published_order ON posts (published_at DESC, id DESC) WHERE status = 'published';
