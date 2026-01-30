-- ============================================================================
-- MANUAL MEMBER SETUP & ACTIVATION SCRIPT
-- ============================================================================
-- Projekt: Monday-Ease
-- Cél: Member-ek manuális aktiválása és board access beállítása
--       (az email invite flow megkerülése)
--
-- Használat:
--   1. Nyisd meg a Supabase SQL Editor-t
--   2. Futtasd az ELLENŐRZŐ QUERY-ket (Section 1-2) először
--   3. Az eredmények alapján uncomment-eld a szükséges UPDATE/INSERT-eket
--   4. Futtasd a módosító statement-eket EGYENKÉNT
--
-- Organization: ae91a174-378a-4058-a37e-be2536b4228d
-- ============================================================================


-- ============================================================================
-- SECTION 1: ELLENŐRZŐ QUERY - Összes member listázása
-- ============================================================================
-- Futtasd ELŐSZÖR hogy lásd a jelenlegi állapotot.

SELECT
  om.id AS member_id,
  om.email,
  om.display_name,
  om.role,
  om.status,
  om.user_id,
  om.invited_at,
  om.joined_at
FROM organization_members om
WHERE om.organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
ORDER BY om.status, om.email;


-- ============================================================================
-- SECTION 2: ELLENŐRZŐ QUERY - Member board access-ek listázása
-- ============================================================================
-- Megmutatja melyik member-nek milyen board access-e van.

SELECT
  om.email,
  om.display_name,
  om.status AS member_status,
  bc.board_name,
  bc.id AS board_config_id,
  mba.filter_value,
  mba.id AS access_id
FROM organization_members om
LEFT JOIN member_board_access mba ON mba.member_id = om.id
LEFT JOIN board_configs bc ON bc.id = mba.board_config_id
WHERE om.organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
ORDER BY om.email, bc.board_name;


-- ============================================================================
-- SECTION 3: ELÉRHETŐ BOARD CONFIG-OK LISTÁZÁSA
-- ============================================================================
-- Hasznos ha board access-t akarsz hozzáadni, látod a board_config_id-kat.

SELECT
  id AS board_config_id,
  board_name,
  monday_board_id,
  filter_column_name,
  filter_column_type,
  is_active
FROM board_configs
WHERE organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
ORDER BY board_name;


-- ============================================================================
-- SECTION 4: PENDING MEMBER AKTIVÁLÁSA
-- ============================================================================
-- Ha a Section 1 query-ben látsz 'pending' státuszú member-t,
-- uncomment-eld az alábbi UPDATE-et és cseréld ki az email-t.
--
-- FONTOS: A user_id-nak a Supabase Auth-ban már léteznie kell!
--         (A user regisztráljon / jelentkezzen be legalább egyszer)

-- UPDATE organization_members
-- SET
--   status = 'active',
--   joined_at = now()
-- WHERE organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
--   AND email = 'CSERELD_KI@example.com'
--   AND status = 'pending';

-- Példa: ha vigreka7@gmail.com pending lenne:
-- UPDATE organization_members
-- SET
--   status = 'active',
--   joined_at = now()
-- WHERE organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
--   AND email = 'vigreka7@gmail.com'
--   AND status = 'pending';


-- ============================================================================
-- SECTION 5: ÖSSZES PENDING MEMBER AKTIVÁLÁSA EGYSZERRE
-- ============================================================================
-- Ha az ÖSSZES pending member-t aktiválni akarod az organization-ben.
-- Óvatosan használd!

-- UPDATE organization_members
-- SET
--   status = 'active',
--   joined_at = now()
-- WHERE organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
--   AND status = 'pending';


-- ============================================================================
-- SECTION 6: BOARD ACCESS HOZZÁADÁSA MEGLÉVŐ MEMBER-HEZ
-- ============================================================================
-- Ha egy member-nek NINCS board access-e (Section 2 NULL-okat mutat),
-- adj hozzá egyet az alábbi INSERT-tel.
--
-- Szükséges értékek:
--   - member_id:       Section 1 query-ből (om.member_id oszlop)
--   - board_config_id: Section 3 query-ből (pl. Deals = a93d47fc-20dd-4e73-8daa-ffa1a5e9cb33)
--   - filter_value:    A Monday.com-ban megjelenő szűrő érték (pl. személy neve)

-- INSERT INTO member_board_access (member_id, board_config_id, filter_value)
-- VALUES (
--   'MEMBER_ID_IDE',                              -- member_id a Section 1-ből
--   'a93d47fc-20dd-4e73-8daa-ffa1a5e9cb33',       -- Deals board config
--   'Szűrő Érték'                                 -- pl. a member neve ahogy a Monday-ban szerepel
-- );

-- Példa: vigreka7@gmail.com hozzáadása a Deals board-hoz
-- (a member_id-t a Section 1 query-ből kell kiolvasni!)
-- INSERT INTO member_board_access (member_id, board_config_id, filter_value)
-- VALUES (
--   'IDE_JON_A_MEMBER_ID',                         -- vigreka7 member_id-ja
--   'a93d47fc-20dd-4e73-8daa-ffa1a5e9cb33',        -- Deals board
--   'Réka Víg'                                     -- filter érték (Monday.com-ban lévő név)
-- );


-- ============================================================================
-- SECTION 7: ÚJ MEMBER LÉTREHOZÁSA (TEMPLATE)
-- ============================================================================
-- Ha teljesen új member-t kell hozzáadni aki még NINCS az organization_members-ben.
--
-- Előfeltétel:
--   A user-nek ELŐBB regisztrálnia kell a Supabase Auth-ban (sign up),
--   hogy legyen user_id-ja. A user_id az auth.users táblából jön.
--
-- Ellenőrizd előbb hogy a user létezik-e az auth rendszerben:

-- SELECT id, email FROM auth.users WHERE email = 'uj.member@example.com';

-- Ha létezik, hozd létre a member-t:
-- INSERT INTO organization_members (
--   organization_id,
--   user_id,
--   email,
--   display_name,
--   role,
--   status,
--   invited_at,
--   joined_at
-- ) VALUES (
--   'ae91a174-378a-4058-a37e-be2536b4228d',       -- organization
--   'AUTH_USER_ID_IDE',                             -- auth.users.id
--   'uj.member@example.com',                       -- email
--   'Új Member Neve',                              -- display_name
--   'member',                                      -- role: 'owner' | 'admin' | 'member'
--   'active',                                      -- közvetlenül aktívra (kikerüli az invite flow-t)
--   now(),                                         -- invited_at
--   now()                                          -- joined_at
-- );

-- Ezután adj hozzá board access-t a Section 6 alapján!


-- ============================================================================
-- SECTION 8: ELLENŐRZÉS MÓDOSÍTÁS UTÁN
-- ============================================================================
-- Futtasd ÚJRA a Section 1 és 2 query-ket hogy ellenőrizd a változásokat.
-- Gyors ellenőrzés:

SELECT
  om.email,
  om.status,
  om.role,
  count(mba.id) AS board_access_count
FROM organization_members om
LEFT JOIN member_board_access mba ON mba.member_id = om.id
WHERE om.organization_id = 'ae91a174-378a-4058-a37e-be2536b4228d'
GROUP BY om.id, om.email, om.status, om.role
ORDER BY om.email;
