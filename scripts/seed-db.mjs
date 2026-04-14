import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function seed() {
  try {
    console.log('Seeding...');
    await sql`DELETE FROM ideas`;
    await sql`INSERT INTO ideas (id, title, description, platform, status) VALUES 
      ('idea-openclaw-projects', '5 Fun Projects Using OpenClaw', 'Tutorial for beginners', 'linkedin', 'ready'),
      ('idea-ai-harness', 'The Case for AI Engineering Harnesses', 'Deep dive on agent swarms', 'substack', 'ready')`;
    console.log('Seeding Done.');
  } catch (e) {
    console.error(e);
  }
}
seed();
