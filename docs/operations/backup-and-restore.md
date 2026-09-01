# 💾 Backup & Database Migration Guide

This guide covers backing up your MongoDB database, restoring data, and migrating between servers.

---

## 📦 Backing Up Your Database

To create a complete snapshot of all profiles, accounts, posts, timelines, and scrape history:

### 1-Line Backup Command
```bash
docker exec -t instagram_saved_posts_mongo mongodump --db instagram --archive=/data/db/backup_$(date +%Y%m%d_%H%M%S).archive
```

### Copying the Backup to Your Host Machine
```bash
docker cp instagram_saved_posts_mongo:/data/db/backup_latest.archive ./backup_latest.archive
```

---

## 🔄 Restoring from Backup

To restore an archive into a running container:

```bash
# 1. Copy the archive into the container
docker cp ./backup_latest.archive instagram_saved_posts_mongo:/data/db/backup_restore.archive

# 2. Restore into MongoDB
docker exec -t instagram_saved_posts_mongo mongorestore --db instagram --archive=/data/db/backup_restore.archive --drop
```

---

## 🚚 Migrating to a New Server

1. Run the backup command on your old server.
2. Transfer `backup_latest.archive` and `docker-compose.yml` to the new server via `scp` or `rsync`.
3. Run `docker compose up -d` on the new server.
4. Run the restore command on the new server.
5. All profiles, session cookies, and post archives will be restored seamlessly!
