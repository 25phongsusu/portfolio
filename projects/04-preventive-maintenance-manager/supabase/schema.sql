create type public.maintenance_status as enum ('scheduled','in_progress','completed','overdue');
create table public.equipment (id bigint generated always as identity primary key, name text not null, code text unique not null, location text not null, equipment_type text not null, interval_days integer not null, last_service date, next_service date, health text not null default 'good');
create table public.maintenance_jobs (id bigint generated always as identity primary key, equipment_id bigint references public.equipment(id) on delete cascade, title text not null, due_date date not null, assignee uuid references auth.users(id), status maintenance_status not null default 'scheduled', faults text, replaced_parts text, ai_report text, created_at timestamptz default now());
create table public.checklist_items (id bigint generated always as identity primary key, job_id bigint references public.maintenance_jobs(id) on delete cascade, label text not null, completed boolean not null default false, position integer not null default 0);
create table public.maintenance_photos (id bigint generated always as identity primary key, job_id bigint references public.maintenance_jobs(id) on delete cascade, storage_path text not null, photo_type text check(photo_type in ('before','after')), created_at timestamptz default now());
alter table public.equipment enable row level security;alter table public.maintenance_jobs enable row level security;alter table public.checklist_items enable row level security;alter table public.maintenance_photos enable row level security;
create policy "authenticated equipment" on public.equipment for all to authenticated using (true) with check (true);
create policy "authenticated jobs" on public.maintenance_jobs for all to authenticated using (true) with check (true);
create policy "authenticated checklist" on public.checklist_items for all to authenticated using (true) with check (true);
create policy "authenticated photos" on public.maintenance_photos for all to authenticated using (true) with check (true);
insert into storage.buckets (id,name,public) values ('maintenance-photos','maintenance-photos',false) on conflict do nothing;

