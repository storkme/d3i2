# d3i2

## Operation
1. Scrape a leaderboard class page for all 1000 heroes.
2. For each hero, hit up the profile page on the d3 api.
3. For each fetched profile, find the most suitable hero.
4. For each hero, hit up the hero page.
5. Filter out heroes with skill or item slots empty.
6. Insert the hero record into the database.
7. For each hero, fetch all of the item data.
8. Insert each item record into the database.