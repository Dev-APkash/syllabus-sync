-- supabase/migrations/0005_course_colors.sql
-- Self-hosted installs apply this automatically (the migrate container). Elsewhere, run it after 0004.
--
-- A colour per course, so deadlines from different courses can be told apart at a glance.
-- Must match COURSE_COLORS in lib/constants.ts and the --course-* tokens in app/globals.css.

alter table public.courses add column color text
  check (color in ('green', 'blue', 'violet', 'rose', 'amber', 'teal', 'orange', 'slate'));

-- Existing courses: hand out the colours in the order each student added their courses.
with ranked as (
  select id, row_number() over (partition by user_id order by created_at, id) as n
  from public.courses
)
update public.courses c
set color = (array['green', 'blue', 'violet', 'rose', 'amber', 'teal', 'orange', 'slate'])[1 + ((r.n - 1) % 8)::int]
from ranked r
where r.id = c.id;

-- New courses: the colour this student uses least (ties go to the first in the list).
-- Runs as the student (security invoker), so RLS limits the count to their own courses.
create function public.pick_course_color()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.color is null then
    select p.color into new.color
    from unnest(array['green', 'blue', 'violet', 'rose', 'amber', 'teal', 'orange', 'slate'])
      with ordinality as p(color, ord)
    left join public.courses c on c.color = p.color and c.user_id = new.user_id
    group by p.color, p.ord
    order by count(c.id), p.ord
    limit 1;
  end if;
  return new;
end;
$$;

create trigger courses_pick_color
  before insert on public.courses
  for each row execute function public.pick_course_color();
