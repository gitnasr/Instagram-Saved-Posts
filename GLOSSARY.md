# Instagram Saved Posts

This context describes a person's archive of Instagram saved posts, the creators represented in it, and the scans used to keep it up to date.

## Language

**Profile**:
A named archive scope for saved posts. It can be associated with one Instagram login session and stays distinct from other profiles.
_Avoid_: Instagram account, creator account

**Account**:
An Instagram creator whose posts appear in a Profile's saved-post archive.
_Avoid_: session account, Profile

**Saved Post**:
An Instagram media item that a person has saved and that belongs to a Profile's archive.
_Avoid_: bookmark

**Scrape Run**:
An attempt to read and update a Profile's saved-post archive and the creator accounts represented in it.
_Avoid_: sync, crawl

**Completed Run**:
A Scrape Run that finished reading the saved-post feed. Only a Completed Run can establish that an Account was absent from that feed.
_Avoid_: partial run

**Absent Account**:
An Account that did not appear in a Profile's feed during a Completed Run. Absence alone does not establish that the creator deleted an Instagram account or made it private.
_Avoid_: deleted account, private account
