do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'round_of_32'
      and enumtypid = 'match_stage'::regtype
  ) then
    alter type match_stage add value 'round_of_32' after 'group';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'third_place'
      and enumtypid = 'match_stage'::regtype
  ) then
    alter type match_stage add value 'third_place' after 'semi_final';
  end if;
end $$;

alter table public.predictions
  add column if not exists predicted_penalty_winner text;

alter table public.predictions
  drop constraint if exists predictions_predicted_penalty_winner_check;

alter table public.predictions
  add constraint predictions_predicted_penalty_winner_check
  check (predicted_penalty_winner in ('home', 'away'));

alter table public.prediction_scores
  add column if not exists bonus_points integer not null default 0;
