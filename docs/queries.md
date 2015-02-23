# Bunch of queries

Let's pull out some useful data from this shitheap.

## Popular items

```SQL
SELECT COUNT(*) as count, hi.slot, i.name
    FROM hero_items hi
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN items i ON i.id = hi.item_id
    WHERE h.class = 'demon-hunter'
    GROUP BY hi.slot, i.id
    HAVING COUNT(*) > 5
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
    WHERE h.class = 'monk'
        AND hs.type = 'passive'
    GROUP BY s.name
    ORDER BY COUNT(*) DESC;
```

## Popular legendary gems

```SQL
SELECT h.class, COUNT(*) as count, i.name as name
    FROM hero_items hi
        INNER JOIN item_gems ig ON ig.item_id = hi.id
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN items i ON ig.gem_id = i.id
    WHERE ig.rank > 0
    GROUP BY h.class, i.name
    -- HAVING COUNT(*) > 5
    ORDER BY h.class, COUNT(*) DESC;
```

## Items without legendary gems?

Just using this one for debugging, really...

```SQL
SELECT COUNT(*) as count, i.name as name
    FROM hero_items hi
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN items i ON hi.item_id = i.id
    WHERE h.class = 'barbarian'
        AND NOT EXISTS (
                SELECT * FROM item_gems ig WHERE ig.item_id = hi.id
            )
        AND (slot = 'leftFinger' OR slot = 'rightFinger' OR slot = 'neck')
    GROUP BY i.name
    ORDER BY COUNT(*) DESC;
```

## popular item stats by slot

```SQL
SELECT hi.slot, COUNT(*) as count, ia.name as name, AVG(ia.val_min)
    FROM hero_items hi
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN item_attrs ia on hi.id = ia.item_id
        WHERE h.class = 'demon-hunter'
    GROUP BY h.class, hi.slot, ia.name
    HAVING COUNT(*) > 5
    ORDER BY h.class, hi.slot, COUNT(*) DESC;
```

## Popular rings

```SQL
SELECT COUNT(*) as count, i.name as name
    FROM hero_items hi
        INNER JOIN hero h ON hi.hero_id = h.id
        INNER JOIN items i ON hi.item_id = i.id
    WHERE h.class = 'monk'
        AND (slot = 'leftFinger' OR slot = 'rightFinger')
    GROUP BY i.name
    ORDER BY COUNT(*) DESC;
```