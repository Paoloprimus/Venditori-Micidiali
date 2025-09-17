
\restrict aiyzBFmGV7OpkcRaOcT4T1cIPJfFbf012aH7NyC4mg9DyRubLyNKAv1i6yEhZ5T


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."_norm_txt"("t" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select unaccent(lower(coalesce(t,'')))
$$;


ALTER FUNCTION "public"."_norm_txt"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (select 1 from public.global_admins ga where ga.user_id = uid);
$$;


ALTER FUNCTION "public"."is_global_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_notes"("query_embedding" "public"."vector", "match_count" integer, "account" "uuid") RETURNS TABLE("note_id" "uuid", "similarity" double precision)
    LANGUAGE "sql" STABLE PARALLEL SAFE
    AS $$
  select n.id as note_id,
         1 - (ne.embedding <=> query_embedding) as similarity
  from public.notes_embeddings ne
  join public.notes n on n.id = ne.note_id
  where (account is null or n.account_id = account)
  order by ne.embedding <-> query_embedding
  limit coalesce(match_count, 5)
$$;


ALTER FUNCTION "public"."match_notes"("query_embedding" "public"."vector", "match_count" integer, "account" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_count_catalog"("term" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select count(*)::int
  from public.products p
  where
    (
      _norm_txt(p.title)                like '%' || _norm_txt(term) || '%' or
      _norm_txt(p.descrizione_articolo) like '%' || _norm_txt(term) || '%' or
      _norm_txt(p.sku)                  like '%' || _norm_txt(term) || '%' or
      _norm_txt(p.codice)               like '%' || _norm_txt(term) || '%'
    )
    and coalesce(p.is_active, true) = true
$$;


ALTER FUNCTION "public"."product_count_catalog"("term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_price_and_discount"("term" "text") RETURNS TABLE("price" numeric, "discount" integer)
    LANGUAGE "sql" STABLE
    AS $$
  with matches as (
    select *
    from public.products p
    where
      (
        _norm_txt(p.title)                like '%' || _norm_txt(term) || '%' or
        _norm_txt(p.descrizione_articolo) like '%' || _norm_txt(term) || '%' or
        _norm_txt(p.sku)                  like '%' || _norm_txt(term) || '%' or
        _norm_txt(p.codice)               like '%' || _norm_txt(term) || '%'
      )
      and coalesce(p.is_active, true) = true
  ),
  discounts as (
    select
      base_price,
      -- priorità: sconto_fattura (numeric)
      coalesce(
        -- usa sconto_fattura se non nullo
        nullif(sconto_fattura, null),
        -- fallback: estrai le cifre da sconto_merce (es. "10%") -> int
        nullif(regexp_replace(coalesce(sconto_merce,''), '[^0-9]+', '', 'g'), '')
            ::int
      ) as disc
    from matches
  )
  select
    coalesce(min(base_price), 0)::numeric as price,
    coalesce(max(disc), 0)::int          as discount
  from discounts;
$$;


ALTER FUNCTION "public"."product_price_and_discount"("term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_stock_sum"("term" "text") RETURNS integer
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(p.giacenza),0)::int
  from public.products p
  where
    (
      _norm_txt(p.title)                like '%' || _norm_txt(term) || '%' or
      _norm_txt(p.descrizione_articolo) like '%' || _norm_txt(term) || '%' or
      _norm_txt(p.sku)                  like '%' || _norm_txt(term) || '%' or
      _norm_txt(p.codice)               like '%' || _norm_txt(term) || '%'
    )
    and coalesce(p.is_active, true) = true
$$;


ALTER FUNCTION "public"."product_stock_sum"("term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."standard_shortlist"("q" "text", "k" integer DEFAULT 10) RETURNS TABLE("intent_key" "text", "text" "text", "score" real)
    LANGUAGE "sql" STABLE
    AS $$
  with params as (
    select
      unaccent(lower(coalesce(q, ''))) as qn,
      coalesce(k, 10) as kk
  )
  select
    u.intent_key,
    u.text,
    -- punteggio di similarità (0..1) su stringhe normalizzate
    similarity(unaccent(lower(u.text)), (select qn from params)) as score
  from public.standard_utterances u, params
  where u.active = true
    -- filtro “largo”: o trigram match, o ILIKE (aiuta quando q è corto)
    and (
      unaccent(lower(u.text)) % (select qn from params)  -- trigram operator
      or unaccent(lower(u.text)) ilike '%' || (select qn from params) || '%'
    )
  order by score desc, u.weight desc, u.created_at desc
  limit (select kk from params);
$$;


ALTER FUNCTION "public"."standard_shortlist"("q" "text", "k" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end $$;


ALTER FUNCTION "public"."touch_conversation"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_monthly_volume" (
    "account_id" "uuid" NOT NULL,
    "month" "date" NOT NULL,
    "amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."account_monthly_volume" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "custom" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "note" "text",
    "ultimo_esito" "text",
    "ultimo_esito_at" timestamp with time zone,
    "prodotti" "text",
    "volume_attuale" numeric,
    "volume_attuale_at" timestamp with time zone,
    "postal_code" "text",
    "city" "text",
    "street" "text",
    "street_number" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "custom" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_fields_registry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "help" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "custom_fields_registry_entity_check" CHECK (("entity" = ANY (ARRAY['accounts'::"text", 'contacts'::"text", 'products'::"text"]))),
    CONSTRAINT "custom_fields_registry_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'number'::"text", 'boolean'::"text", 'date'::"text", 'enum'::"text"])))
);


ALTER TABLE "public"."custom_fields_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."global_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "contact_id" "uuid",
    "body" "text" NOT NULL,
    "custom" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes_embeddings" (
    "note_id" "uuid" NOT NULL,
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."notes_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" "text",
    "title" "text" NOT NULL,
    "base_price" numeric,
    "custom" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "codice" "text" NOT NULL,
    "descrizione_articolo" "text" NOT NULL,
    "unita_misura" "text",
    "giacenza" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sconto_merce" "text",
    "sconto_fattura" numeric,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "products_sconto_fattura_check" CHECK ((("sconto_fattura" >= (0)::numeric) AND ("sconto_fattura" <= (100)::numeric)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."codice" IS 'Codice articolo (univoco)';



COMMENT ON COLUMN "public"."products"."descrizione_articolo" IS 'Descrizione commerciale del prodotto';



COMMENT ON COLUMN "public"."products"."unita_misura" IS 'UM (es. PZ, SC, KG2,5, ecc.)';



COMMENT ON COLUMN "public"."products"."giacenza" IS 'Quantità disponibile';



COMMENT ON COLUMN "public"."products"."sconto_merce" IS 'Descrizione breve promozione merce (es. 1 cassa ogni 10)';



COMMENT ON COLUMN "public"."products"."sconto_fattura" IS 'Percentuale sconto applicata in fattura (0–100)';



COMMENT ON COLUMN "public"."products"."is_active" IS 'Flag di attivazione prodotto (soft-delete)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "role" "text" DEFAULT 'venditore'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'venditore'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "contact_id" "uuid",
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."standard_intents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "category" "text" NOT NULL,
    "slots" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "confirmation_template" "text" NOT NULL,
    "response_template" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "standard_intents_category_check" CHECK (("category" = ANY (ARRAY['prodotti'::"text", 'clienti'::"text", 'report'::"text"])))
);


ALTER TABLE "public"."standard_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."standard_utterances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intent_key" "text" NOT NULL,
    "text" "text" NOT NULL,
    "lang" "text" DEFAULT 'it'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "weight" smallint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."standard_utterances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."synonyms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity" "text" NOT NULL,
    "alias" "text" NOT NULL,
    "canonical" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "synonyms_entity_check" CHECK (("entity" = ANY (ARRAY['product_term'::"text", 'cliente_alias'::"text", 'periodo'::"text", 'metrica'::"text"])))
);


ALTER TABLE "public"."synonyms" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_monthly_volume"
    ADD CONSTRAINT "account_monthly_volume_pkey" PRIMARY KEY ("account_id", "month");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_fields_registry"
    ADD CONSTRAINT "custom_fields_registry_entity_field_key_key" UNIQUE ("entity", "field_key");



ALTER TABLE ONLY "public"."custom_fields_registry"
    ADD CONSTRAINT "custom_fields_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_admins"
    ADD CONSTRAINT "global_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes_embeddings"
    ADD CONSTRAINT "notes_embeddings_pkey" PRIMARY KEY ("note_id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_codice_unique_constraint" UNIQUE ("codice");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standard_intents"
    ADD CONSTRAINT "standard_intents_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."standard_intents"
    ADD CONSTRAINT "standard_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standard_utterances"
    ADD CONSTRAINT "standard_utterances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."synonyms"
    ADD CONSTRAINT "synonyms_entity_alias_key" UNIQUE ("entity", "alias");



ALTER TABLE ONLY "public"."synonyms"
    ADD CONSTRAINT "synonyms_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounts_city_ci" ON "public"."accounts" USING "btree" ("lower"("city"));



CREATE INDEX "idx_accounts_name_ci" ON "public"."accounts" USING "btree" ("lower"("name"));



CREATE INDEX "idx_contacts_account" ON "public"."contacts" USING "btree" ("account_id");



CREATE INDEX "idx_conversations_user_id" ON "public"."conversations" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_user_updated_at" ON "public"."conversations" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_messages_conv_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_notes_account" ON "public"."notes" USING "btree" ("account_id");



CREATE INDEX "idx_proposals_account" ON "public"."proposals" USING "btree" ("account_id");



CREATE INDEX "idx_synonyms_alias_trgm" ON "public"."synonyms" USING "gin" ("alias" "public"."gin_trgm_ops");



CREATE INDEX "idx_utterances_text_trgm" ON "public"."standard_utterances" USING "gin" ("text" "public"."gin_trgm_ops");



CREATE INDEX "notes_embeddings_cosine_idx" ON "public"."notes_embeddings" USING "ivfflat" ("embedding" "public"."vector_cosine_ops");



CREATE UNIQUE INDEX "one_admin_only" ON "public"."profiles" USING "btree" ("role") WHERE ("role" = 'admin'::"text");



CREATE UNIQUE INDEX "products_codice_unique_idx" ON "public"."products" USING "btree" ("lower"("codice"));



CREATE INDEX "products_descrizione_idx" ON "public"."products" USING "btree" ("lower"("descrizione_articolo"));



CREATE OR REPLACE TRIGGER "conversations_set_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_accounts" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_intents_set_updated_at" BEFORE UPDATE ON "public"."standard_intents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_messages_touch_conversation" AFTER INSERT OR UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."touch_conversation"();



CREATE OR REPLACE TRIGGER "trg_products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."account_monthly_volume"
    ADD CONSTRAINT "account_monthly_volume_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notes_embeddings"
    ADD CONSTRAINT "notes_embeddings_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."standard_utterances"
    ADD CONSTRAINT "standard_utterances_intent_key_fkey" FOREIGN KEY ("intent_key") REFERENCES "public"."standard_intents"("key") ON DELETE CASCADE;



CREATE POLICY "acc_modify_own" ON "public"."accounts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "acc_select_own" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."account_monthly_volume" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow all (service role bypasses anyway)" ON "public"."messages" USING (true) WITH CHECK (true);



CREATE POLICY "amv_all_via_account" ON "public"."account_monthly_volume" USING ((EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "account_monthly_volume"."account_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "account_monthly_volume"."account_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "cfr_read_all" ON "public"."custom_fields_registry" FOR SELECT USING (true);



CREATE POLICY "cfr_write_all" ON "public"."custom_fields_registry" USING (true) WITH CHECK (true);



ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contacts_read_via_account" ON "public"."contacts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "contacts"."account_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "contacts_write_via_account" ON "public"."contacts" USING ((EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "contacts"."account_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "contacts"."account_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "conv_modify_own" ON "public"."conversations" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "conv_select_own" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_delete_own" ON "public"."conversations" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "conversations_insert_own" ON "public"."conversations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "conversations_select_own" ON "public"."conversations" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "conversations_update_own" ON "public"."conversations" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."custom_fields_registry" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "each user manages own profile" ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "emb_read_via_note" ON "public"."notes_embeddings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."notes" "n"
     JOIN "public"."accounts" "a" ON (("a"."id" = "n"."account_id")))
  WHERE (("n"."id" = "notes_embeddings"."note_id") AND ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "emb_write_via_note" ON "public"."notes_embeddings" USING ((EXISTS ( SELECT 1
   FROM ("public"."notes" "n"
     JOIN "public"."accounts" "a" ON (("a"."id" = "n"."account_id")))
  WHERE (("n"."id" = "notes_embeddings"."note_id") AND ("a"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."notes" "n"
     JOIN "public"."accounts" "a" ON (("a"."id" = "n"."account_id")))
  WHERE (("n"."id" = "notes_embeddings"."note_id") AND ("a"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."global_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "global_admins_self" ON "public"."global_admins" FOR SELECT USING ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "global_admins_write" ON "public"."global_admins" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "intents_read" ON "public"."standard_intents" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "intents_write" ON "public"."standard_intents" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "msg_modify_own" ON "public"."messages" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "msg_select_own" ON "public"."messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes_embeddings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notes_read_via_account" ON "public"."notes" FOR SELECT USING ((("account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "notes"."account_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "notes_write_via_account" ON "public"."notes" USING ((("account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "notes"."account_id") AND ("a"."user_id" = "auth"."uid"())))))) WITH CHECK ((("account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "notes"."account_id") AND ("a"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_read_all" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "products_select_auth" ON "public"."products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "products_write_admin" ON "public"."products" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_read_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "props_read_via_account" ON "public"."proposals" FOR SELECT USING ((("account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "proposals"."account_id") AND ("a"."user_id" = "auth"."uid"()))))));



CREATE POLICY "props_write_via_account" ON "public"."proposals" USING ((("account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "proposals"."account_id") AND ("a"."user_id" = "auth"."uid"())))))) WITH CHECK ((("account_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."accounts" "a"
  WHERE (("a"."id" = "proposals"."account_id") AND ("a"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."standard_intents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standard_utterances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."synonyms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "synonyms_read" ON "public"."synonyms" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "synonyms_write" ON "public"."synonyms" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "utterances_read" ON "public"."standard_utterances" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "utterances_write" ON "public"."standard_utterances" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."_norm_txt"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_norm_txt"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_norm_txt"("t" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_notes"("query_embedding" "public"."vector", "match_count" integer, "account" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_notes"("query_embedding" "public"."vector", "match_count" integer, "account" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_notes"("query_embedding" "public"."vector", "match_count" integer, "account" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."product_count_catalog"("term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."product_count_catalog"("term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_count_catalog"("term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."product_price_and_discount"("term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."product_price_and_discount"("term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_price_and_discount"("term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."product_stock_sum"("term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."product_stock_sum"("term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_stock_sum"("term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."standard_shortlist"("q" "text", "k" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."standard_shortlist"("q" "text", "k" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."standard_shortlist"("q" "text", "k" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."standard_shortlist"("q" "text", "k" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_conversation"() TO "service_role";



GRANT ALL ON TABLE "public"."account_monthly_volume" TO "anon";
GRANT ALL ON TABLE "public"."account_monthly_volume" TO "authenticated";
GRANT ALL ON TABLE "public"."account_monthly_volume" TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."custom_fields_registry" TO "anon";
GRANT ALL ON TABLE "public"."custom_fields_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_fields_registry" TO "service_role";



GRANT ALL ON TABLE "public"."global_admins" TO "anon";
GRANT ALL ON TABLE "public"."global_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."global_admins" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."notes_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."notes_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."notes_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."proposals" TO "anon";
GRANT ALL ON TABLE "public"."proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."proposals" TO "service_role";



GRANT ALL ON TABLE "public"."standard_intents" TO "anon";
GRANT ALL ON TABLE "public"."standard_intents" TO "authenticated";
GRANT ALL ON TABLE "public"."standard_intents" TO "service_role";



GRANT ALL ON TABLE "public"."standard_utterances" TO "anon";
GRANT ALL ON TABLE "public"."standard_utterances" TO "authenticated";
GRANT ALL ON TABLE "public"."standard_utterances" TO "service_role";



GRANT ALL ON TABLE "public"."synonyms" TO "anon";
GRANT ALL ON TABLE "public"."synonyms" TO "authenticated";
GRANT ALL ON TABLE "public"."synonyms" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






\unrestrict aiyzBFmGV7OpkcRaOcT4T1cIPJfFbf012aH7NyC4mg9DyRubLyNKAv1i6yEhZ5T

RESET ALL;
