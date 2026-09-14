-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — code d'accès initial
-- Ce code sert à la première inscription, celle de l'administrateur de la
-- salle. Les suivants se créent et se révoquent depuis /admin.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.codes_acces (code, actif, utilisations_max)
values ('FONTE-2026', true, 30)
on conflict (code) do nothing;

-- Promotion du premier membre inscrit au rôle d'administrateur : sans ça,
-- personne ne peut créer de code et la salle se referme sur elle-même.
create or replace function public.promouvoir_premier_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.role = 'admin') then
    update public.profiles set role = 'admin' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_premier_admin
  after insert on public.profiles
  for each row execute function public.promouvoir_premier_membre();
