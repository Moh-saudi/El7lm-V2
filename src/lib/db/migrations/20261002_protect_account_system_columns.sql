do $$
declare
  t text;
  c text;
  protected_columns text[] := array[
    'email','firebaseEmail','originalEmail','oldEmail','previousEmail',
    'emailUpdated','emailUpdatedAt','emailMigratedAt','emailMigrationStatus',
    'isPremium','subscriptionStatus',
    'isVerified','isVerifiedLocal','phoneVerified',
    'organizationId','organizationType','organizationCode','organizationApprovedBy',
    'organizationJoinedAt','organizationName','joinedViaReferral',
    'joinRequestId','joinRequestStatus',
    'googleId','isGoogleUser','supabase_uid',
    'unifiedPassword','needsPasswordChange','lastPasswordChange','passwordLastUpdated',
    'lastLogin','last_login','lastLoginIP','lastLoginLocation','lastLoginDevice','loginCount'
  ];
begin
  foreach t in array array['users','players','clubs','academies','agents','trainers','marketers']
  loop
    foreach c in array protected_columns
    loop
      if exists (
        select 1
        from information_schema.columns
        where table_schema='public'
          and table_name=t
          and column_name=c
      ) then
        execute format('revoke update (%I) on table public.%I from authenticated', c, t);
      end if;
    end loop;
  end loop;
end
$$;
