import 'dotenv/config';

import pg from 'pg';import 'dotenv/config';

import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {

  await client.connect();async function run() {

  await client.query(`  await client.connect();

    CREATE TABLE IF NOT EXISTS otps (  await client.query(\`

      email VARCHAR(255) PRIMARY KEY,    CREATE TABLE IF NOT EXISTS otps (

      code VARCHAR(6) NOT NULL,      email VARCHAR(255) PRIMARY KEY,

      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,      code VARCHAR(6) NOT NULL,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    );      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

  `);    );

  console.log('OTPs table created.');  \`);

  await client.end();  console.log('OTPs table created.');

}  await client.end();

run();}
run();

