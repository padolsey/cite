# Crisis Resources Analysis & Recommendations

## Executive Summary

After comparing the migration file `003_crisis_resources.sql` with the canonical data from the comprehensive research document, I've identified:

- ✅ **15 countries** currently in migration (good foundation)
- 🔴 **Major gaps**: Missing 100+ countries from canonical data
- 🟡 **Incomplete coverage**: Many countries have only 1-2 resources when 5-10+ are available
- 🟢 **Critical updates needed**: Several countries have new national hotlines (e.g., Canada 988, Spain 024, France 3114)

---

## Critical Updates Needed (Existing Countries)

### 🔴 HIGH PRIORITY: New National Hotlines

#### 1. **Canada - 988 CRISIS HOTLINE** (LAUNCHED 2023)
**Status**: MISSING FROM MIGRATION
**Canonical Source**: Government of Canada official launch Nov 30, 2023

```sql
-- UPDATE: Canada now has 988 (replacing Talk Suicide Canada as primary)
('CA', '988 Suicide Crisis Helpline', 'crisis_line', '988', 'Text 988', '24/7', '{"en", "fr"}', 'Free, confidential suicide crisis support. Launched November 2023.', 1),
-- Keep Talk Suicide Canada as secondary
-- UPDATE display_order for Talk Suicide Canada to 3
```

#### 2. **Spain - 024 National Suicide Prevention Line**
**Status**: MISSING FROM MIGRATION
**Canonical Source**: Ministry of Health official line

```sql
-- ADD: Spain's national 024 line (should be PRIMARY, not Teléfono de la Esperanza)
('ES', 'Línea 024', 'crisis_line', '024', NULL, '24/7', '{"es"}', 'Línea de atención a la conducta suicida. Free 24/7 national suicide prevention hotline.', 1),
```

#### 3. **France - 3114 National Suicide Prevention**
**Status**: MISSING FROM MIGRATION
**Canonical Source**: Official government suicide prevention hotline

```sql
-- ADD: France's 3114 national line (should be PRIMARY)
('FR', '3114 - Suicide Prevention', 'crisis_line', '3114', NULL, '24/7', '{"fr"}', 'Ligne nationale de prévention du suicide. Free, confidential 24/7 support.', 1),
```

---

## Major Coverage Gaps by Country

### 🟡 Countries with Incomplete Data

#### **United States** (Has 3, Should Have 11+)
**Missing Specialized Lines:**

```sql
-- Veterans
('US', 'Veterans Crisis Line', 'crisis_line', '988', 'Text 838255', '24/7', '{"en", "es"}', 'Press 1 after dialing 988. Specialized support for veterans and their families.', 2),

-- LGBTQ+ Youth
('US', 'The Trevor Project', 'crisis_line', '1-866-488-7386', 'Text START to 678-678', '24/7', '{"en", "es"}', 'Crisis intervention for LGBTQ+ youth under 25.', 3),

-- Trans-specific
('US', 'Trans Lifeline', 'crisis_line', '1-877-565-8860', NULL, 'Mon-Fri 10AM-6PM PT', '{"en"}', 'Peer support hotline for transgender people, by transgender people.', 4),

-- Domestic Violence
('US', 'National Domestic Violence Hotline', 'crisis_line', '800-799-7233', 'Text START to 88788', '24/7', '{"en", "es"}', 'Support for survivors of domestic violence.', 5),

-- Sexual Assault
('US', 'RAINN National Sexual Assault Hotline', 'crisis_line', '800-656-4673', NULL, '24/7', '{"en", "es"}', 'Free, confidential support for sexual assault survivors.', 6),

-- Child Abuse
('US', 'Childhelp National Child Abuse Hotline', 'crisis_line', '800-422-4453', NULL, '24/7', '{"en", "es"}', 'Crisis intervention and referrals for child abuse.', 7),

-- Substance Use
('US', 'SAMHSA National Helpline', 'crisis_line', '800-662-4357', NULL, '24/7', '{"en", "es"}', 'Treatment referral and information for substance use disorders.', 8),

-- Mental Health (Peer)
('US', 'NAMI HelpLine', 'crisis_line', '1-800-950-6264', 'Text NAMI to 741-741', 'Mon-Fri 10AM-10PM ET', '{"en"}', 'Peer support and mental health resources.', 9),
```

#### **United Kingdom** (Has 3, Should Have 7+)
**Missing Critical Lines:**

```sql
-- National Suicide Prevention (England-specific)
('GB', 'National Suicide Prevention Helpline UK', 'crisis_line', '0800 689 5652', NULL, '6PM-midnight daily', '{"en"}', 'Free, anonymous support for anyone with thoughts of suicide.', 2),

-- Men's Mental Health
('GB', 'CALM (Campaign Against Living Miserably)', 'crisis_line', '0800 58 58 58', NULL, '5PM-midnight daily', '{"en"}', 'Support for men in crisis.', 3),

-- Youth Suicide Prevention
('GB', 'Papyrus HOPELINEUK', 'crisis_line', '0800 068 4141', 'Text 07786 209 697', '24/7', '{"en"}', 'Suicide prevention for people under 35.', 4),

-- Northern Ireland
('GB', 'Lifeline (Northern Ireland)', 'crisis_line', '0808 808 8000', 'Textphone: 18001 0808 808 8000', '24/7', '{"en"}', 'Crisis response helpline for Northern Ireland.', 5),

-- Also: 112 is alternative emergency number (same as 999)
```

#### **Australia** (Has 3, Should Have 10+)
**Missing Critical Services:**

```sql
-- Mental Health
('AU', 'Beyond Blue', 'crisis_line', '1300 224 636', NULL, '24/7', '{"en"}', 'Mental health support and suicide prevention.', 3),

-- Youth
('AU', 'Kids Helpline', 'crisis_line', '1800 551 800', NULL, '24/7', '{"en"}', 'Counseling for children and young people (5-25 years).', 4),

-- Suicide-specific callback
('AU', 'Suicide Call Back Service', 'crisis_line', '1300 659 467', NULL, '24/7', '{"en"}', 'Free professional telephone and online counseling.', 5),

-- Men
('AU', 'MensLine Australia', 'crisis_line', '1300 789 978', NULL, '24/7', '{"en"}', 'Support for men with family and relationship concerns.', 6),

-- Domestic/Sexual Violence
('AU', '1800RESPECT', 'crisis_line', '1800 737 732', 'Text 0458 737 732', '24/7', '{"en"}', 'National sexual assault, domestic and family violence counseling.', 7),

-- Indigenous
('AU', '13YARN', 'crisis_line', '13 92 76', NULL, '24/7', '{"en"}', 'Crisis support for Aboriginal and Torres Strait Islander peoples.', 8),

-- LGBTQ+
('AU', 'QLife', 'crisis_line', '1800 184 527', NULL, '3PM-midnight daily', '{"en"}', 'Anonymous and free LGBTI peer support and referral.', 9),

-- Also: 112 and 106 (TTY) are alternative emergency numbers
```

#### **Germany** (Has 2, Should Have 5+)
**Missing Services:**

```sql
-- Alternative Telefonseelsorge numbers
('DE', 'Telefonseelsorge (Alternative)', 'crisis_line', '0800 111 0 222', NULL, '24/7', '{"de"}', 'Alternative number for crisis support.', 2),
('DE', 'Telefonseelsorge', 'crisis_line', '116 123', NULL, '24/7', '{"de"}', 'Another option for crisis support.', 3),

-- Youth-specific text/WhatsApp
('DE', 'krisenchat', 'text_line', NULL, 'WhatsApp: +49 15735998143', '24/7', '{"de"}', 'Text and WhatsApp crisis support for youth under 25.', 4),

-- Violence Against Women
('DE', 'Hilfetelefon "Gewalt gegen Frauen"', 'crisis_line', '116 016', NULL, '24/7', '{"de"}', 'Support hotline for women experiencing violence.', 5),

-- Police emergency
('DE', 'Police Emergency', 'emergency_number', '110', NULL, '24/7', '{"de", "en"}', 'Police emergency number.', 98),
```

---

## 🔴 CRITICAL: Major Countries Completely Missing

### **Tier 1 Priority** (Large populations, comprehensive data available)

#### **South Africa** (30+ resources available!)
```sql
-- Primary
('ZA', 'Suicide Crisis Line', 'crisis_line', '0800 567 567', 'Text 31393', '24/7', '{"en", "af", "zu"}', 'Free 24/7 suicide prevention and crisis support.', 1),
('ZA', 'LifeLine South Africa', 'crisis_line', '0861 322 322', NULL, 'Varies by region', '{"en", "af"}', 'Crisis intervention and counseling.', 2),
('ZA', 'Childline South Africa', 'crisis_line', '116', NULL, '24/7', '{"en", "af", "zu"}', 'Free crisis support for children and youth.', 3),

-- Specialized
('ZA', 'Stop Gender Violence Helpline', 'crisis_line', '0800 150 150', NULL, '24/7', '{"en", "af"}', 'Support for gender-based violence survivors.', 4),
('ZA', 'Triangle Project (LGBTQ+)', 'crisis_line', '021 712 6699', NULL, 'Daily 13:00-21:00', '{"en"}', 'Support for LGBTQ+ individuals.', 5),

-- Emergency
('ZA', 'Emergency Services', 'emergency_number', '10111', NULL, '24/7', '{"en", "af", "zu"}', 'Police emergency.', 99),
```

#### **Singapore** (3 major services)
```sql
-- Primary
('SG', 'Samaritans of Singapore (SOS)', 'crisis_line', '1767', NULL, '24/7', '{"en", "zh", "ms", "ta"}', 'Free, confidential suicide prevention hotline.', 1),
('SG', 'National Mindline 1771', 'crisis_line', '1771', NULL, '24/7', '{"en", "zh", "ms", "ta"}', 'Mental health helpline with trained counselors. Launched 2025.', 2),
('SG', 'SAMH Helpline', 'crisis_line', '1800 283 7019', NULL, '24/7', '{"en"}', 'Singapore Association for Mental Health helpline.', 3),

-- Emergency
('SG', 'Police Emergency', 'emergency_number', '999', NULL, '24/7', '{"en", "zh", "ms", "ta"}', 'Police emergency.', 99),
('SG', 'Ambulance', 'emergency_number', '995', NULL, '24/7', '{"en", "zh", "ms", "ta"}', 'Ambulance emergency.', 99),
```

#### **Hong Kong** (10+ services)
```sql
-- Primary
('HK', 'The Samaritans Hong Kong', 'crisis_line', '2896 0000', NULL, '24/7', '{"zh", "en"}', 'Free, confidential crisis support.', 1),
('HK', 'The Samaritan Befrienders Hong Kong', 'crisis_line', '2389 2222', NULL, '24/7', '{"zh"}', 'Crisis support in Cantonese.', 2),
('HK', 'The Samaritan Befrienders (English)', 'crisis_line', '2389 2223', NULL, 'Mon-Fri 18:30-22:30', '{"en"}', 'English-language crisis support.', 3),

-- Emergency
('HK', 'Emergency Services', 'emergency_number', '999', NULL, '24/7', '{"zh", "en"}', 'For life-threatening emergencies.', 99),
```

#### **Philippines** (5+ services)
```sql
-- Primary
('PH', 'NCMH Crisis Hotline', 'crisis_line', '1553', NULL, '24/7', '{"en", "tl"}', 'National Center for Mental Health 24/7 hotline.', 1),
('PH', 'Natasha Goulbourn Foundation', 'crisis_line', '(02) 8804-4673', NULL, '24/7', '{"en", "tl"}', 'Crisis support for suicidal ideation.', 2),
('PH', 'In Touch Crisis Line', 'crisis_line', '+63 2 8893 7603', NULL, '24/7', '{"en"}', 'Free 24/7 crisis intervention.', 3),

-- Emergency
('PH', 'Emergency Services', 'emergency_number', '911', NULL, '24/7', '{"en", "tl"}', 'National emergency hotline.', 99),
```

#### **Nigeria** (6+ services)
```sql
-- Primary
('NG', 'Asido Foundation', 'crisis_line', '+234 902 808 0416', 'Text, WhatsApp available', '24/7', '{"en"}', 'Mental health support and suicide prevention.', 1),
('NG', 'SURPIN Helpline', 'crisis_line', '080 0078 7746', 'WhatsApp available', 'Varies', '{"en"}', 'Suicide Research and Prevention Initiative Nigeria.', 2),

-- Specialized
('NG', 'WARIF (Sexual Assault)', 'crisis_line', '+234 800 9210 0009', 'Text available', '24/7', '{"en"}', 'Women at Risk International Foundation - sexual assault support.', 3),
('NG', 'Cece Yara Child Helpline', 'crisis_line', '0800 800 8001', 'Text 09029880445', '24/7', '{"en"}', 'Free 24/7 child abuse helpline.', 4),

-- Emergency
('NG', 'Emergency Services', 'emergency_number', '112', NULL, '24/7', '{"en"}', 'National emergency number.', 99),
```

#### **Egypt** (3+ services)
```sql
-- Primary
('EG', 'General Secretariat Hotline', 'crisis_line', '16328', NULL, '24/7', '{"ar"}', '24/7 Mental health support hotline.', 1),
('EG', 'Befrienders Cairo', 'crisis_line', '762 2381', NULL, 'Varies', '{"ar", "en"}', 'Emotional support helpline.', 2),

-- Emergency
('EG', 'Emergency Services', 'emergency_number', '123', NULL, '24/7', '{"ar"}', 'Unified emergency number.', 99),
```

#### **Israel** (2 services)
```sql
-- Primary
('IL', 'Eran.org.il', 'crisis_line', '1201', 'SMS: 076-88444-00 (Sun-Fri 14:00-18:00)', '24/7', '{"he", "ar", "ru", "en"}', 'Free 24/7 emotional support and suicide prevention.', 1),

-- Emergency
('IL', 'Emergency Services', 'emergency_number', '100', NULL, '24/7', '{"he", "ar", "en"}', 'Police emergency.', 99),
('IL', 'Ambulance', 'emergency_number', '101', NULL, '24/7', '{"he", "ar", "en"}', 'Medical emergency.', 99),
```

---

## Missing Countries with Available Data (Alphabetical)

### Asia-Pacific
- **Bangladesh**: Kaan Pete Roi (+88 09612 119911)
- **Cambodia**: Child Helpline Cambodia (1280, 24/7)
- **China**: Multiple services including Lifeline China (400 821 1215)
- **Fiji**: Lifeline Fiji (132454)
- **Indonesia**: 119 (emergency)
- **Iran**: 123 (24/7 crisis line)
- **Lebanon**: Embrace LifeLine (1564 or +961-1-341941, 24/7, Arabic/English/French)
- **Malaysia**: Befrienders (varies by region), 15999 Kasih Helpline
- **Nepal**: 1166 (toll-free suicide prevention)
- **Pakistan**: Umang Hotline (0311 7786264)
- **Sri Lanka**: Lanka Life Line 1375 (24/7, multi-language)
- **Taiwan**: Lifeline 1995, MOHW 1925
- **Thailand**: 1323 Mental Health Hotline

### Europe
- **Austria**: Telefonseelsorge 142 (24/7)
- **Belgium**: Zelfmoordlijn 1813 (Dutch), Centre de Prévention 0800 32 123 (French)
- **Czech Republic**: 116 123 (24/7 crisis line)
- **Denmark**: Livslinien 70 201 201
- **Finland**: MIELI 09 2525 0111 (24/7)
- **Greece**: 1018 (suicide hotline)
- **Hungary**: 116-123 (LESZ, 24/7)
- **Iceland**: 1717 (Red Cross)
- **Netherlands**: 113 or 0800-0113 (24/7 suicide prevention)
- **Norway**: Mental Helse 116 123, Kirkens SOS 22 40 00 40
- **Poland**: 116 123 (crisis line)
- **Portugal**: Multiple services
- **Romania**: 0800 080 100 or 116 123 (24/7)
- **Russia**: 051 (Moscow), EMERCOM +7 495 989-50-50
- **Sweden**: Självmordslinjen 90101 (24/7)
- **Switzerland**: 143 (Die dargebotene Hand)

### Americas
- **Argentina**: Multiple services including Centro de Asistencia (135)
- **Chile**: *4141 (national suicide hotline)
- **Colombia**: 106 (crisis support)
- **Costa Rica**: Aquí Estoy (506) 2272-3774
- **Guyana**: 223-0001 (suicide prevention)
- **Peru**: 113 (national health line)
- **Trinidad and Tobago**: Lifeline 800-5588
- **Uruguay**: 0800-0767 or *0767 (24/7 suicide prevention)

### Middle East & Africa
- **Ghana**: 2332 444 71279 (national lifeline)
- **Kenya**: Befrienders +254 722 178 177
- **Liberia**: 6534308 (Lifeline Liberia)
- **Morocco**: Union nationale des femmes marocaines 8350
- **Saudi Arabia**: 800 46342 (suicide hotline)
- **Sudan**: Befrienders Khartoum (249) 11-555-253
- **UAE**: 800 46342 (National Committee for Mental Health)

---

## Recommended Action Plan

### Phase 1: Critical Updates (Week 1)
1. ✅ Update Canada to use 988 as primary
2. ✅ Add Spain 024
3. ✅ Add France 3114
4. ✅ Expand US to include specialized lines (Veterans, Trevor Project, Trans Lifeline, RAINN, DV hotline)
5. ✅ Expand UK to include CALM, Papyrus, National Prevention Line
6. ✅ Expand Australia to include Beyond Blue, Kids Helpline, 13YARN, QLife

### Phase 2: Major Countries (Week 2)
1. ✅ Add South Africa (30+ resources)
2. ✅ Add Singapore (3 major services)
3. ✅ Add Hong Kong (10+ services)
4. ✅ Add Philippines (5 services)
5. ✅ Add Nigeria (6 services)
6. ✅ Add Egypt
7. ✅ Add Israel

### Phase 3: Comprehensive Asia-Pacific (Week 3-4)
- Add all countries listed in Asia-Pacific missing section
- Prioritize by population: China, Bangladesh, Pakistan, Thailand, Malaysia

### Phase 4: Europe Expansion (Week 4-5)
- Add all European countries with available data
- Prioritize by population: Netherlands, Belgium, Poland, Sweden, Austria

### Phase 5: Americas & Middle East (Week 5-6)
- Complete Americas coverage
- Add remaining Middle East countries

---

## Data Quality Issues Found

### 🟡 Potential Errors to Verify

1. **United Kingdom**: Migration says Shout is `text SHOUT to 85258`, canonical confirms this ✅

2. **Canada**:
   - Migration has "Talk Suicide Canada" at 1-833-456-4566, text 45645
   - Canonical shows this is correct BUT also shows new 988 launched Nov 2023 ✅
   - **ACTION**: Add 988 as primary, keep Talk Suicide as secondary

3. **Australia**:
   - Migration has Lifeline Text at "0477 13 11 14"
   - Canonical confirms: "Text: 0477 13 11 14" ✅

4. **South Korea**:
   - Migration has "Korea Suicide Prevention Center" at 1393
   - Canonical shows "Lifeline Korea" at 1588-9191 (24/7)
   - **ACTION**: Review which is the primary national line

5. **India**:
   - Migration has AASRA at "91-22-2754-6669"
   - Canonical shows "+91-22-27546669" (same number, formatting)
   - Also missing major new service: **Kiran 1800-266-2345** (national 24/7 launched by govt)

6. **Japan**:
   - Migration has "Inochi no Denwa" at "0570-783-556"
   - Canonical doesn't list this exact number
   - Canonical shows "＃いのちSOS" at 0120 061 338 and TELL at different numbers
   - **ACTION**: Verify Japan numbers

---

## Database Schema Observations

### ✅ Well-Designed
- Good use of `type` enum
- Flexible contact method fields (phone, text_instructions, chat_url)
- Language support with arrays
- Display order for prioritization

### 🟡 Potential Enhancements

1. **Add `service_scope` field**:
   ```sql
   service_scope TEXT[] -- e.g., {"suicide", "domestic_violence", "lgbtq", "youth", "veterans", "substance_use"}
   ```
   This would enable filtering by issue type for better matching.

2. **Add `population_served` field**:
   ```sql
   population_served TEXT[] -- e.g., {"general", "youth", "lgbtq", "indigenous", "veterans", "women", "men"}
   ```

3. **Add `requires_callback` boolean**:
   Some services (like Guyana's) require you to text them and they call you back.

4. **Add `alternative_numbers` JSON field**:
   Many services have multiple numbers (TelefonSeelsorge in Germany has 3).

---

## Testing Recommendations

After adding new resources, test:

1. **Coverage**: Query `get_supported_countries()` to ensure all countries are returning results
2. **Priority**: Query each country and verify `display_order` makes sense (national 3-digit > national toll-free > regional > specialized)
3. **Language**: Verify language codes are correct ISO 639-1 (en, es, fr, de, ja, zh, etc.)
4. **Contact Methods**: Ensure at least one of (phone, text_instructions, chat_url) is present
5. **24/7 vs Limited**: Verify `availability` field is accurate (many services are NOT 24/7)

---

## Sources

- **Primary**: Comprehensive global research document (PASTED MATERIAL)
- **Verification**: Wikipedia "List of suicide crisis lines" (ADDITIONAL PASTED MATERIAL)
- **Cross-reference**: Find A Helpline (findahelpline.com) mentioned as canonical aggregator
- **Official**: Government sources for 988 (Canada), 024 (Spain), 3114 (France)

---

## Next Steps

1. Review and approve this analysis
2. Create SQL migration file with Phase 1 updates
3. Test in development environment
4. Deploy incrementally (Phase 1, then 2, etc.)
5. Build admin panel to allow ongoing updates
6. Establish process for verifying resources annually (numbers change!)

