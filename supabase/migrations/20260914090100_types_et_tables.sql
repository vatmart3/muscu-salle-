-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — schéma initial
-- Types, tables, index. La RLS est activée ici, les policies arrivent dans
-- la migration 20260914090300_rls.sql.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto" with schema extensions;

-- ───────────────────────────── Types ─────────────────────────────

create type public.objectif as enum ('masse', 'seche', 'force', 'endurance', 'hyrox');
create type public.niveau as enum ('debutant', 'intermediaire', 'avance');
create type public.sexe as enum ('homme', 'femme', 'non_precise');
create type public.unite as enum ('kg', 'lb');
create type public.role_membre as enum ('membre', 'admin');
create type public.type_exercice as enum ('charge', 'poids_du_corps', 'temps', 'distance');
create type public.type_serie as enum ('normale', 'echauffement', 'degressive', 'echec');
create type public.statut_seance as enum ('en_cours', 'terminee', 'abandonnee');
create type public.type_record as enum ('charge_max', '1rm_estime', 'volume_max', 'reps_max');
create type public.angle_photo as enum ('face', 'profil', 'dos');
create type public.theme_interface as enum ('clair', 'sombre');

-- ───────────────────────────── Profils ─────────────────────────────

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  prenom              text not null check (char_length(trim(prenom)) between 1 and 40),
  avatar_url          text,
  sexe                public.sexe not null default 'non_precise',
  date_naissance      date check (date_naissance > '1900-01-01' and date_naissance < current_date),
  taille_cm           smallint check (taille_cm between 100 and 250),
  objectif            public.objectif,
  niveau              public.niveau,
  jours_par_semaine   smallint not null default 3 check (jours_par_semaine between 1 and 7),
  materiel_dispo      text[] not null default '{}',
  blessures           text check (char_length(blessures) <= 1000),
  unite               public.unite not null default 'kg',
  role                public.role_membre not null default 'membre',
  -- réglages
  theme               public.theme_interface not null default 'clair',
  son_timer           boolean not null default true,
  vibration_timer     boolean not null default true,
  classement_visible  boolean not null default false, -- opt-in strict, §6
  relance_active      boolean not null default false,
  onboarding_termine  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is 'Un profil par membre. Les mesures corporelles vivent dans `mesures`, jamais ici.';
comment on column public.profiles.classement_visible is 'Opt-in du classement de la salle. Faux par défaut : on ne publie personne sans accord.';

-- ───────────────────────── Bibliothèque d''exercices ─────────────────────────

create table public.exercices (
  id                  uuid primary key default gen_random_uuid(),
  nom                 text not null check (char_length(trim(nom)) between 2 and 80),
  slug                text not null,
  groupe_principal    text not null,
  groupes_secondaires text[] not null default '{}',
  equipement          text not null,
  type                public.type_exercice not null default 'charge',
  instructions        text not null default '',
  is_custom           boolean not null default false,
  owner_id            uuid references public.profiles (id) on delete cascade,
  created_at          timestamptz not null default now(),
  -- un exercice global n'a pas de propriétaire, un exercice perso en a un
  constraint exercice_custom_coherent check ((is_custom and owner_id is not null) or (not is_custom and owner_id is null))
);

-- Slug unique parmi les exercices globaux ; unique par membre parmi les persos.
create unique index exercices_slug_global_idx on public.exercices (slug) where owner_id is null;
create unique index exercices_slug_perso_idx on public.exercices (owner_id, slug) where owner_id is not null;
create index exercices_groupe_idx on public.exercices (groupe_principal);
create index exercices_owner_idx on public.exercices (owner_id);

-- ───────────────────────────── Programmes ─────────────────────────────

create table public.seances_modeles (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  nom           text not null check (char_length(trim(nom)) between 1 and 60),
  description   text check (char_length(description) <= 500),
  couleur       text not null default 'accent',
  ordre         smallint not null default 0,
  code_partage  text unique,
  created_at    timestamptz not null default now()
);
create index seances_modeles_owner_idx on public.seances_modeles (owner_id, ordre);

create table public.modele_exercices (
  id              uuid primary key default gen_random_uuid(),
  modele_id       uuid not null references public.seances_modeles (id) on delete cascade,
  exercice_id     uuid not null references public.exercices (id) on delete restrict,
  ordre           smallint not null default 0,
  series_cible    smallint not null default 3 check (series_cible between 1 and 20),
  reps_cible      smallint not null default 8 check (reps_cible between 1 and 200),
  repos_secondes  smallint not null default 90 check (repos_secondes between 0 and 900),
  notes           text check (char_length(notes) <= 300)
);
create index modele_exercices_modele_idx on public.modele_exercices (modele_id, ordre);

-- ───────────────────────────── Séances ─────────────────────────────

create table public.seances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  modele_id       uuid references public.seances_modeles (id) on delete set null,
  nom             text not null default 'Séance libre' check (char_length(nom) <= 60),
  demarree_a      timestamptz not null default now(),
  terminee_a      timestamptz,
  duree_secondes  integer check (duree_secondes >= 0),
  volume_total    numeric(10, 2) not null default 0,
  ressenti        smallint check (ressenti between 1 and 5),
  note            text check (char_length(note) <= 1000),
  statut          public.statut_seance not null default 'en_cours',
  created_at      timestamptz not null default now()
);
create index seances_user_date_idx on public.seances (user_id, demarree_a desc);
-- Une seule séance en cours par membre : l'app reprend celle-ci au lancement.
create unique index seances_une_seule_en_cours_idx on public.seances (user_id) where statut = 'en_cours';

create table public.seance_exercices (
  id              uuid primary key default gen_random_uuid(),
  seance_id       uuid not null references public.seances (id) on delete cascade,
  exercice_id     uuid not null references public.exercices (id) on delete restrict,
  ordre           smallint not null default 0,
  repos_secondes  smallint not null default 90 check (repos_secondes between 0 and 900),
  note            text check (char_length(note) <= 500)
);
create index seance_exercices_seance_idx on public.seance_exercices (seance_id, ordre);
create index seance_exercices_exercice_idx on public.seance_exercices (exercice_id);

create table public.series (
  id                  uuid primary key default gen_random_uuid(),
  seance_exercice_id  uuid not null references public.seance_exercices (id) on delete cascade,
  index_serie         smallint not null check (index_serie >= 1),
  poids               numeric(6, 2) check (poids >= 0 and poids <= 1000),
  reps                smallint check (reps >= 0 and reps <= 500),
  secondes            integer check (secondes >= 0),      -- exercices de type `temps`
  metres              numeric(7, 1) check (metres >= 0),  -- exercices de type `distance`
  rpe                 smallint check (rpe between 1 and 10),
  type                public.type_serie not null default 'normale',
  validee             boolean not null default false,
  est_record          boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (seance_exercice_id, index_serie)
);
create index series_seance_exercice_idx on public.series (seance_exercice_id, index_serie);

-- ───────────────────────── Suivi corporel (privé) ─────────────────────────

create table public.mesures (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  date           date not null default current_date,
  poids_kg       numeric(5, 2) check (poids_kg between 20 and 400),
  masse_grasse   numeric(4, 1) check (masse_grasse between 1 and 70),
  tour_bras      numeric(4, 1) check (tour_bras between 10 and 100),
  tour_poitrine  numeric(4, 1) check (tour_poitrine between 40 and 200),
  tour_taille    numeric(4, 1) check (tour_taille between 30 and 200),
  tour_cuisse    numeric(4, 1) check (tour_cuisse between 20 and 130),
  note           text check (char_length(note) <= 500),
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);
create index mesures_user_date_idx on public.mesures (user_id, date desc);

create table public.photos_progres (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  date          date not null default current_date,
  angle         public.angle_photo not null,
  storage_path  text not null unique,
  created_at    timestamptz not null default now()
);
create index photos_progres_user_idx on public.photos_progres (user_id, date desc);

-- ───────────────────────────── Records ─────────────────────────────

create table public.records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  exercice_id  uuid not null references public.exercices (id) on delete cascade,
  type         public.type_record not null,
  valeur       numeric(8, 2) not null,
  poids        numeric(6, 2),
  reps         smallint,
  seance_id    uuid references public.seances (id) on delete set null,
  obtenu_le    timestamptz not null default now(),
  -- un seul record courant par (membre, exercice, type)
  unique (user_id, exercice_id, type)
);
create index records_user_idx on public.records (user_id, obtenu_le desc);

-- ───────────────────────── Accès à la salle ─────────────────────────

create table public.codes_acces (
  code              text primary key check (char_length(code) between 4 and 32),
  actif             boolean not null default true,
  utilisations_max  smallint check (utilisations_max > 0),
  utilisations      smallint not null default 0 check (utilisations >= 0),
  cree_par          uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

-- ───────────────────────── Notifications push ─────────────────────────

create table public.abonnements_push (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index abonnements_push_user_idx on public.abonnements_push (user_id);

-- ───────────────────────── RLS : fermée par défaut ─────────────────────────

alter table public.profiles         enable row level security;
alter table public.exercices        enable row level security;
alter table public.seances_modeles  enable row level security;
alter table public.modele_exercices enable row level security;
alter table public.seances          enable row level security;
alter table public.seance_exercices enable row level security;
alter table public.series           enable row level security;
alter table public.mesures          enable row level security;
alter table public.photos_progres   enable row level security;
alter table public.records          enable row level security;
alter table public.codes_acces      enable row level security;
alter table public.abonnements_push enable row level security;
