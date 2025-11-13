import type { Message, StreamChunk, CITEConfig, ProcessEvent, RiskAssessment } from './types';
import type { IProvider } from './providers/IProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { ThinkingProvider } from './thinking/ThinkingProvider';
import { RiskAssessor } from './interception/RiskAssessor';
import { Router, MODEL_PROFILES, type ProfileKey } from './interception/Router';
import { ContextManager } from './context/ContextManager';
import { SafetyMessaging } from './escalation/SafetyMessaging';
import { Upskilling } from './escalation/Upskilling';
import { OnlineResourcesTool } from './tools/OnlineResourcesTool';
import type { ITool } from './tools/ITool';

/**
 * Main CITE (Context, Interception, Thinking, Escalation) Engine
 * Orchestrates all safety measures and streams responses
 */
export class CITEEngine {
  private baseProvider: IProvider;
  private riskAssessor: RiskAssessor;
  private router: Router;
  private contextManager: ContextManager;
  private safetyMessaging: SafetyMessaging;
  private upskilling: Upskilling;
  private tools: Map<string, ITool>;
  private processEvents: ProcessEvent[] = [];

  constructor(
    apiKey: string,
    private config: CITEConfig
  ) {
    // Initialize base provider
    this.baseProvider = new OpenRouterProvider(apiKey);

    // Initialize all subsystems
    this.riskAssessor = new RiskAssessor(this.baseProvider);
    this.router = new Router(this.riskAssessor);
    this.contextManager = new ContextManager(
      this.baseProvider,
      config.maxContextTokens,
      config.synthesisInterval
    );
    this.safetyMessaging = new SafetyMessaging();
    this.upskilling = new Upskilling();

    // Initialize tools
    this.tools = new Map();
    this.tools.set('getOnlineResources', new OnlineResourcesTool(this.baseProvider));
  }

  /**
   * Main entry point: processes a chat and streams the response
   */
  async *chat(
    messages: Message[],
    userProfilePreference: ProfileKey | 'auto' = 'auto'
  ): AsyncGenerator<StreamChunk, void, undefined> {
    this.processEvents = [];
    const startTime = Date.now();

    // Helper to emit AND yield process events in real-time
    const emitAndYield = (event: ProcessEvent): StreamChunk => {
      this.emitEvent(event);
      return { type: 'metadata', metadata: { processEvent: event } };
    };

    try {
      // STEP 1: Context Management
      let processedMessages = messages;
      if (this.config.enableContextSynthesis) {
        yield emitAndYield({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'context',
          step: 'context_check',
          description: 'Checking if context synthesis is needed'
        });

        // Consume context manager generator and yield all events
        const contextGen = this.contextManager.prepareContext(messages);

        while (true) {
          const { value, done } = await contextGen.next();
          if (done) {
            if (value) {
              processedMessages = value;
            }
            break;
          }
          // Yield process event
          yield emitAndYield(value as ProcessEvent);
        }
      }

      // STEP 2: Interception - Risk Assessment & Routing
      let selectedProfile = userProfilePreference === 'auto' ? 'balanced' : userProfilePreference;
      let riskAssessment: RiskAssessment;

      if (this.config.enableRouting) {
        // Consume router generator and yield all events
        const routerGen = this.router.route(processedMessages, userProfilePreference);
        let routeResult: { profile: ProfileKey; assessment: RiskAssessment } | undefined;

        while (true) {
          const { value, done } = await routerGen.next();
          if (done) {
            routeResult = value;
            break;
          }
          // Yield process event
          yield emitAndYield(value as ProcessEvent);
        }

        if (!routeResult) {
          throw new Error('Router failed to return result');
        }

        selectedProfile = routeResult.profile;
        riskAssessment = routeResult.assessment;
      } else {
        // Still assess risk even if not routing
        const assessGen = this.riskAssessor.assessRisk(processedMessages);
        let assessment: RiskAssessment | undefined;

        while (true) {
          const { value, done } = await assessGen.next();
          if (done) {
            assessment = value;
            break;
          }
          // Yield process event
          yield emitAndYield(value as ProcessEvent);
        }

        if (!assessment) {
          throw new Error('Risk assessment failed');
        }

        riskAssessment = assessment;
      }

      // STEP 3: Check for upskilling
      if (this.config.enableUpskilling) {
        const upskillDecision = this.upskilling.shouldUpskill(selectedProfile, riskAssessment);
        if (upskillDecision) {
          yield emitAndYield({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            type: 'escalation',
            step: 'upskilling',
            description: upskillDecision.reason,
            data: {
              from: selectedProfile,
              to: upskillDecision.recommendedProfile
            }
          });
          selectedProfile = upskillDecision.recommendedProfile;
        }
      }

      // STEP 3.5: Tool/Resource Delegation
      // For high-risk mental health situations, fetch up-to-date resources
      if (
        this.config.enableDelegation &&
        (riskAssessment.level === 'high' || riskAssessment.level === 'critical') &&
        riskAssessment.categories.includes('mental_health')
      ) {
        const tool = this.tools.get('getOnlineResources');
        if (tool) {
          const toolGen = tool.execute('Find current mental health crisis resources including suicide prevention hotlines, crisis text lines, and emergency contacts for US, UK, and international users.');
          let toolResult;

          // Stream tool events and get result
          while (true) {
            const { value, done } = await toolGen.next();
            if (done) {
              toolResult = value;
              break;
            }
            yield emitAndYield(value as ProcessEvent);
          }

          // Insert tool knowledge into context
          if (toolResult?.success && toolResult.knowledge) {
            // Find last user message and append knowledge
            const lastUserIdx = processedMessages.map(m => m.role).lastIndexOf('user');
            if (lastUserIdx >= 0) {
              processedMessages[lastUserIdx] = {
                ...processedMessages[lastUserIdx],
                content: `${processedMessages[lastUserIdx].content}\n\n${toolResult.knowledge}`
              };

              yield emitAndYield({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: 'interception',
                step: 'tool_knowledge_inserted',
                description: 'Inserted up-to-date crisis resources into context',
                data: {
                  toolName: 'getOnlineResources',
                  knowledgeLength: toolResult.knowledge.length
                }
              });
            }
          }
        }
      }

      // STEP 4: Prepare provider with selected model and system prompt
      const modelProfile = MODEL_PROFILES[selectedProfile];
      let provider: IProvider = this.baseProvider;

      // Add system prompt modification
      const systemPromptAddition = modelProfile.systemPromptAddition;
      const systemIndex = processedMessages.findIndex(m => m.role === 'system');

      if (systemIndex >= 0) {
        processedMessages[systemIndex] = {
          ...processedMessages[systemIndex],
          content: processedMessages[systemIndex].content + '\n\n' + systemPromptAddition
        };
      } else {
        processedMessages = [
          { role: 'system', content: systemPromptAddition },
          ...processedMessages
        ];
      }

      // STEP 5: Add thinking wrapper if enabled
      if (this.config.enableThinking) {
        provider = new ThinkingProvider(provider, this.config.thinkingStyle);
      }

      // STEP 6: Stream the response
      yield emitAndYield({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'interception',
        step: 'streaming_start',
        description: `Streaming response from ${modelProfile.name} (${modelProfile.model})`,
        data: { profile: selectedProfile, model: modelProfile.model }
      });

      const responseStream = provider.streamChat({
        messages: processedMessages,
        model: modelProfile.model,
        temperature: 0.7,
        onProcessEvent: (event) => this.emitEvent(event)
      });

      // STEP 7: Wrap with safety messaging if needed
      let finalStream = responseStream;
      if (this.config.enableSafetyMessaging) {
        finalStream = this.safetyMessaging.wrapStream(
          responseStream,
          riskAssessment,
          (event) => {
            this.emitEvent(event);
            // Don't yield escalation events during streaming, will batch at end
          }
        );
      }

      // Stream all chunks
      yield* finalStream;

      // Final event
      const duration = Date.now() - startTime;
      yield emitAndYield({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'interception',
        step: 'streaming_complete',
        description: 'Response completed',
        data: { duration }
      });

    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      };

      this.emitEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'escalation',
        step: 'error',
        description: 'Error during chat processing',
        data: { error: String(error) }
      });
    }
  }

  /**
   * Get all process events for visibility
   */
  getProcessEvents(): ProcessEvent[] {
    return this.processEvents;
  }

  /**
   * Internal event emitter
   */
  private emitEvent(event: ProcessEvent): ProcessEvent {
    this.processEvents.push(event);
    return event;
  }
}
