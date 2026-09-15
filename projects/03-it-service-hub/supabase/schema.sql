create type public.user_role as enum ('employee', 'admin');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.priority as enum ('low', 'medium', 'high', 'critical');

create table public.profiles (id uuid primary key references auth.users on delete cascade, full_name text not null, role user_role not null default 'employee');
create table public.tickets (id bigint generated always as identity primary key, requester_id uuid references public.profiles(id), title text not null, description text not null, category text not null, priority priority not null, status ticket_status not null default 'open', assignee_id uuid references public.profiles(id), resolution_summary text, created_at timestamptz not null default now());
create table public.ticket_history (id bigint generated always as identity primary key, ticket_id bigint references public.tickets(id) on delete cascade, actor_id uuid references public.profiles(id), event text not null, created_at timestamptz not null default now());
create table public.assets (id bigint generated always as identity primary key, name text not null, model text not null, serial_number text unique not null, warranty_until date, assigned_to uuid references public.profiles(id), status text not null default 'available');

alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_history enable row level security;
alter table public.assets enable row level security;

create policy "profiles own or admin" on public.profiles for select using (id = auth.uid() or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "tickets own or admin" on public.tickets for select using (requester_id = auth.uid() or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "tickets create own" on public.tickets for insert with check (requester_id = auth.uid());
create policy "assets assigned or admin" on public.assets for select using (assigned_to = auth.uid() or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
