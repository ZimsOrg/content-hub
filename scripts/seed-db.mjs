import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lP7Grs0LbaMv@ep-lucky-mouse-anrhqpbj-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

// Parse seed data from TS file (strip types)
let code = readFileSync(join(process.cwd(), 'src/lib/seed-data.ts'), 'utf8');
code = code.replace(/import type .*?;/gs, '');
code = code.replace(/:\s*ContentHubData/g, '');
code = code.replace(/:\s*AnalyticsEntry\[\]/g, '');
code = code.replace(/:\s*Post\[\]/g, '');
code = code.replace(/:\s*Idea\[\]/g, '');
code = code.replace(/:\s*Settings/g, '');
code = code.replace(/as const/g, '');
code = code.replace(/export /g, '');

// eval in a function scope that returns the data
const seed = new Function(code + '\nreturn seedContentHubData;')();
console.log(`Ideas: ${seed.ideas.length}, Posts: ${seed.posts.length}, Analytics: ${seed.analytics.length}`);

async function seedDB() {
  // Insert ideas
  for (const idea of seed.ideas) {
    await sql.query(
      `INSERT INTO ideas (id, title, description, platform, post_type, priority, status, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [idea.id, idea.title, idea.description || null, idea.platform, idea.postType, idea.priority, idea.status, idea.tags || [], idea.createdAt, idea.updatedAt]
    );
    console.log(`  ✅ idea: ${idea.title.substring(0, 50)}`);
  }

  // Insert posts
  for (const post of seed.posts) {
    await sql.query(
      `INSERT INTO posts (id, idea_id, title, content, image_url, platform, post_type, scheduled_at, status, approval_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [post.id, post.ideaId || null, post.title, post.content, post.imageUrl || null, post.platform, post.postType, post.scheduledAt, post.status, post.approvalStatus || 'pending', post.createdAt, post.updatedAt]
    );
    console.log(`  ✅ post: ${post.title.substring(0, 50)}`);

    // Insert comments
    for (const comment of (post.comments || [])) {
      await sql.query(
        `INSERT INTO comments (id, post_id, text, author, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [comment.id, post.id, comment.text, comment.author, comment.createdAt]
      );
    }

    // Insert revisions
    for (const rev of (post.revisions || [])) {
      await sql.query(
        `INSERT INTO revisions (id, post_id, content, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [rev.id, post.id, rev.content, rev.createdAt]
      );
    }

    // Insert metrics
    if (post.metrics) {
      await sql.query(
        `INSERT INTO post_metrics (post_id, impressions, comments, reposts, reactions, follower_delta)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (post_id) DO NOTHING`,
        [post.id, post.metrics.impressions || 0, post.metrics.comments || 0, post.metrics.reposts || 0, post.metrics.reactions || 0, post.metrics.followerDelta || 0]
      );
    }
  }

  // Insert analytics
  for (const entry of (seed.analytics || [])) {
    await sql.query(
      `INSERT INTO analytics (date, linkedin_followers, substack_subscribers)
       VALUES ($1, $2, $3)
       ON CONFLICT (date) DO NOTHING`,
      [entry.date, entry.linkedinFollowers || null, entry.substackSubscribers || null]
    );
  }

  // Insert settings
  const settingsEntries = [
    ['theme', seed.settings.theme],
    ['postingSchedule', seed.settings.postingSchedule],
    ['notificationsEnabled', seed.settings.notificationsEnabled],
  ];
  for (const [key, value] of settingsEntries) {
    await sql.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(value)]
    );
  }

  console.log('\n✅ All data seeded!');
}

seedDB().catch(e => console.error('❌ Seed error:', e.message));
