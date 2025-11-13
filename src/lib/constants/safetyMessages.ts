/**
 * Safety messages and crisis resources
 * Shared between backend (SafetyMessaging) and frontend (ConfigPanel preview)
 */
export const SAFETY_MESSAGES = {
  mental_health: {
    // Empathic, neutral to locale
    prefix: `I'm really sorry you're going through this—your feelings matter, and help is available.`,
    resources: `

---

**If you're in immediate danger:** call your local emergency number (e.g., **112** in much of Europe, **999** in the UK & parts of Asia, **911** in the US/Canada, **000** in Australia, **111** in New Zealand).

**Find local support (phone, text, chat):**
- **Find A Helpline** — instant, country-aware options: https://findahelpline.com/
- **International Association for Suicide Prevention** — crisis centre directory: https://www.iasp.info/resources/Crisis_Centres/
- **Befrienders Worldwide** — emotional support helplines: https://www.befrienders.org/
- **Child Helpline International** — youth-focused help worldwide: https://www.childhelplineinternational.org/child-helplines/

**Quick picks (common English-speaking & populous regions):**
- **UK & Ireland**: **Samaritans** 116 123 (free, 24/7) • **Shout** (text) 85258 (UK)
- **United States**: **988 Suicide & Crisis Lifeline** — call/text 988 or chat
- **Canada**: **988** nationwide; **Talk Suicide Canada** 1-833-456-4566 (where applicable)
- **Australia**: **Lifeline** 13 11 14
- **New Zealand**: **Need to talk?** Call/Text **1737**
- **European Union**: Emotional support via **116 123** (where available) • Emergencies **112**
- **India**: Use **Find A Helpline** or **IASP directory** to get current, verified options for your state/region
- **Nigeria, Pakistan, Philippines, South Africa, Singapore**: Use **Find A Helpline** or **Befrienders** to get up-to-date local services

---

`
  },

  crisis: {
    prefix: `This sounds urgent, and your safety comes first.`,
    resources: `

---

**Act now if you're in danger:** call your local emergency number (e.g., **112** EU, **999** UK, **911** US/Canada, **000** AU, **111** NZ).

**Get crisis support (near you):**
- **Find A Helpline**: https://findahelpline.com/
- **IASP crisis centres**: https://www.iasp.info/resources/Crisis_Centres/
- **Befrienders Worldwide**: https://www.befrienders.org/
- **Child Helpline International** (for young people): https://www.childhelplineinternational.org/child-helplines/

**Examples (use if relevant):**
- **UK & Ireland**: **Samaritans** 116 123 • **Shout** text 85258 (UK)
- **United States**: **988** (call/text) or official chat
- **Canada**: **988**; **Talk Suicide Canada** 1-833-456-4566 (where applicable)
- **Australia**: **Lifeline** 13 11 14
- **New Zealand**: **1737**
- **EU**: **116 123** (where available) • **112** emergencies
- **India / Nigeria / Pakistan / Philippines / South Africa / Singapore**: Use **Find A Helpline** or **IASP** for the latest local lines

---

`
  },

  harmful_advice: {
    prefix: `I can't help with that because it could lead to harm.`,
    alternative: `I can help with safer options, harm-reduction strategies, or point you to supportive resources instead.`
  }
};
