-- ============================================================================
-- CITE Safety API - Crisis Resources Seed Data
-- ============================================================================
-- This migration seeds the crisis_resources table with:
-- - Baseline global resources (15+ countries + GLOBAL)
-- - Phase 1 critical updates (new national hotlines, specialized services)
-- - Phase 2 major country coverage (ZA, SG, HK, PH, NG, EG, IL, CN, TW, KR, TH, MY)
--
-- IMPORTANT:
-- - Run AFTER `001_initial_schema.sql`
-- - Intended for fresh environments with no existing crisis_resources data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INITIAL DATA FROM REGISTRY (baseline 15+ countries)
-- ----------------------------------------------------------------------------

-- United States
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('US', '988 Suicide & Crisis Lifeline', 'crisis_line', '988', 'Text 988', '24/7',
 '{"en", "es"}', 'Free, confidential support for people in distress, prevention and crisis resources.', 1),
('US', 'Crisis Text Line', 'text_line', NULL, 'Text HOME to 741741', '24/7',
 '{"en", "es"}', 'Free, 24/7 crisis support via text message.', 2),
('US', 'Emergency Services', 'emergency_number', '911', NULL, '24/7',
 '{"en", "es"}', 'For immediate life-threatening emergencies.', 99);

-- United Kingdom
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('GB', 'Samaritans', 'crisis_line', '116 123', NULL, '24/7',
 '{"en"}', 'Free, confidential emotional support for anyone in distress.', 1),
('GB', 'Shout', 'text_line', NULL, 'Text SHOUT to 85258', '24/7',
 '{"en"}', 'Free, confidential, 24/7 text support for anyone in crisis.', 2),
('GB', 'Emergency Services', 'emergency_number', '999', NULL, '24/7',
 '{"en"}', 'For immediate life-threatening emergencies.', 99);

-- Canada
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('CA', 'Talk Suicide Canada', 'crisis_line', '1-833-456-4566', 'Text 45645', '24/7',
 '{"en", "fr"}', 'Free, confidential support for people in distress.', 1),
('CA', 'Kids Help Phone', 'crisis_line', '1-800-668-6868', 'Text CONNECT to 686868', '24/7',
 '{"en", "fr"}', 'Support for young people up to age 29.', 2),
('CA', 'Emergency Services', 'emergency_number', '911', NULL, '24/7',
 '{"en", "fr"}', 'For immediate life-threatening emergencies.', 99);

-- Australia
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('AU', 'Lifeline Australia', 'crisis_line', '13 11 14', NULL, '24/7',
 '{"en"}', 'Crisis support and suicide prevention services.', 1),
('AU', 'Lifeline Text', 'text_line', NULL, 'Text 0477 13 11 14', '24/7',
 '{"en"}', 'Text-based crisis support.', 2),
('AU', 'Emergency Services', 'emergency_number', '000', NULL, '24/7',
 '{"en"}', 'For immediate life-threatening emergencies.', 99);

-- New Zealand
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('NZ', 'Lifeline Aotearoa', 'crisis_line', '0800 543 354', NULL, '24/7',
 '{"en"}', 'Free, confidential support for anyone in distress.', 1),
('NZ', '1737', 'crisis_line', '1737', 'Text 1737', '24/7',
 '{"en"}', 'Free call or text for support from a trained counselor.', 2),
('NZ', 'Emergency Services', 'emergency_number', '111', NULL, '24/7',
 '{"en"}', 'For immediate life-threatening emergencies.', 99);

-- Ireland
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('IE', 'Samaritans Ireland', 'crisis_line', '116 123', NULL, '24/7',
 '{"en"}', 'Free, confidential emotional support.', 1),
('IE', 'Pieta House', 'crisis_line', '1800 247 247', NULL, '24/7',
 '{"en"}', 'Free therapy for people in suicidal distress.', 2),
('IE', 'Emergency Services', 'emergency_number', '999', NULL, '24/7',
 '{"en"}', 'For immediate life-threatening emergencies.', 99);

-- Germany
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('DE', 'Telefonseelsorge', 'crisis_line', '0800 111 0 111', NULL, '24/7',
 '{"de"}', 'Kostenlose, vertrauliche Krisenunterstützung.', 1),
('DE', 'Notdienste', 'emergency_number', '112', NULL, '24/7',
 '{"de", "en"}', 'Für lebensbedrohliche Notfälle.', 99);

-- France
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('FR', 'SOS Amitié', 'crisis_line', '09 72 39 40 50', NULL, '24/7',
 '{"fr"}', 'Soutien émotionnel gratuit et confidentiel.', 1),
('FR', 'Services d''urgence', 'emergency_number', '112', NULL, '24/7',
 '{"fr", "en"}', 'Pour les urgences vitales.', 99);

-- Spain
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('ES', 'Teléfono de la Esperanza', 'crisis_line', '717 003 717', NULL, '24/7',
 '{"es"}', 'Apoyo emocional gratuito y confidencial.', 1),
('ES', 'Servicios de emergencia', 'emergency_number', '112', NULL, '24/7',
 '{"es", "en"}', 'Para emergencias que amenazan la vida.', 99);

-- Italy
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('IT', 'Telefono Amico', 'crisis_line', '02 2327 2327', NULL, 'Daily 10:00-24:00',
 '{"it"}', 'Supporto emotivo gratuito e confidenziale.', 1),
('IT', 'Servizi di emergenza', 'emergency_number', '112', NULL, '24/7',
 '{"it", "en"}', 'Per emergenze potenzialmente letali.', 99);

-- Japan
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('JP', 'TELL Lifeline', 'crisis_line', '03-5774-0992', NULL, 'Daily 9:00-23:00',
 '{"en", "ja"}', 'Free, confidential telephone counseling.', 1),
('JP', 'Inochi no Denwa', 'crisis_line', '0570-783-556', NULL, '24/7',
 '{"ja"}', '無料で機密性の高い危機サポート', 2),
('JP', '緊急サービス', 'emergency_number', '110', NULL, '24/7',
 '{"ja"}', '生命を脅かす緊急事態の場合', 99);

-- South Korea
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('KR', 'Korea Suicide Prevention Center', 'crisis_line', '1393', NULL, '24/7',
 '{"ko"}', '무료 상담 및 위기 지원', 1),
('KR', '응급 서비스', 'emergency_number', '119', NULL, '24/7',
 '{"ko"}', '생명을 위협하는 긴급 상황', 99);

-- India
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('IN', 'AASRA', 'crisis_line', '91-22-2754-6669', NULL, '24/7',
 '{"en", "hi"}', 'Free, confidential crisis support.', 1),
('IN', 'Vandrevala Foundation', 'crisis_line', '1860-266-2345', NULL, '24/7',
 '{"en", "hi"}', 'Mental health support and crisis intervention.', 2),
('IN', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"en", "hi"}', 'For immediate life-threatening emergencies.', 99);

-- Brazil
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('BR', 'CVV', 'crisis_line', '188', NULL, '24/7',
 '{"pt"}', 'Apoio emocional gratuito e confidencial.', 1),
('BR', 'Serviços de emergência', 'emergency_number', '192', NULL, '24/7',
 '{"pt"}', 'Para emergências com risco de vida.', 99);

-- Mexico
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, display_order
) VALUES
('MX', 'Línea de la Vida', 'crisis_line', '800 911 2000', NULL, '24/7',
 '{"es"}', 'Apoyo emocional y prevención del suicidio.', 1),
('MX', 'Servicios de emergencia', 'emergency_number', '911', NULL, '24/7',
 '{"es"}', 'Para emergencias que amenazan la vida.', 99);

-- Global/International fallback resources
INSERT INTO public.crisis_resources (
  country_code, name, type, chat_url, availability, languages,
  description, display_order
) VALUES
('GLOBAL', 'International Association for Suicide Prevention', 'support_service',
 'https://www.iasp.info/resources/Crisis_Centres/', 'Varies by region',
 '{"en"}', 'Directory of crisis centers worldwide.', 1),
('GLOBAL', 'Befrienders Worldwide', 'support_service',
 'https://www.befrienders.org/', 'Varies by region',
 '{"en"}', 'Global network of emotional support centers.', 2);

-- ----------------------------------------------------------------------------
-- 2. TAG BASELINE DATA WITH SERVICE SCOPE / POPULATION
--    (from 004_crisis_resources_schema_enhancements.sql)
-- ----------------------------------------------------------------------------

-- Emergency services
UPDATE public.crisis_resources
SET
  service_scope = ARRAY['emergency', 'general'],
  population_served = ARRAY['general']
WHERE type = 'emergency_number';

-- General crisis lines
UPDATE public.crisis_resources
SET
  service_scope = ARRAY['suicide', 'mental_health', 'crisis', 'general'],
  population_served = ARRAY['general']
WHERE type = 'crisis_line'
  AND name IN (
    '988 Suicide & Crisis Lifeline',
    'Samaritans',
    'Talk Suicide Canada',
    'Lifeline Australia',
    'Lifeline Aotearoa',
    '1737',
    'Samaritans Ireland',
    'Pieta House',
    'Telefonseelsorge',
    'SOS Amitié',
    'Teléfono de la Esperanza',
    'Telefono Amico',
    'TELL Lifeline',
    'Inochi no Denwa',
    'Korea Suicide Prevention Center',
    'AASRA',
    'Vandrevala Foundation',
    'CVV'
  );

-- Text lines
UPDATE public.crisis_resources
SET
  service_scope = ARRAY['suicide', 'mental_health', 'crisis', 'general'],
  population_served = ARRAY['general']
WHERE type = 'text_line';

-- Youth-specific services
UPDATE public.crisis_resources
SET
  service_scope = ARRAY['suicide', 'mental_health', 'crisis', 'general'],
  population_served = ARRAY['youth', 'children']
WHERE name = 'Kids Help Phone';

-- Global resources
UPDATE public.crisis_resources
SET
  service_scope = ARRAY['suicide', 'mental_health', 'crisis', 'general'],
  population_served = ARRAY['general']
WHERE country_code = 'GLOBAL';

-- ----------------------------------------------------------------------------
-- 3. PHASE 1: CRITICAL UPDATES & NEW COUNTRIES
--    (from 005_crisis_resources_phase1_critical_updates.sql)
-- ----------------------------------------------------------------------------

-- CANADA: Update Talk Suicide display_order and add 988
UPDATE public.crisis_resources
SET display_order = 3
WHERE country_code = 'CA' AND name = 'Talk Suicide Canada';

INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('CA', '988 Suicide Crisis Helpline', 'crisis_line', '988', 'Text 988', '24/7',
 '{"en", "fr"}',
 'National 3-digit suicide crisis helpline. Free, confidential support for people in distress. Launched November 2023.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}', 'https://988.ca', 1);

-- SPAIN: Add 024 and move Teléfono de la Esperanza
UPDATE public.crisis_resources
SET display_order = 2
WHERE country_code = 'ES' AND name = 'Teléfono de la Esperanza';

INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('ES', 'Línea 024', 'crisis_line', '024', '24/7', '{"es"}',
 'Línea nacional de atención a la conducta suicida. Free 24/7 suicide prevention hotline.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.sanidad.gob.es/linea024', 1);

-- FRANCE: Add 3114 and move SOS Amitié
UPDATE public.crisis_resources
SET display_order = 2
WHERE country_code = 'FR' AND name = 'SOS Amitié';

INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('FR', '3114 - Prévention du Suicide', 'crisis_line', '3114', '24/7', '{"fr"}',
 'Ligne nationale de prévention du suicide. Free, confidential 24/7 support.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://3114.fr', 1);

-- INDIA: Add Kiran and fix AASRA phone
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, display_order
) VALUES
('IN', 'Kiran Mental Health Helpline', 'crisis_line', '1800-599-0019', '24/7',
 '{"en", "hi"}',
 'National 24/7 toll-free mental health helpline by Ministry of Social Justice.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}', 0);

UPDATE public.crisis_resources
SET phone = '+91-22-2754-6669'
WHERE country_code = 'IN' AND name = 'AASRA';

-- UNITED STATES: Specialized services
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('US', 'Veterans Crisis Line', 'crisis_line', '988', 'Text 838255', '24/7',
 '{"en", "es"}',
 'Press 1 after dialing 988. Specialized support for veterans and their families.',
 '{"suicide", "mental_health", "crisis", "veterans"}',
 '{"veterans", "general"}', 'https://www.veteranscrisisline.net/', 2),
('US', 'The Trevor Project', 'crisis_line', '1-866-488-7386', 'Text START to 678-678', '24/7',
 '{"en", "es"}',
 'Crisis intervention and suicide prevention for LGBTQ+ youth under 25.',
 '{"suicide", "mental_health", "crisis", "lgbtq"}',
 '{"lgbtq", "youth"}', 'https://www.thetrevorproject.org/', 3),
('US', 'Trans Lifeline', 'crisis_line', '1-877-565-8860', NULL,
 'Mon-Fri 10AM-6PM PT / 1-9PM ET', '{"en", "es"}',
 'Peer support hotline for transgender people, by transgender people.',
 '{"suicide", "mental_health", "crisis", "lgbtq", "transgender"}',
 '{"transgender", "lgbtq"}', 'https://translifeline.org/', 4),
('US', 'National Domestic Violence Hotline', 'crisis_line', '800-799-7233',
 'Text START to 88788', '24/7', '{"en", "es"}',
 'Free, confidential support for survivors of domestic violence and their loved ones.',
 '{"domestic_violence", "crisis"}', '{"general", "women"}',
 'https://www.thehotline.org/', 5),
('US', 'RAINN National Sexual Assault Hotline', 'crisis_line', '800-656-4673',
 NULL, '24/7', '{"en", "es"}',
 'Free, confidential support for sexual assault survivors. Connects to local services.',
 '{"sexual_assault", "crisis"}', '{"general"}', 'https://www.rainn.org/', 6),
('US', 'Childhelp National Child Abuse Hotline', 'crisis_line', '800-422-4453',
 NULL, '24/7', '{"en", "es"}',
 'Crisis intervention, information, and referrals for child abuse.',
 '{"child_abuse", "crisis"}', '{"children", "general"}',
 'https://www.childhelphotline.org/', 7),
('US', 'SAMHSA National Helpline', 'crisis_line', '800-662-4357', NULL, '24/7',
 '{"en", "es"}',
 'Free, confidential treatment referral and information service for substance use disorders.',
 '{"substance_use", "mental_health"}', '{"general"}',
 'https://www.samhsa.gov/find-help/national-helpline', 8),
('US', 'NAMI HelpLine', 'crisis_line', '1-800-950-6264', 'Text NAMI to 741-741',
 'Mon-Fri 10AM-10PM ET', '{"en"}',
 'Free peer support, information, and resources for mental health.',
 '{"mental_health", "crisis"}', '{"general"}', 'https://www.nami.org/help', 9);

-- UNITED KINGDOM: Specialized services
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('GB', 'National Suicide Prevention Helpline UK', 'crisis_line', '0800 689 5652',
 NULL, '6PM-midnight daily', '{"en"}',
 'Free, anonymous support for anyone with thoughts of suicide.',
 '{"suicide", "crisis"}', '{"general"}',
 'https://www.spbristol.org/', 2),
('GB', 'CALM (Campaign Against Living Miserably)', 'crisis_line', '0800 58 58 58',
 NULL, '5PM-midnight daily', '{"en"}',
 'Leading movement against suicide. Support for men in crisis.',
 '{"suicide", "mental_health", "crisis"}', '{"men"}',
 'https://www.thecalmzone.net/', 3),
('GB', 'Papyrus HOPELINEUK', 'crisis_line', '0800 068 4141',
 'Text 07786 209 697', '24/7', '{"en"}',
 'Confidential support and advice for young people under 35 struggling with thoughts of suicide.',
 '{"suicide", "crisis"}', '{"youth"}', 'https://www.papyrus-uk.org/', 4),
('GB', 'Lifeline (Northern Ireland)', 'crisis_line', '0808 808 8000',
 'Textphone: 18001 0808 808 8000', '24/7', '{"en"}',
 'Crisis response helpline for Northern Ireland. Immediate support in a crisis.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.lifelinehelpline.info/', 5),
('GB', 'Emergency Services (112)', 'emergency_number', '112', NULL, '24/7',
 '{"en"}',
 'Alternative to 999. For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- AUSTRALIA: Specialized services and alternate emergency numbers
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, chat_url, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('AU', 'Beyond Blue', 'crisis_line', '1300 224 636',
 'https://www.beyondblue.org.au/get-support/get-immediate-support', '24/7',
 '{"en"}',
 'Mental health support, information and suicide prevention. Phone and web chat available.',
 '{"suicide", "mental_health", "crisis", "anxiety", "depression"}',
 '{"general"}', 'https://www.beyondblue.org.au/', 3),
('AU', 'Kids Helpline', 'crisis_line', '1800 551 800',
 'https://kidshelpline.com.au/get-help/webchat-counselling', '24/7',
 '{"en"}',
 'Free, confidential counselling for children and young people aged 5-25.',
 '{"suicide", "mental_health", "crisis"}', '{"youth", "children"}',
 'https://kidshelpline.com.au/', 4),
('AU', 'Suicide Call Back Service', 'crisis_line', '1300 659 467',
 'https://www.suicidecallbackservice.org.au/phone-and-online-counselling/', '24/7',
 '{"en"}',
 'Free professional telephone and online counselling for anyone affected by suicide.',
 '{"suicide", "crisis"}', '{"general"}',
 'https://www.suicidecallbackservice.org.au/', 5),
('AU', 'MensLine Australia', 'crisis_line', '1300 789 978',
 'https://mensline.org.au/phone-and-video-counselling/', '24/7', '{"en"}',
 'Professional telephone and online support for men with family and relationship concerns.',
 '{"suicide", "mental_health", "crisis", "relationships"}', '{"men"}',
 'https://mensline.org.au/', 6),
('AU', '1800RESPECT', 'crisis_line', '1800 737 732', 'Text 0458 737 732', '24/7',
 '{"en"}',
 'National sexual assault, domestic and family violence counselling service.',
 '{"sexual_assault", "domestic_violence", "crisis"}', '{"general", "women"}',
 'https://www.1800respect.org.au/', 7),
('AU', '13YARN', 'crisis_line', '13 92 76', NULL, '24/7', '{"en"}',
 'Free, confidential crisis support service for Aboriginal and Torres Strait Islander peoples.',
 '{"suicide", "mental_health", "crisis"}', '{"indigenous"}',
 'https://www.13yarn.org.au/', 8),
('AU', 'QLife', 'crisis_line', '1800 184 527',
 'https://qlife.org.au/get-help/web-chat', '3PM-midnight daily', '{"en"}',
 'Anonymous and free LGBTQIA+ peer support and referral.',
 '{"suicide", "mental_health", "crisis", "lgbtq"}', '{"lgbtq"}',
 'https://qlife.org.au/', 9),
('AU', 'Open Arms - Veterans & Families', 'crisis_line', '1800 011 046', NULL,
 '24/7', '{"en"}',
 'Free and confidential mental health support for current and former ADF members and their families.',
 '{"suicide", "mental_health", "crisis", "veterans"}', '{"veterans"}',
 'https://www.openarms.gov.au/', 10),
('AU', 'Butterfly National Helpline', 'crisis_line', '1800 33 4673',
 'https://butterfly.org.au/get-support/helpline/', '8AM-midnight daily', '{"en"}',
 'Support for people affected by eating disorders and body image issues.',
 '{"eating_disorders", "mental_health"}', '{"general"}',
 'https://butterfly.org.au/', 11),
('AU', 'Emergency Services (112)', 'emergency_number', '112', NULL, '24/7',
 '{"en"}',
 'Alternative to 000. For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),
('AU', 'Emergency Services (106)', 'emergency_number', '106', NULL, '24/7',
 '{"en"}',
 'Text-based emergency (TTY/TDD). For deaf/hearing impaired.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- GERMANY: Expanded services
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, chat_url, availability, languages,
  description, service_scope, population_served, website_url,
  alternative_numbers, display_order
) VALUES
('DE', 'Telefonseelsorge (Alternative)', 'crisis_line', '0800 111 0 222', NULL, NULL, '24/7',
 '{"de"}',
 'Alternative number for 24/7 crisis support and pastoral counseling.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.telefonseelsorge.de/',
 '[{"phone": "116 123", "description": "Another alternative", "languages": ["de"]}]'::jsonb,
 2),
('DE', 'krisenchat', 'text_line', NULL, NULL, 'https://krisenchat.de/', '24/7', '{"de"}',
 'Free, anonymous text and WhatsApp crisis support for children, teens and young adults under 25.',
 '{"suicide", "mental_health", "crisis"}', '{"youth", "children"}',
 'https://krisenchat.de/', NULL, 3),
('DE', 'Hilfetelefon "Gewalt gegen Frauen"', 'crisis_line', '116 016', NULL, 'https://www.hilfetelefon.de/das-hilfetelefon/beratung/web-chat.html',
 '24/7',
 '{"de", "en"}',
 'Free, anonymous 24/7 support hotline for women experiencing violence. Available in 18 languages.',
 '{"domestic_violence", "sexual_assault", "crisis"}', '{"women"}',
 'https://www.hilfetelefon.de/', NULL, 4),
('DE', 'Hilfetelefon Gewalt an Männern', 'crisis_line', '0800 1239900', NULL, 'https://www.maennerhilfetelefon.de/beratung/online-beratung/',
 'Mon-Thu 9AM-1PM & 4-8PM, Fri 9AM-3PM', '{"de"}',
 'Support hotline for men experiencing violence.',
 '{"domestic_violence", "crisis"}', '{"men"}',
 'https://www.maennerhilfetelefon.de/', NULL, 5),
('DE', 'Nummer gegen Kummer (Kinder)', 'crisis_line', '116 111', NULL, 'https://www.nummergegenkummer.de/onlineberatung/',
 'Mon-Sat 2-8PM', '{"de"}',
 'Free, anonymous counseling for children and youth.',
 '{"mental_health", "crisis"}', '{"children", "youth"}',
 'https://www.nummergegenkummer.de/', NULL, 6),
('DE', 'Nummer gegen Kummer (Eltern)', 'crisis_line', '0800 111 0 550', NULL, NULL,
 'Mon-Fri 9AM-5PM, Tue & Thu until 7PM', '{"de"}',
 'Free, anonymous counseling for parents.',
 '{"mental_health", "crisis", "parenting"}', '{"general"}',
 'https://www.nummergegenkummer.de/', NULL, 7),
('DE', 'Police Emergency', 'emergency_number', '110', NULL, NULL, '24/7',
 '{"de", "en"}', 'Police emergency number.',
 '{"emergency"}', '{"general"}', NULL, NULL, 98);

-- ADDITIONAL EUROPEAN COUNTRIES (NL, BE, AT, CH, SE, NO, FI, DK, PL)
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, chat_url, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
-- Netherlands
('NL', '113 Zelfmoordpreventie', 'crisis_line', '113',
 'https://www.113.nl/ik-denk-aan-zelfmoord/hulplijn', '24/7', '{"nl"}',
 'National suicide prevention hotline and webchat.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.113.nl/', 1),
('NL', '113 (Toll-free)', 'crisis_line', '0800 0113', NULL, '24/7', '{"nl"}',
 'Free alternative number for suicide prevention.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.113.nl/', 2),
('NL', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"nl", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Belgium
('BE', 'Zelfmoordlijn 1813', 'crisis_line', '1813',
 'https://www.zelfmoord1813.be/chat-met-zelfmoordlijn-1813', '24/7', '{"nl"}',
 'Free 24/7 suicide prevention phone line and webchat (Dutch).',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.zelfmoord1813.be/', 1),
('BE', 'Centre de Prévention du Suicide', 'crisis_line', '0800 32 123', NULL,
 '24/7', '{"fr"}',
 'Free 24/7 suicide prevention phone line (French).',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.preventionsuicide.be/', 2),
('BE', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"nl", "fr", "de", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Austria
('AT', 'Telefonseelsorge', 'crisis_line', '142', NULL, '24/7', '{"de"}',
 'Free 24/7 pastoral counseling and crisis support.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.telefonseelsorge.at/', 1),
('AT', 'Rat auf Draht', 'crisis_line', '147', NULL, '24/7', '{"de"}',
 'Free 24/7 crisis number for children, youth and their caregivers.',
 '{"mental_health", "crisis"}', '{"children", "youth", "general"}',
 'https://www.rataufdraht.at/', 2),
('AT', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"de", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Switzerland
('CH', 'Die dargebotene Hand / La Main Tendue / Telefono Amico', 'crisis_line',
 '143', 'https://www.143.ch/beratung', '24/7',
 '{"de", "fr", "it"}',
 'Free 24/7 crisis support in German, French, and Italian.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.143.ch/', 1),
('CH', 'Pro Juventute', 'crisis_line', '147', 'https://www.147.ch/', '24/7',
 '{"de", "fr", "it"}',
 'Free 24/7 counseling for children and youth under 18.',
 '{"mental_health", "crisis"}', '{"children", "youth"}',
 'https://www.147.ch/', 2),
('CH', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"de", "fr", "it", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Sweden
('SE', 'Självmordslinjen (Suicide Prevention)', 'crisis_line', '90101',
 'https://mind.se/sjalvmordslinjen/', '24/7', '{"sv"}',
 'Free 24/7 suicide prevention hotline, chat and email.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://mind.se/sjalvmordslinjen/', 1),
('SE', 'BRIS (Children''s Rights)', 'crisis_line', '116 111',
 'https://www.bris.se/', 'Daily 2PM-9PM', '{"sv"}',
 'Free anonymous support for children and youth up to age 18.',
 '{"mental_health", "crisis"}', '{"children", "youth"}',
 'https://www.bris.se/', 2),
('SE', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"sv", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Norway
('NO', 'Mental Helse', 'crisis_line', '116 123', 'https://mentalhelse.no/', '24/7',
 '{"no"}', 'Free 24/7 mental health support hotline.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://mentalhelse.no/', 1),
('NO', 'Kirkens SOS', 'crisis_line', '22 40 00 40', 'https://www.soschat.no/', '24/7',
 '{"no"}',
 'Free 24/7 phone and chat support.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.kirkens-sos.no/', 2),
('NO', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"no", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Finland
('FI', 'MIELI Mental Health Finland (Finnish)', 'crisis_line', '09 2525 0111',
 NULL, '24/7', '{"fi"}',
 'Free 24/7 crisis support in Finnish.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://mieli.fi/', 1),
('FI', 'MIELI Mental Health Finland (Swedish)', 'crisis_line', '09 2525 0112',
 NULL, '24/7', '{"sv"}',
 'Free 24/7 crisis support in Swedish.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://mieli.fi/', 2),
('FI', 'MIELI Mental Health Finland (Arabic/English)', 'crisis_line',
 '09 2525 0113', NULL, '24/7', '{"ar", "en"}',
 'Free 24/7 crisis support in Arabic and English.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://mieli.fi/', 3),
('FI', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"fi", "sv", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Denmark
('DK', 'Livslinien', 'crisis_line', '70 201 201',
 'https://www.livslinien.dk/', 'Daily 11AM-4AM', '{"da"}',
 'Free telephone and online chat support.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.livslinien.dk/', 1),
('DK', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"da", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99),

-- Poland
('PL', 'Kryzysowy Telefon Zaufania', 'crisis_line', '116 123',
 'https://116sos.pl/', 'Daily 2PM-10PM', '{"pl"}',
 'Crisis hotline for adults in mental crisis.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://116sos.pl/', 1),
('PL', 'Telefon Zaufania dla Dzieci i Młodzieży', 'crisis_line', '116 111',
 NULL, '24/7', '{"pl"}',
 'Free 24/7 helpline for children and youth under 18.',
 '{"mental_health", "crisis"}', '{"children", "youth"}',
 'https://116111.pl/', 2),
('PL', 'ITAKA Foundation Crisis Line', 'crisis_line', '800 70 2222', NULL,
 '24/7', '{"pl"}',
 'Free 24/7 mental crisis hotline.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.itaka.org.pl/', 3),
('PL', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"pl", "en"}',
 'For immediate life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- ----------------------------------------------------------------------------
-- 4. PHASE 2: MAJOR MISSING COUNTRIES
--    (from 006_crisis_resources_phase2_major_countries.sql)
-- ----------------------------------------------------------------------------

-- SOUTH AFRICA
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, chat_url, availability,
  languages, description, service_scope, population_served, website_url,
  display_order
) VALUES
('ZA', 'Suicide Crisis Line', 'crisis_line', '0800 567 567', 'Text 31393', NULL,
 '24/7', '{"en", "af", "zu", "xh"}',
 'Free 24/7 suicide prevention and crisis support. Run by SADAG.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.sadag.org/', 1),
('ZA', 'LifeLine South Africa', 'crisis_line', '0861 322 322', NULL, NULL,
 'Varies by region', '{"en", "af"}',
 'Crisis intervention, counseling and suicide prevention.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://lifelinesa.co.za/', 2),
('ZA', 'Stop Gender Violence Helpline', 'crisis_line', '0800 150 150', NULL,
 NULL, '24/7', '{"en", "af"}',
 'Support for survivors of gender-based violence.',
 '{"domestic_violence", "sexual_assault", "crisis"}',
 '{"women", "general"}', 'https://lifelinesa.co.za/', 3),
('ZA', 'Childline South Africa', 'crisis_line', '116', NULL,
 'https://childlinesa.org.za/', '24/7',
 '{"en", "af", "zu", "xh"}',
 'Free crisis support and counseling for children and youth.',
 '{"child_abuse", "mental_health", "crisis"}',
 '{"children", "youth"}', 'https://childlinesa.org.za/', 4),
('ZA', 'DSD Substance Abuse Line', 'crisis_line', '0800 12 13 14',
 'Text 32312', NULL, '24/7', '{"en", "af"}',
 'Department of Social Development substance abuse helpline.',
 '{"substance_use", "crisis"}', '{"general"}',
 'https://www.sadag.org/', 5),
('ZA', 'Netcare Akeso Crisis Line', 'crisis_line', '0861 435 787', NULL, NULL,
 '24/7', '{"en", "af"}',
 '24/7 psychiatric crisis intervention service.',
 '{"mental_health", "crisis", "suicide"}', '{"general"}',
 'https://akeso.co.za/', 6),
('ZA', 'Tears Foundation Hope Line', 'crisis_line', '08000 83277',
 'WhatsApp available', NULL, '24/7', '{"en", "af"}',
 'Support for rape and sexual abuse survivors.',
 '{"sexual_assault", "crisis"}', '{"general"}',
 'https://tears.co.za/', 7),
('ZA', 'Triangle Project', 'crisis_line', '(021) 712-6699', NULL, NULL,
 'Daily 13:00-21:00', '{"en", "af"}',
 'Support for LGBTQIA+ individuals.',
 '{"lgbtq", "mental_health", "crisis"}', '{"lgbtq"}',
 'https://triangle.org.za/', 8),
('ZA', 'Police Emergency', 'emergency_number', '10111', NULL, NULL, '24/7',
 '{"en", "af", "zu", "xh"}',
 'Police emergency services.',
 '{"emergency"}', '{"general"}', NULL, 99),
('ZA', 'Ambulance Emergency', 'emergency_number', '10177', NULL, NULL, '24/7',
 '{"en", "af", "zu", "xh"}',
 'Ambulance and medical emergency.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- SINGAPORE
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, chat_url, availability,
  languages, description, service_scope, population_served, website_url,
  display_order
) VALUES
('SG', 'Samaritans of Singapore (SOS)', 'crisis_line', '1767', NULL, NULL,
 '24/7', '{"en", "zh", "ms", "ta"}',
 'Free, confidential 24/7 suicide prevention hotline.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://sos.org.sg/', 1),
('SG', 'National Mindline 1771', 'crisis_line', '1771', NULL,
 'https://www.mindline.sg/', '24/7',
 '{"en", "zh", "ms", "ta"}',
 'National 24/7 mental health helpline with trained counselors. Launched 2025.',
 '{"mental_health", "crisis", "suicide"}', '{"general"}',
 'https://www.mindline.sg/', 2),
('SG', 'SAMH Helpline', 'crisis_line', '1800 283 7019', NULL, NULL, '24/7',
 '{"en"}',
 'Singapore Association for Mental Health toll-free helpline.',
 '{"mental_health", "crisis"}', '{"general"}',
 'https://www.samhealth.org.sg/', 3),
('SG', 'Police Emergency', 'emergency_number', '999', NULL, NULL, '24/7',
 '{"en", "zh", "ms", "ta"}',
 'Police emergency.', '{"emergency"}', '{"general"}', NULL, 99),
('SG', 'Ambulance Emergency', 'emergency_number', '995', NULL, NULL, '24/7',
 '{"en", "zh", "ms", "ta"}',
 'Ambulance and medical emergency.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- HONG KONG
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, chat_url, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('HK', 'The Samaritans Hong Kong', 'crisis_line', '2896 0000', NULL, '24/7',
 '{"zh", "en"}',
 'Free, confidential 24/7 emotional support and suicide prevention.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://samaritans.org.hk/', 1),
('HK', 'The Samaritan Befrienders Hong Kong', 'crisis_line', '2389 2222', NULL,
 '24/7', '{"zh"}',
 '24/7 crisis support in Cantonese and Mandarin.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.sbhk.org.hk/', 2),
('HK', 'The Samaritan Befrienders (English)', 'crisis_line', '2389 2223', NULL,
 'Mon-Fri 18:30-22:30', '{"en"}',
 'English-language emotional support and crisis counseling.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.sbhk.org.hk/', 3),
('HK', 'Caritas Crisis Line', 'crisis_line', '18288', 'https://www.fcec.caritas.org.hk/', '24/7',
 '{"zh"}', 'Free 24/7 crisis support and counseling.',
 '{"mental_health", "crisis"}', '{"general"}',
 'https://www.fcec.caritas.org.hk/', 4),
('HK', 'Suicide Prevention Services', 'crisis_line', '2382 0000', 'https://www.sps.org.hk/', '24/7',
 '{"zh"}', '24/7 suicide prevention and crisis intervention.',
 '{"suicide", "crisis"}', '{"general"}',
 'https://www.sps.org.hk/', 5),
('HK', 'Harmony House (Women)', 'crisis_line', '2522 0434', NULL, '24/7',
 '{"zh", "en"}',
 '24/7 crisis intervention for female domestic violence victims.',
 '{"domestic_violence", "crisis"}', '{"women"}',
 'https://www.harmonyhousehk.org/', 6),
('HK', 'Harmony House (Men)', 'crisis_line', '2295 1386', NULL, 'Varies',
 '{"zh", "en"}',
 'Support services for male domestic violence victims.',
 '{"domestic_violence", "crisis"}', '{"men"}',
 'https://www.harmonyhousehk.org/', 7),
('HK', 'Youth Link (SPS)', 'crisis_line', '2382 0777', NULL,
 'Daily 14:00-02:00', '{"zh"}',
 'Crisis counseling for youth under 24.',
 '{"suicide", "mental_health", "crisis"}', '{"youth"}',
 'https://www.sps.org.hk/', 8),
('HK', 'Hospital Authority Mental Health Hotline', 'crisis_line', '2466 7350',
 NULL, '24/7', '{"zh", "en"}',
 '24/7 mental health direct helpline.',
 '{"mental_health", "crisis"}', '{"general"}', NULL, 9),
('HK', 'Emergency Services', 'emergency_number', '999', NULL, '24/7',
 '{"zh", "en"}',
 'For life-threatening emergencies.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- PHILIPPINES
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('PH', 'NCMH Crisis Hotline', 'crisis_line', '1553',
 '0917 899 8727 (USAP), 0966 351 4518, 0908 639 2672', '24/7',
 '{"en", "tl"}',
 'National Center for Mental Health 24/7 crisis hotline.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://ncmh.gov.ph/', 1),
('PH', 'Natasha Goulbourn Foundation', 'crisis_line', '(02) 8804-4673',
 '0917 558 4673, 0918 873 4673', '24/7', '{"en", "tl"}',
 '24/7 crisis support for people in suicidal distress.',
 '{"suicide", "crisis"}', '{"general"}',
 'https://www.ngf-mindstrong.org/', 2),
('PH', 'In Touch Crisis Line', 'crisis_line', '+63 2 8893 7603',
 '0917 800 1123, 0922 893 8944', '24/7', '{"en"}',
 'Free 24/7 crisis intervention and support services.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.in-touch.org/', 3),
('PH', 'Manila Lifeline Centre', 'crisis_line', '(02) 8896-9191', NULL,
 'Varies', '{"en", "tl"}',
 'Crisis counseling and suicide prevention.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}', NULL, 4),
('PH', 'Bantay Bata 163', 'crisis_line', '163', NULL, 'Daily 07:00-19:00',
 '{"en", "tl"}',
 'Child protection helpline with online chat.',
 '{"child_abuse", "crisis"}', '{"children"}',
 'https://abs-cbnfoundation.com/', 5),
('PH', 'Emergency Services', 'emergency_number', '911', NULL, '24/7',
 '{"en", "tl"}',
 'National emergency hotline.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- NIGERIA
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('NG', 'Asido Foundation', 'crisis_line', '+234 902 808 0416',
 'Text and WhatsApp available', '24/7', '{"en"}',
 'Mental health support and suicide prevention. Lifeline International member.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://asidofoundation.com/', 1),
('NG', 'SURPIN Helpline Nigeria', 'crisis_line', '080 0078 7746',
 'WhatsApp available', 'Varies', '{"en"}',
 'Suicide Research and Prevention Initiative Nigeria. Lifeline member.',
 '{"suicide", "crisis"}', '{"general"}',
 'https://surpinng.com/', 2),
('NG', 'Mentally Aware Nigeria Initiative (MANI)', 'crisis_line',
 '(809) 111-6264', 'Text and call', 'Varies', '{"en"}',
 'Mental health awareness and support.',
 '{"mental_health", "crisis"}', '{"general"}',
 'https://mentallyaware.org/', 3),
('NG', 'Women Safe House Sustenance Initiative', 'crisis_line',
 '+234 812 113 3399', 'Text, call, WhatsApp', 'Varies',
 '{"en"}',
 'Support for women in crisis and domestic violence situations.',
 '{"domestic_violence", "crisis"}', '{"women"}',
 'https://womensafehouse.org/', 4),
('NG', 'WARIF (Women at Risk)', 'crisis_line', '+234 800 9210 0009',
 'Text and call', '24/7', '{"en"}',
 'Free 24/7 support for sexual assault survivors.',
 '{"sexual_assault", "crisis"}', '{"women", "general"}',
 'https://warifng.org/', 5),
('NG', 'The Cece Yara 24 Hour Child Helpline', 'crisis_line', '0800 800 8001',
 'Text 09029880445', '24/7', '{"en"}',
 'Free 24/7 child abuse and protection helpline.',
 '{"child_abuse", "crisis"}', '{"children"}',
 'https://ceceyara.org/', 6),
('NG', 'Emergency Services', 'emergency_number', '112', NULL, '24/7',
 '{"en"}',
 'National emergency number.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- EGYPT
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('EG', 'General Secretariat Mental Health Hotline', 'crisis_line', '16328',
 '24/7', '{"ar"}',
 '24/7 mental health support hotline by Ministry of Health.',
 '{"mental_health", "suicide", "crisis"}', '{"general"}',
 'https://mohp.gov.eg/', 1),
('EG', 'Befrienders Cairo', 'crisis_line', '762 2381', 'Varies',
 '{"ar", "en"}',
 'Emotional support helpline.',
 '{"mental_health", "crisis"}', '{"general"}',
 'https://befrienderscairo.com/', 2),
('EG', 'Unified Emergency Services', 'emergency_number', '123', '24/7',
 '{"ar"}',
 'Unified emergency number (police, ambulance, fire).',
 '{"emergency"}', '{"general"}', NULL, 99);

-- ISRAEL
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('IL', 'Eran.org.il', 'crisis_line', '1201',
 'SMS: 076-88444-00 (Sun-Fri 14:00-18:00)', '24/7',
 '{"he", "ar", "ru", "en"}',
 'Free 24/7 emotional support and suicide prevention in multiple languages.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.eran.org.il/', 1),
('IL', 'Police Emergency', 'emergency_number', '100', NULL, '24/7',
 '{"he", "ar", "en"}',
 'Police emergency.', '{"emergency"}', '{"general"}', NULL, 99),
('IL', 'Medical Emergency (Magen David Adom)', 'emergency_number', '101',
 NULL, '24/7', '{"he", "ar", "en"}',
 'Ambulance and medical emergency.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- CHINA
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, chat_url, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('CN', 'Beijing Suicide Research and Prevention Center', 'crisis_line',
 '800-810-1117', NULL, '24/7', '{"zh"}',
 'WHO Collaborating Centre. Toll-free for landlines. For mobile: 010-8295-1332',
 '{"suicide", "crisis"}', '{"general"}',
 'http://www.crisis.org.cn/', 1),
('CN', 'Beijing Suicide Hotline (Mobile)', 'crisis_line', '010-8295-1332', NULL,
 '24/7', '{"zh"}',
 'Suicide prevention for mobile and VoIP callers.',
 '{"suicide", "crisis"}', '{"general"}',
 'http://www.crisis.org.cn/', 2),
('CN', 'Lifeline China', 'crisis_line', '400 821 1215',
 'https://www.lifelinechina.org/', 'Daily 10:00-22:00',
 '{"zh", "en"}',
 'Mental health support and crisis counseling.',
 '{"mental_health", "crisis"}', '{"general"}',
 'https://www.lifelinechina.org/', 3),
('CN', '希望24热线 (Hope Line)', 'crisis_line', '400-161-9995', NULL, '24/7',
 '{"zh"}',
 '24/7 mental health crisis support.',
 '{"mental_health", "suicide", "crisis"}', '{"general"}',
 'http://hope9995.com/', 4),
('CN', '12356 NCMHC', 'crisis_line', '12356', NULL, 'Varies', '{"zh"}',
 'National Center for Mental Health Crisis support.',
 '{"mental_health", "crisis"}', '{"general"}',
 'http://ncmhc.org.cn/', 5),
('CN', 'Police Emergency', 'emergency_number', '110', NULL, '24/7', '{"zh"}',
 'Police emergency.', '{"emergency"}', '{"general"}', NULL, 99),
('CN', 'Medical Emergency', 'emergency_number', '120', NULL, '24/7', '{"zh"}',
 'Ambulance and medical emergency.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- TAIWAN
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('TW', 'MOHW Suicide Prevention Line', 'crisis_line', '1925', '24/7', '{"zh"}',
 'Ministry of Health and Welfare suicide prevention hotline.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'https://www.mohw.gov.tw/', 1),
('TW', 'Lifeline Taiwan', 'crisis_line', '1995', '24/7', '{"zh"}',
 'Free 24/7 emotional support and crisis intervention.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'http://www.life1995.org.tw/', 2),
('TW', 'Emergency Services', 'emergency_number', '119', '24/7', '{"zh"}',
 'Unified emergency services.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- SOUTH KOREA (CORRECTED / EXPANDED)
UPDATE public.crisis_resources
SET
  name = 'LifeLine Korea',
  phone = '1588-9191',
  description = '24/7 suicide prevention and crisis counseling. National hotline.',
  website_url = 'http://www.lifeline.or.kr/',
  service_scope = ARRAY['suicide', 'mental_health', 'crisis'],
  population_served = ARRAY['general']
WHERE country_code = 'KR' AND display_order = 1;

INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, website_url, display_order
) VALUES
('KR', 'Mental Health Crisis Counseling', 'crisis_line', '1577-0199', '24/7',
 '{"ko"}',
 '24/7 mental health crisis counseling service.',
 '{"mental_health", "crisis"}', '{"general"}', NULL, 2),
('KR', 'Ministry of Health Call Center', 'crisis_line', '129', '24/7', '{"ko"}',
 '24/7 Ministry of Health and Welfare call center.',
 '{"mental_health", "general"}', '{"general"}', NULL, 3),
('KR', 'Youth Cyber Counseling Center', 'crisis_line', '1388',
 'Varies', '{"ko"}',
 'Support for youth aged 9-24. Call and online chat. Live chat available.',
 '{"mental_health", "crisis"}', '{"youth", "children"}',
 'https://www.cyber1388.kr/', 4),
('KR', 'Suicide Prevention Line', 'crisis_line', '109', '24/7', '{"ko"}',
 'Direct suicide prevention hotline.',
 '{"suicide", "crisis"}', '{"general"}', NULL, 5);

-- THAILAND
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, availability, languages,
  description, service_scope, population_served, display_order
) VALUES
('TH', 'Department of Mental Health Hotline', 'crisis_line', '1323', '24/7',
 '{"th"}',
 'Free 24/7 mental health crisis support.',
 '{"mental_health", "suicide", "crisis"}', '{"general"}', 1),
('TH', 'Samaritans of Thailand', 'crisis_line', '(02) 713-6793', 'Varies',
 '{"th"}',
 'Emotional support and suicide prevention.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}', 2),
('TH', 'Samaritans of Thailand (English)', 'crisis_line', '(02) 713-6791',
 'Varies', '{"en"}',
 'English-language emotional support.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}', 3),
('TH', 'Police Emergency', 'emergency_number', '191', '24/7', '{"th"}',
 'Police emergency.', '{"emergency"}', '{"general"}', 99),
('TH', 'Medical Emergency', 'emergency_number', '1669', '24/7', '{"th"}',
 'Medical emergency and ambulance.',
 '{"emergency"}', '{"general"}', 99);

-- MALAYSIA
INSERT INTO public.crisis_resources (
  country_code, name, type, phone, text_instructions, chat_url, availability,
  languages, description, service_scope, population_served, website_url,
  display_order
) VALUES
('MY', 'Kasih Helpline', 'crisis_line', '15999', 'Available as mobile app',
 NULL, '24/7', '{"ms", "en"}',
 'Official 24/7 crisis hotline and counseling service.',
 '{"mental_health", "suicide", "crisis"}', '{"general"}',
 NULL, 1),
('MY', 'Befrienders Malaysia', 'crisis_line', 'Varies by region', NULL,
 'http://www.befrienders.org.my/', '24/7',
 '{"ms", "en", "zh"}',
 'Emotional support centers across Malaysia. Check website for regional numbers.',
 '{"suicide", "mental_health", "crisis"}', '{"general"}',
 'http://www.befrienders.org.my/', 2),
('MY', 'MIASA Crisis Line', 'crisis_line', '1-800-820066',
 'WhatsApp available', NULL, '24/7',
 '{"ms", "en"}',
 'Free 24/7 crisis hotline and counseling. WhatsApp support available.',
 '{"mental_health", "suicide", "crisis"}', '{"general"}',
 'https://miasa.org.my/', 3),
('MY', 'Buddy Bear Children''s Helpline', 'crisis_line', '03-9779 5550', NULL,
 NULL, 'Daily 12:00-24:00', '{"ms", "en", "zh"}',
 'Crisis hotline for children. Also available via Facebook Messenger.',
 '{"mental_health", "crisis"}', '{"children", "youth"}',
 'https://www.humankind.my/buddybear-helpline', 4),
('MY', 'Emergency Services', 'emergency_number', '999', NULL, NULL, '24/7',
 '{"ms", "en"}',
 'Police, ambulance, and fire emergency.',
 '{"emergency"}', '{"general"}', NULL, 99);

-- ============================================================================
-- Seed complete. Future updates should be done via new migrations,
-- not by editing this baseline seed.
-- ============================================================================


