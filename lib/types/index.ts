// Core message types
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: number;
  safetyBanner?: {
    category: string;
    resources: string;
    prefix?: string;
    mode: 'crisis_immediate' | 'distress_acute' | 'support_general';
    showBreathing: boolean;
    showGame: boolean;
    defaultTab: 'breathing' | 'game' | 'resources';
  };
}

// Stream chunk types
export interface StreamChunk {
  type: 'content' | 'thinking' | 'interception' | 'error' | 'metadata' | 'safety_banner';
  content?: string;
  thinking?: string;
  interceptionType?: 'routing' | 'filtering' | 'delegation' | 'safety';
  interceptionData?: any;
  error?: string;
  metadata?: Record<string, any>;
  safetyBanner?: {
    category: string;
    resources: string;
    prefix?: string;
    mode: 'crisis_immediate' | 'distress_acute' | 'support_general';
    showBreathing: boolean;
    showGame: boolean;
    defaultTab: 'breathing' | 'game' | 'resources';
  };
}

// Chat configuration
export interface ChatConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// CITE measures configuration
export interface CITEConfig {
  // Context management
  enableContextSynthesis: boolean;
  maxContextTokens: number;
  synthesisInterval: number; // messages before synthesis

  // Interception
  enableRouting: boolean;
  enableDelegation: boolean;

  // Thinking
  enableThinking: boolean;
  thinkingStyle: 'minimal' | 'detailed';

  // Escalation
  enableSafetyMessaging: boolean;
  enableUpskilling: boolean;
}

// Internal process event for visibility
export interface ProcessEvent {
  id: string;
  timestamp: number;
  type: 'context' | 'interception' | 'thinking' | 'escalation';
  step: string;
  description: string;
  data?: any;
  duration?: number;
}

// Risk assessment
export interface RiskAssessment {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  reasoning: string;
  suggestedActions: string[];
}
