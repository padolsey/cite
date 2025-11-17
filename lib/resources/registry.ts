/**
 * Crisis Resource Registry
 *
 * Centralized database of crisis resources by country (ISO code)
 * Extensible - add new countries/resources here
 */

import type { CrisisResource } from '../evaluation/types.js';

/**
 * Crisis resources by ISO country code
 */
export const CRISIS_RESOURCES_BY_COUNTRY: Record<string, CrisisResource[]> = {
  /**
   * United States
   */
  US: [
    {
      type: 'crisis_line',
      name: '988 Suicide & Crisis Lifeline',
      phone: '988',
      text_instructions: 'Text 988',
      availability: '24/7',
      languages: ['en', 'es'],
      description: 'Free, confidential support for people in distress, prevention and crisis resources.',
    },
    {
      type: 'text_line',
      name: 'Crisis Text Line',
      text_instructions: 'Text HOME to 741741',
      availability: '24/7',
      languages: ['en', 'es'],
      description: 'Free, 24/7 crisis support via text message.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '911',
      availability: '24/7',
      languages: ['en', 'es'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * United Kingdom
   */
  GB: [
    {
      type: 'crisis_line',
      name: 'Samaritans',
      phone: '116 123',
      availability: '24/7',
      languages: ['en'],
      description: 'Free, confidential emotional support for anyone in distress.',
    },
    {
      type: 'text_line',
      name: 'Shout',
      text_instructions: 'Text SHOUT to 85258',
      availability: '24/7',
      languages: ['en'],
      description: 'Free, confidential, 24/7 text support for anyone in crisis.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '999',
      availability: '24/7',
      languages: ['en'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * Canada
   */
  CA: [
    {
      type: 'crisis_line',
      name: 'Talk Suicide Canada',
      phone: '1-833-456-4566',
      text_instructions: 'Text 45645',
      availability: '24/7',
      languages: ['en', 'fr'],
      description: 'Free, confidential support for people in distress.',
    },
    {
      type: 'crisis_line',
      name: 'Kids Help Phone',
      phone: '1-800-668-6868',
      text_instructions: 'Text CONNECT to 686868',
      availability: '24/7',
      languages: ['en', 'fr'],
      description: 'Support for young people up to age 29.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '911',
      availability: '24/7',
      languages: ['en', 'fr'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * Australia
   */
  AU: [
    {
      type: 'crisis_line',
      name: 'Lifeline Australia',
      phone: '13 11 14',
      availability: '24/7',
      languages: ['en'],
      description: 'Crisis support and suicide prevention services.',
    },
    {
      type: 'text_line',
      name: 'Lifeline Text',
      text_instructions: 'Text 0477 13 11 14',
      availability: '24/7',
      languages: ['en'],
      description: 'Text-based crisis support.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '000',
      availability: '24/7',
      languages: ['en'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * New Zealand
   */
  NZ: [
    {
      type: 'crisis_line',
      name: 'Lifeline Aotearoa',
      phone: '0800 543 354',
      availability: '24/7',
      languages: ['en'],
      description: 'Free, confidential support for anyone in distress.',
    },
    {
      type: 'crisis_line',
      name: '1737',
      phone: '1737',
      text_instructions: 'Text 1737',
      availability: '24/7',
      languages: ['en'],
      description: 'Free call or text for support from a trained counselor.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '111',
      availability: '24/7',
      languages: ['en'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * Ireland
   */
  IE: [
    {
      type: 'crisis_line',
      name: 'Samaritans Ireland',
      phone: '116 123',
      availability: '24/7',
      languages: ['en'],
      description: 'Free, confidential emotional support.',
    },
    {
      type: 'crisis_line',
      name: 'Pieta House',
      phone: '1800 247 247',
      availability: '24/7',
      languages: ['en'],
      description: 'Free therapy for people in suicidal distress.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '999',
      availability: '24/7',
      languages: ['en'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * Germany
   */
  DE: [
    {
      type: 'crisis_line',
      name: 'Telefonseelsorge',
      phone: '0800 111 0 111',
      availability: '24/7',
      languages: ['de'],
      description: 'Kostenlose, vertrauliche Krisenunterstützung.',
    },
    {
      type: 'emergency_number',
      name: 'Notdienste',
      phone: '112',
      availability: '24/7',
      languages: ['de', 'en'],
      description: 'Für lebensbedrohliche Notfälle.',
    },
  ],

  /**
   * France
   */
  FR: [
    {
      type: 'crisis_line',
      name: 'SOS Amitié',
      phone: '09 72 39 40 50',
      availability: '24/7',
      languages: ['fr'],
      description: 'Soutien émotionnel gratuit et confidentiel.',
    },
    {
      type: 'emergency_number',
      name: 'Services d\'urgence',
      phone: '112',
      availability: '24/7',
      languages: ['fr', 'en'],
      description: 'Pour les urgences vitales.',
    },
  ],

  /**
   * Spain
   */
  ES: [
    {
      type: 'crisis_line',
      name: 'Teléfono de la Esperanza',
      phone: '717 003 717',
      availability: '24/7',
      languages: ['es'],
      description: 'Apoyo emocional gratuito y confidencial.',
    },
    {
      type: 'emergency_number',
      name: 'Servicios de emergencia',
      phone: '112',
      availability: '24/7',
      languages: ['es', 'en'],
      description: 'Para emergencias que amenazan la vida.',
    },
  ],

  /**
   * Italy
   */
  IT: [
    {
      type: 'crisis_line',
      name: 'Telefono Amico',
      phone: '02 2327 2327',
      availability: 'Daily 10:00-24:00',
      languages: ['it'],
      description: 'Supporto emotivo gratuito e confidenziale.',
    },
    {
      type: 'emergency_number',
      name: 'Servizi di emergenza',
      phone: '112',
      availability: '24/7',
      languages: ['it', 'en'],
      description: 'Per emergenze potenzialmente letali.',
    },
  ],

  /**
   * Japan
   */
  JP: [
    {
      type: 'crisis_line',
      name: 'TELL Lifeline',
      phone: '03-5774-0992',
      availability: 'Daily 9:00-23:00',
      languages: ['en', 'ja'],
      description: 'Free, confidential telephone counseling.',
    },
    {
      type: 'crisis_line',
      name: 'Inochi no Denwa',
      phone: '0570-783-556',
      availability: '24/7',
      languages: ['ja'],
      description: '無料で機密性の高い危機サポート',
    },
    {
      type: 'emergency_number',
      name: '緊急サービス',
      phone: '110',
      availability: '24/7',
      languages: ['ja'],
      description: '生命を脅かす緊急事態の場合',
    },
  ],

  /**
   * South Korea
   */
  KR: [
    {
      type: 'crisis_line',
      name: 'Korea Suicide Prevention Center',
      phone: '1393',
      availability: '24/7',
      languages: ['ko'],
      description: '무료 상담 및 위기 지원',
    },
    {
      type: 'emergency_number',
      name: '응급 서비스',
      phone: '119',
      availability: '24/7',
      languages: ['ko'],
      description: '생명을 위협하는 긴급 상황',
    },
  ],

  /**
   * India
   */
  IN: [
    {
      type: 'crisis_line',
      name: 'AASRA',
      phone: '91-22-2754-6669',
      availability: '24/7',
      languages: ['en', 'hi'],
      description: 'Free, confidential crisis support.',
    },
    {
      type: 'crisis_line',
      name: 'Vandrevala Foundation',
      phone: '1860-266-2345',
      availability: '24/7',
      languages: ['en', 'hi'],
      description: 'Mental health support and crisis intervention.',
    },
    {
      type: 'emergency_number',
      name: 'Emergency Services',
      phone: '112',
      availability: '24/7',
      languages: ['en', 'hi'],
      description: 'For immediate life-threatening emergencies.',
    },
  ],

  /**
   * Brazil
   */
  BR: [
    {
      type: 'crisis_line',
      name: 'CVV',
      phone: '188',
      availability: '24/7',
      languages: ['pt'],
      description: 'Apoio emocional gratuito e confidencial.',
    },
    {
      type: 'emergency_number',
      name: 'Serviços de emergência',
      phone: '192',
      availability: '24/7',
      languages: ['pt'],
      description: 'Para emergências com risco de vida.',
    },
  ],

  /**
   * Mexico
   */
  MX: [
    {
      type: 'crisis_line',
      name: 'Línea de la Vida',
      phone: '800 911 2000',
      availability: '24/7',
      languages: ['es'],
      description: 'Apoyo emocional y prevención del suicidio.',
    },
    {
      type: 'emergency_number',
      name: 'Servicios de emergencia',
      phone: '911',
      availability: '24/7',
      languages: ['es'],
      description: 'Para emergencias que amenazan la vida.',
    },
  ],
};

/**
 * Default/fallback resources for countries not in registry
 */
export const DEFAULT_CRISIS_RESOURCES: CrisisResource[] = [
  {
    type: 'support_service',
    name: 'International Association for Suicide Prevention',
    chat_url: 'https://www.iasp.info/resources/Crisis_Centres/',
    availability: 'Varies by region',
    languages: ['en'],
    description: 'Directory of crisis centers worldwide.',
  },
  {
    type: 'support_service',
    name: 'Befrienders Worldwide',
    chat_url: 'https://www.befrienders.org/',
    availability: 'Varies by region',
    languages: ['en'],
    description: 'Global network of emotional support centers.',
  },
];

/**
 * Get all supported country codes
 */
export function getSupportedCountries(): string[] {
  return Object.keys(CRISIS_RESOURCES_BY_COUNTRY);
}

/**
 * Check if country code is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  return countryCode.toUpperCase() in CRISIS_RESOURCES_BY_COUNTRY;
}
