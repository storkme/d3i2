# Bunch of queries

Let's pull out some useful data from this shitheap.

## Popular items

```SQL
SELECT COUNT(*) as count, hi.slot, i.name
    FROM hero_items hi
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN items i ON i.id = hi.item_id
    WHERE h.class = 'barbarian'
    GROUP BY hi.slot, i.id
    ORDER BY slot, COUNT(*) DESC;
```

## Popular active skills

```SQL
SELECT COUNT(*) as count, ss.name, sr.name
    FROM hero_skills hs
        INNER JOIN hero h ON hs.hero_id = h.id
        INNER JOIN skills ss ON hs.name = ss.slug
        INNER JOIN skills sr ON hs.rune = sr.slug
    WHERE h.class = 'barbarian'
        AND hs.type = 'skill'
    GROUP BY ss.name, sr.name
    ORDER BY COUNT(*) DESC;
```

## Popular passive skills

```SQL
SELECT COUNT(*) as count, s.name
    FROM hero_skills hs
        INNER JOIN hero h ON hs.hero_id = h.id
        INNER JOIN skills s ON hs.name = s.slug
    WHERE h.class = 'barbarian'
        AND hs.type = 'passive'
    GROUP BY s.name
    ORDER BY COUNT(*) DESC;
```

## Popular legendary gems

```SQL
SELECT COUNT(*) as count, i.name as name
    FROM hero_items hi
        INNER JOIN item_gems ig ON ig.item_id = hi.id
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN items i ON ig.gem_id = i.id
    WHERE h.class = 'barbarian'
        AND ig.rank IS NOT NULL
    GROUP BY i.name
    ORDER BY COUNT(*) DESC;
```