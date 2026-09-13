


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."confirm_appointment_request"("p_request_id" "uuid", "p_department_id" "uuid", "p_appointment_time" timestamp with time zone, "p_doctor_name" "text", "p_staff_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_request public.appointment_requests%ROWTYPE;
    v_hospital_id UUID;
    v_appointment public.appointments%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_staff_user_id
          AND role = 'STAFF'
    ) THEN
        RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
    END IF;

    SELECT hospital_id
    INTO v_hospital_id
    FROM public.staff_profiles
    WHERE user_id = p_staff_user_id
      AND is_active = true
    LIMIT 1;

    IF v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'Staff hospital could not be resolved' USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_request
    FROM public.appointment_requests
    WHERE id = p_request_id
      AND hospital_id = v_hospital_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment request not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_request.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Only pending requests can be confirmed' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.departments
        WHERE id = p_department_id
          AND hospital_id = v_hospital_id
    ) THEN
        RAISE EXCEPTION 'Department does not belong to staff hospital' USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.appointments (
        hospital_id,
        patient_id,
        department_id,
        doctor_name,
        appointment_time,
        status,
        source
    )
    VALUES (
        v_hospital_id,
        v_request.patient_id,
        p_department_id,
        p_doctor_name,
        p_appointment_time,
        'SCHEDULED',
        'MANUAL'
    )
    RETURNING * INTO v_appointment;

    UPDATE public.appointment_requests
    SET status = 'CONFIRMED',
        appointment_id = v_appointment.id,
        reviewed_by = p_staff_user_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = v_request.id;

    RETURN jsonb_build_object(
        'request_id', v_request.id,
        'appointment_id', v_appointment.id,
        'status', 'CONFIRMED'
    );
END;
$$;


ALTER FUNCTION "public"."confirm_appointment_request"("p_request_id" "uuid", "p_department_id" "uuid", "p_appointment_time" timestamp with time zone, "p_doctor_name" "text", "p_staff_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_interpreter_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    SELECT id FROM public.interpreter_profiles WHERE user_id = auth.uid() AND is_active = true;
$$;


ALTER FUNCTION "public"."get_auth_interpreter_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_patient_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    SELECT id FROM public.patient_profiles WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_patient_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_staff_hospital_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    SELECT hospital_id FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true;
$$;


ALTER FUNCTION "public"."get_auth_staff_hospital_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_patient_registration"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    patient_name TEXT;
    patient_phone TEXT;
BEGIN
    -- Only the public patient registration flow sets this marker. Staff and
    -- interpreter accounts remain administrator-controlled and are ignored.
    IF UPPER(COALESCE(NEW.raw_user_meta_data ->> 'accessiblecare_role', '')) <> 'PATIENT' THEN
        RETURN NEW;
    END IF;

    patient_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');
    patient_phone := NULLIF(TRIM(COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone', '')), '');

    IF patient_name IS NULL THEN
        RAISE EXCEPTION 'Patient name is required for registration';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (NEW.id, 'PATIENT', patient_name, patient_phone)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now();

    INSERT INTO public.patient_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_patient_registration"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accessibility_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "communication_preference" "text" NOT NULL,
    "interpreter_required" boolean DEFAULT false NOT NULL,
    "preferred_interpreter_mode" "text",
    "remote_accepted" boolean DEFAULT true NOT NULL,
    "companion_preference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accessibility_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accessibility_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "communication_preference" "text" NOT NULL,
    "interpreter_required" boolean DEFAULT false NOT NULL,
    "preferred_mode" "text",
    "remote_accepted" boolean DEFAULT true NOT NULL,
    "companion_present" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accessibility_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "hospital_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "communication_preference" "text" NOT NULL,
    "interpreter_required" boolean DEFAULT false NOT NULL,
    "preferred_interpreter_mode" "text",
    "remote_accepted" boolean DEFAULT true NOT NULL,
    "companion_present" boolean DEFAULT false NOT NULL,
    "companion_assists_communication" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "appointment_id" "uuid",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason_for_visit" "text" NOT NULL,
    "accessibility_note" "text",
    CONSTRAINT "appointment_requests_interpreter_mode_check" CHECK ((("preferred_interpreter_mode" IS NULL) OR ("preferred_interpreter_mode" = ANY (ARRAY['IN_PERSON'::"text", 'REMOTE'::"text", 'EITHER'::"text"])))),
    CONSTRAINT "appointment_requests_review_check" CHECK (((("status" = 'PENDING'::"text") AND ("appointment_id" IS NULL) AND ("reviewed_by" IS NULL) AND ("reviewed_at" IS NULL)) OR ("status" = ANY (ARRAY['CONFIRMED'::"text", 'REJECTED'::"text"])))),
    CONSTRAINT "appointment_requests_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'CONFIRMED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."appointment_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointment_requests" IS 'Accessible visit requests submitted by patients at the hospital; staff supplies the actual appointment details during confirmation.';



COMMENT ON COLUMN "public"."appointment_requests"."reason_for_visit" IS 'Patient-provided reason for requesting a doctor visit.';



COMMENT ON COLUMN "public"."appointment_requests"."accessibility_note" IS 'Optional patient-provided accessibility instruction for hospital staff.';



CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hospital_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "department_id" "uuid",
    "doctor_name" "text",
    "appointment_time" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'SCHEDULED'::"text" NOT NULL,
    "source" "text" DEFAULT 'MANUAL'::"text" NOT NULL,
    "external_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "appointment_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "method" "text" NOT NULL,
    "status" "text" DEFAULT 'CHECKED_IN'::"text" NOT NULL,
    "checked_in_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid",
    "message" "text" NOT NULL,
    "message_type" "text" DEFAULT 'TEXT'::"text" NOT NULL,
    "status" "text" DEFAULT 'SENT'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."communication_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hospital_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."escalations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid",
    "accessibility_visit_id" "uuid",
    "type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "priority" "text" DEFAULT 'MEDIUM'::"text" NOT NULL,
    "status" "text" DEFAULT 'OPEN'::"text" NOT NULL,
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolution" "text"
);


ALTER TABLE "public"."escalations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid",
    "patient_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "category" "text",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hospitals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hospitals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interpreter_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interpreter_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "mode" "text" DEFAULT 'IN_PERSON'::"text" NOT NULL,
    "status" "text" DEFAULT 'AVAILABLE'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interpreter_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interpreter_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hospital_id" "uuid",
    "display_name" "text" NOT NULL,
    "verification_status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interpreter_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interpreter_request_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "accessibility_visit_id" "uuid" NOT NULL,
    "requested_mode" "text" NOT NULL,
    "strategy" "text" DEFAULT 'PARALLEL_TOP_N'::"text" NOT NULL,
    "candidate_limit" integer DEFAULT 5 NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone
);


ALTER TABLE "public"."interpreter_request_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interpreter_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_group_id" "uuid" NOT NULL,
    "interpreter_id" "uuid" NOT NULL,
    "response_status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "assignment_status" "text" DEFAULT 'UNASSIGNED'::"text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "assigned_at" timestamp with time zone,
    "assigned_by" "uuid"
);


ALTER TABLE "public"."interpreter_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "appointment_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'UNREAD'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hospital_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."patient_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "hospital_id" "uuid" NOT NULL,
    "department_id" "uuid",
    "designation" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "interpreter_request_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'DAILY'::"text" NOT NULL,
    "meeting_url" "text" NOT NULL,
    "status" "text" DEFAULT 'CREATED'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "video_sessions_status_check" CHECK (("status" = ANY (ARRAY['CREATED'::"text", 'READY'::"text", 'ACTIVE'::"text", 'ENDED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."video_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accessibility_profiles"
    ADD CONSTRAINT "accessibility_profiles_patient_id_key" UNIQUE ("patient_id");



ALTER TABLE ONLY "public"."accessibility_profiles"
    ADD CONSTRAINT "accessibility_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accessibility_visits"
    ADD CONSTRAINT "accessibility_visits_appointment_id_key" UNIQUE ("appointment_id");



ALTER TABLE ONLY "public"."accessibility_visits"
    ADD CONSTRAINT "accessibility_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_requests"
    ADD CONSTRAINT "appointment_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_appointment_id_key" UNIQUE ("appointment_id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_messages"
    ADD CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hospitals"
    ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interpreter_availability"
    ADD CONSTRAINT "interpreter_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interpreter_profiles"
    ADD CONSTRAINT "interpreter_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interpreter_profiles"
    ADD CONSTRAINT "interpreter_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."interpreter_request_groups"
    ADD CONSTRAINT "interpreter_request_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interpreter_requests"
    ADD CONSTRAINT "interpreter_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."video_sessions"
    ADD CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accessibility_visits_appointment_id" ON "public"."accessibility_visits" USING "btree" ("appointment_id");



CREATE INDEX "idx_appointment_requests_appointment" ON "public"."appointment_requests" USING "btree" ("appointment_id");



CREATE INDEX "idx_appointment_requests_department" ON "public"."appointment_requests" USING "btree" ("department_id");



CREATE INDEX "idx_appointment_requests_hospital_status" ON "public"."appointment_requests" USING "btree" ("hospital_id", "status", "created_at" DESC);



CREATE INDEX "idx_appointment_requests_patient" ON "public"."appointment_requests" USING "btree" ("patient_id", "created_at" DESC);



CREATE INDEX "idx_appointments_appointment_time" ON "public"."appointments" USING "btree" ("appointment_time");



CREATE INDEX "idx_appointments_hospital_id" ON "public"."appointments" USING "btree" ("hospital_id");



CREATE INDEX "idx_appointments_patient_id" ON "public"."appointments" USING "btree" ("patient_id");



CREATE INDEX "idx_audit_logs_appointment_id" ON "public"."audit_logs" USING "btree" ("appointment_id");



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_escalations_status" ON "public"."escalations" USING "btree" ("status");



CREATE INDEX "idx_feedback_patient_appointment" ON "public"."feedback" USING "btree" ("patient_id", "appointment_id");



CREATE INDEX "idx_interpreter_availability_interpreter_date" ON "public"."interpreter_availability" USING "btree" ("interpreter_id", "date");



CREATE INDEX "idx_interpreter_requests_interpreter" ON "public"."interpreter_requests" USING "btree" ("interpreter_id");



CREATE INDEX "idx_interpreter_requests_request_group" ON "public"."interpreter_requests" USING "btree" ("request_group_id");



CREATE INDEX "idx_notifications_user_status" ON "public"."notifications" USING "btree" ("user_id", "status");



ALTER TABLE ONLY "public"."accessibility_profiles"
    ADD CONSTRAINT "accessibility_profiles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accessibility_visits"
    ADD CONSTRAINT "accessibility_visits_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accessibility_visits"
    ADD CONSTRAINT "accessibility_visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_requests"
    ADD CONSTRAINT "appointment_requests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_requests"
    ADD CONSTRAINT "appointment_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."appointment_requests"
    ADD CONSTRAINT "appointment_requests_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_requests"
    ADD CONSTRAINT "appointment_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_requests"
    ADD CONSTRAINT "appointment_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_messages"
    ADD CONSTRAINT "communication_messages_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_messages"
    ADD CONSTRAINT "communication_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_messages"
    ADD CONSTRAINT "communication_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_accessibility_visit_id_fkey" FOREIGN KEY ("accessibility_visit_id") REFERENCES "public"."accessibility_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patient_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interpreter_availability"
    ADD CONSTRAINT "interpreter_availability_interpreter_id_fkey" FOREIGN KEY ("interpreter_id") REFERENCES "public"."interpreter_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interpreter_profiles"
    ADD CONSTRAINT "interpreter_profiles_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interpreter_profiles"
    ADD CONSTRAINT "interpreter_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interpreter_request_groups"
    ADD CONSTRAINT "interpreter_request_groups_accessibility_visit_id_fkey" FOREIGN KEY ("accessibility_visit_id") REFERENCES "public"."accessibility_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interpreter_request_groups"
    ADD CONSTRAINT "interpreter_request_groups_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interpreter_requests"
    ADD CONSTRAINT "interpreter_requests_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interpreter_requests"
    ADD CONSTRAINT "interpreter_requests_interpreter_id_fkey" FOREIGN KEY ("interpreter_id") REFERENCES "public"."interpreter_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interpreter_requests"
    ADD CONSTRAINT "interpreter_requests_request_group_id_fkey" FOREIGN KEY ("request_group_id") REFERENCES "public"."interpreter_request_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_profiles"
    ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_sessions"
    ADD CONSTRAINT "video_sessions_interpreter_request_id_fkey" FOREIGN KEY ("interpreter_request_id") REFERENCES "public"."interpreter_requests"("id") ON DELETE CASCADE;



ALTER TABLE "public"."accessibility_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accessibility_profiles_insert_self" ON "public"."accessibility_profiles" FOR INSERT TO "authenticated" WITH CHECK (("patient_id" = "public"."get_auth_patient_id"()));



CREATE POLICY "accessibility_profiles_select" ON "public"."accessibility_profiles" FOR SELECT TO "authenticated" USING ((("patient_id" = "public"."get_auth_patient_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("patient_id" IN ( SELECT "pp"."id"
   FROM "public"."patient_profiles" "pp"
  WHERE ("pp"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



CREATE POLICY "accessibility_profiles_update_self" ON "public"."accessibility_profiles" FOR UPDATE TO "authenticated" USING (("patient_id" = "public"."get_auth_patient_id"())) WITH CHECK (("patient_id" = "public"."get_auth_patient_id"()));



ALTER TABLE "public"."accessibility_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accessibility_visits_select" ON "public"."accessibility_visits" FOR SELECT TO "authenticated" USING ((("patient_id" = "public"."get_auth_patient_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"())))) OR (("public"."get_auth_user_role"() = 'INTERPRETER'::"text") AND ("id" IN ( SELECT "g"."accessibility_visit_id"
   FROM ("public"."interpreter_request_groups" "g"
     JOIN "public"."interpreter_requests" "r" ON (("r"."request_group_id" = "g"."id")))
  WHERE ("r"."interpreter_id" = "public"."get_auth_interpreter_id"()))))));



ALTER TABLE "public"."appointment_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_requests_insert_patient" ON "public"."appointment_requests" FOR INSERT TO "authenticated" WITH CHECK ((("public"."get_auth_user_role"() = 'PATIENT'::"text") AND ("patient_id" = "public"."get_auth_patient_id"()) AND ("hospital_id" = ( SELECT "d"."hospital_id"
   FROM "public"."departments" "d"
  WHERE ("d"."id" = "appointment_requests"."department_id")))));



CREATE POLICY "appointment_requests_select_patient" ON "public"."appointment_requests" FOR SELECT TO "authenticated" USING (("patient_id" = "public"."get_auth_patient_id"()));



CREATE POLICY "appointment_requests_select_staff" ON "public"."appointment_requests" FOR SELECT TO "authenticated" USING ((("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("hospital_id" = "public"."get_auth_staff_hospital_id"())));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments_select" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((("patient_id" = "public"."get_auth_patient_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("hospital_id" = "public"."get_auth_staff_hospital_id"())) OR (("public"."get_auth_user_role"() = 'INTERPRETER'::"text") AND ("id" IN ( SELECT "v"."appointment_id"
   FROM (("public"."accessibility_visits" "v"
     JOIN "public"."interpreter_request_groups" "g" ON (("g"."accessibility_visit_id" = "v"."id")))
     JOIN "public"."interpreter_requests" "r" ON (("r"."request_group_id" = "g"."id")))
  WHERE (("r"."interpreter_id" = "public"."get_auth_interpreter_id"()) AND ("r"."assignment_status" = 'ASSIGNED'::"text")))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_select_staff" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("public"."get_auth_user_role"() = 'STAFF'::"text") AND (("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))) OR (("appointment_id" IS NULL) AND ("actor_id" IN ( SELECT "sp"."user_id"
   FROM "public"."staff_profiles" "sp"
  WHERE ("sp"."hospital_id" = "public"."get_auth_staff_hospital_id"())))))));



ALTER TABLE "public"."check_ins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_ins_insert_self" ON "public"."check_ins" FOR INSERT TO "authenticated" WITH CHECK (("patient_id" = "public"."get_auth_patient_id"()));



CREATE POLICY "check_ins_select" ON "public"."check_ins" FOR SELECT TO "authenticated" USING ((("patient_id" = "public"."get_auth_patient_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



ALTER TABLE "public"."communication_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communication_messages_insert_sender" ON "public"."communication_messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "communication_messages_select" ON "public"."communication_messages" FOR SELECT TO "authenticated" USING ((("sender_id" = "auth"."uid"()) OR ("receiver_id" = "auth"."uid"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departments_select_authenticated" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."escalations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "escalations_select" ON "public"."escalations" FOR SELECT TO "authenticated" USING (((("public"."get_auth_user_role"() = 'STAFF'::"text") AND (("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))) OR ("accessibility_visit_id" IN ( SELECT "v"."id"
   FROM ("public"."accessibility_visits" "v"
     JOIN "public"."appointments" "a" ON (("a"."id" = "v"."appointment_id")))
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))) OR (("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."patient_id" = "public"."get_auth_patient_id"()))) OR ("accessibility_visit_id" IN ( SELECT "v"."id"
   FROM "public"."accessibility_visits" "v"
  WHERE ("v"."patient_id" = "public"."get_auth_patient_id"()))))));



ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_insert_self" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (("patient_id" = "public"."get_auth_patient_id"()));



CREATE POLICY "feedback_select" ON "public"."feedback" FOR SELECT TO "authenticated" USING ((("patient_id" = "public"."get_auth_patient_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("appointment_id" IN ( SELECT "a"."id"
   FROM "public"."appointments" "a"
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



ALTER TABLE "public"."hospitals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hospitals_select_authenticated" ON "public"."hospitals" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."interpreter_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interpreter_availability_delete_self" ON "public"."interpreter_availability" FOR DELETE TO "authenticated" USING (("interpreter_id" = "public"."get_auth_interpreter_id"()));



CREATE POLICY "interpreter_availability_insert_self" ON "public"."interpreter_availability" FOR INSERT TO "authenticated" WITH CHECK (("interpreter_id" = "public"."get_auth_interpreter_id"()));



CREATE POLICY "interpreter_availability_select" ON "public"."interpreter_availability" FOR SELECT TO "authenticated" USING ((("interpreter_id" = "public"."get_auth_interpreter_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("interpreter_id" IN ( SELECT "ip"."id"
   FROM "public"."interpreter_profiles" "ip"
  WHERE ("ip"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



CREATE POLICY "interpreter_availability_update_self" ON "public"."interpreter_availability" FOR UPDATE TO "authenticated" USING (("interpreter_id" = "public"."get_auth_interpreter_id"())) WITH CHECK (("interpreter_id" = "public"."get_auth_interpreter_id"()));



ALTER TABLE "public"."interpreter_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interpreter_profiles_insert_self" ON "public"."interpreter_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "interpreter_profiles_select" ON "public"."interpreter_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("hospital_id" = "public"."get_auth_staff_hospital_id"()))));



CREATE POLICY "interpreter_profiles_update_self" ON "public"."interpreter_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."interpreter_request_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interpreter_request_groups_select" ON "public"."interpreter_request_groups" FOR SELECT TO "authenticated" USING (((("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("accessibility_visit_id" IN ( SELECT "v"."id"
   FROM ("public"."accessibility_visits" "v"
     JOIN "public"."appointments" "a" ON (("a"."id" = "v"."appointment_id")))
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"())))) OR (("public"."get_auth_user_role"() = 'INTERPRETER'::"text") AND ("id" IN ( SELECT "r"."request_group_id"
   FROM "public"."interpreter_requests" "r"
  WHERE ("r"."interpreter_id" = "public"."get_auth_interpreter_id"()))))));



ALTER TABLE "public"."interpreter_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interpreter_requests_select" ON "public"."interpreter_requests" FOR SELECT TO "authenticated" USING ((("interpreter_id" = "public"."get_auth_interpreter_id"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("request_group_id" IN ( SELECT "g"."id"
   FROM (("public"."interpreter_request_groups" "g"
     JOIN "public"."accessibility_visits" "v" ON (("v"."id" = "g"."accessibility_visit_id")))
     JOIN "public"."appointments" "a" ON (("a"."id" = "v"."appointment_id")))
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



CREATE POLICY "interpreter_requests_update_response" ON "public"."interpreter_requests" FOR UPDATE TO "authenticated" USING (("interpreter_id" = "public"."get_auth_interpreter_id"())) WITH CHECK (("interpreter_id" = "public"."get_auth_interpreter_id"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_self" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_self" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."patient_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_profiles_insert_self" ON "public"."patient_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "patient_profiles_select" ON "public"."patient_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("hospital_id" = "public"."get_auth_staff_hospital_id"()))));



CREATE POLICY "patient_profiles_update_self" ON "public"."patient_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_staff" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("public"."get_auth_user_role"() = 'STAFF'::"text") AND (("id" IN ( SELECT "sp"."user_id"
   FROM "public"."staff_profiles" "sp"
  WHERE ("sp"."hospital_id" = "public"."get_auth_staff_hospital_id"()))) OR ("id" IN ( SELECT "pp"."user_id"
   FROM "public"."patient_profiles" "pp"
  WHERE ("pp"."hospital_id" = "public"."get_auth_staff_hospital_id"()))) OR ("id" IN ( SELECT "ip"."user_id"
   FROM "public"."interpreter_profiles" "ip"
  WHERE ("ip"."hospital_id" = "public"."get_auth_staff_hospital_id"()))))));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."staff_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_profiles_select" ON "public"."staff_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("hospital_id" = "public"."get_auth_staff_hospital_id"()))));



ALTER TABLE "public"."video_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_sessions_select" ON "public"."video_sessions" FOR SELECT TO "authenticated" USING (((("public"."get_auth_user_role"() = 'STAFF'::"text") AND ("interpreter_request_id" IN ( SELECT "r"."id"
   FROM ((("public"."interpreter_requests" "r"
     JOIN "public"."interpreter_request_groups" "g" ON (("g"."id" = "r"."request_group_id")))
     JOIN "public"."accessibility_visits" "v" ON (("v"."id" = "g"."accessibility_visit_id")))
     JOIN "public"."appointments" "a" ON (("a"."id" = "v"."appointment_id")))
  WHERE ("a"."hospital_id" = "public"."get_auth_staff_hospital_id"())))) OR (("public"."get_auth_user_role"() = 'INTERPRETER'::"text") AND ("interpreter_request_id" IN ( SELECT "r"."id"
   FROM "public"."interpreter_requests" "r"
  WHERE (("r"."interpreter_id" = "public"."get_auth_interpreter_id"()) AND ("r"."assignment_status" = 'ASSIGNED'::"text"))))) OR (("public"."get_auth_user_role"() = 'PATIENT'::"text") AND ("interpreter_request_id" IN ( SELECT "r"."id"
   FROM (("public"."interpreter_requests" "r"
     JOIN "public"."interpreter_request_groups" "g" ON (("g"."id" = "r"."request_group_id")))
     JOIN "public"."accessibility_visits" "v" ON (("v"."id" = "g"."accessibility_visit_id")))
  WHERE (("v"."patient_id" = "public"."get_auth_patient_id"()) AND ("r"."assignment_status" = 'ASSIGNED'::"text")))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."confirm_appointment_request"("p_request_id" "uuid", "p_department_id" "uuid", "p_appointment_time" timestamp with time zone, "p_doctor_name" "text", "p_staff_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_appointment_request"("p_request_id" "uuid", "p_department_id" "uuid", "p_appointment_time" timestamp with time zone, "p_doctor_name" "text", "p_staff_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_appointment_request"("p_request_id" "uuid", "p_department_id" "uuid", "p_appointment_time" timestamp with time zone, "p_doctor_name" "text", "p_staff_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_appointment_request"("p_request_id" "uuid", "p_department_id" "uuid", "p_appointment_time" timestamp with time zone, "p_doctor_name" "text", "p_staff_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_auth_interpreter_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_auth_interpreter_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_interpreter_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_interpreter_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_auth_patient_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_auth_patient_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_patient_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_patient_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_auth_staff_hospital_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_auth_staff_hospital_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_staff_hospital_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_staff_hospital_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_auth_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_patient_registration"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_patient_registration"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_patient_registration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_patient_registration"() TO "service_role";


















GRANT ALL ON TABLE "public"."accessibility_profiles" TO "anon";
GRANT ALL ON TABLE "public"."accessibility_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."accessibility_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."accessibility_visits" TO "anon";
GRANT ALL ON TABLE "public"."accessibility_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."accessibility_visits" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_requests" TO "anon";
GRANT ALL ON TABLE "public"."appointment_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_requests" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."communication_messages" TO "anon";
GRANT ALL ON TABLE "public"."communication_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."communication_messages" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."escalations" TO "anon";
GRANT ALL ON TABLE "public"."escalations" TO "authenticated";
GRANT ALL ON TABLE "public"."escalations" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."hospitals" TO "anon";
GRANT ALL ON TABLE "public"."hospitals" TO "authenticated";
GRANT ALL ON TABLE "public"."hospitals" TO "service_role";



GRANT ALL ON TABLE "public"."interpreter_availability" TO "anon";
GRANT ALL ON TABLE "public"."interpreter_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."interpreter_availability" TO "service_role";



GRANT ALL ON TABLE "public"."interpreter_profiles" TO "anon";
GRANT ALL ON TABLE "public"."interpreter_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."interpreter_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."interpreter_request_groups" TO "anon";
GRANT ALL ON TABLE "public"."interpreter_request_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."interpreter_request_groups" TO "service_role";



GRANT ALL ON TABLE "public"."interpreter_requests" TO "anon";
GRANT ALL ON TABLE "public"."interpreter_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."interpreter_requests" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."patient_profiles" TO "anon";
GRANT ALL ON TABLE "public"."patient_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."staff_profiles" TO "anon";
GRANT ALL ON TABLE "public"."staff_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."video_sessions" TO "anon";
GRANT ALL ON TABLE "public"."video_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."video_sessions" TO "service_role";









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































