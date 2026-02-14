-- Enable Row Level Security on all tables
-- Users are managed by Supabase Auth (auth.users)

-- User profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  political_leaning text default 'centre' check (political_leaning in ('left', 'centre-left', 'centre', 'centre-right', 'right')),
  digest_frequency text default 'weekly' check (digest_frequency in ('daily', 'weekly')),
  last_digest_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Category preferences
create table public.category_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  weight integer default 5 check (weight >= 1 and weight <= 10),
  enabled boolean default true,
  unique(user_id, category)
);

alter table public.category_preferences enable row level security;

create policy "Users can manage own category preferences"
  on public.category_preferences for all
  using (auth.uid() = user_id);

-- Preferred sources
create table public.preferred_sources (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  source_name text not null,
  feed_url text,
  is_writer boolean default false,
  unique(user_id, source_name)
);

alter table public.preferred_sources enable row level security;

create policy "Users can manage own preferred sources"
  on public.preferred_sources for all
  using (auth.uid() = user_id);

-- Digests
create table public.digests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  subtitle text,
  period_start timestamptz,
  period_end timestamptz,
  status text default 'generating' check (status in ('generating', 'ready', 'failed')),
  created_at timestamptz default now()
);

alter table public.digests enable row level security;

create policy "Users can view own digests"
  on public.digests for select
  using (auth.uid() = user_id);

create policy "Users can insert own digests"
  on public.digests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own digests"
  on public.digests for update
  using (auth.uid() = user_id);

-- Digest articles
create table public.digest_articles (
  id uuid default gen_random_uuid() primary key,
  digest_id uuid references public.digests(id) on delete cascade not null,
  title text not null,
  subtitle text,
  summary text,
  full_content text,
  original_url text,
  archive_url text,
  source_name text,
  author text,
  category text,
  importance integer default 5 check (importance >= 1 and importance <= 10),
  image_description text,
  published_at timestamptz,
  position integer default 0
);

alter table public.digest_articles enable row level security;

create policy "Users can view own digest articles"
  on public.digest_articles for select
  using (
    exists (
      select 1 from public.digests
      where digests.id = digest_articles.digest_id
      and digests.user_id = auth.uid()
    )
  );

create policy "Users can insert own digest articles"
  on public.digest_articles for insert
  with check (
    exists (
      select 1 from public.digests
      where digests.id = digest_articles.digest_id
      and digests.user_id = auth.uid()
    )
  );

-- Seed default categories
create or replace function public.seed_default_categories()
returns trigger as $$
begin
  insert into public.category_preferences (user_id, category, weight, enabled) values
    (new.id, 'local', 7, true),
    (new.id, 'national', 8, true),
    (new.id, 'international', 8, true),
    (new.id, 'sport', 5, true),
    (new.id, 'opinion', 4, true),
    (new.id, 'economy', 6, true),
    (new.id, 'technology', 5, true),
    (new.id, 'science', 5, true),
    (new.id, 'travel', 3, false),
    (new.id, 'culture', 4, false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.seed_default_categories();
