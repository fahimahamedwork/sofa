-- Drop all tables in reverse dependency order

DROP TABLE IF EXISTS ssh_keys;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS cron_jobs;
DROP TABLE IF EXISTS databases;
DROP TABLE IF EXISTS volumes;
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS env_vars;
DROP TABLE IF EXISTS deployments;
DROP TABLE IF EXISTS apps;
