// Agents & Workflows — multi-step LLM pipelines
import { randomUUID } from "crypto";
import getDb from "@/lib/db";
import { getApiConfig, getModelForMessage } from "@/lib/constants";
import { preprocessPrompt, estimateTokens } from "@/lib/preprocess";
import { searchKnowledge } from "@/lib/rag";

// --- Types ---
export type StepType = "llm" | "search" | "db" | "webhook" | "transform" | "condition";

export interface WorkflowStep {
  id: string;
  type: StepType;
  prompt?: string;           // for LLM steps — template with {{var}} interpolation
  source?: string;           // for search steps — which KB to search
  query?: string;            // for search — template
  field?: string;            // for transform steps — jsonpath
  transform?: string;        // for transform — "extract_json", "extract_code", "summarize"
  url?: string;              // for webhook steps
  method?: string;           // for webhook steps
  condition?: string;        // for condition steps
  then?: string;             // step id if condition is true
  else?: string;             // step id if condition is false
  outputVar: string;         // variable name to store result
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerLabel: string;      // button label in UI
  steps: WorkflowStep[];
  tier: string;              // min tier required
  icon?: string;             // lucide icon name
}

export interface StepResult {
  stepId: string;
  type: StepType;
  input: string;
  output: string;
  tokens: number;
  durationMs: number;
  error?: string;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  steps: StepResult[];
  finalOutput: string;
  totalTokens: number;
  totalDurationMs: number;
  error?: string;
}

// --- Built-in workflows ---
export const WORKFLOWS: Workflow[] = [
  {
    id: "deep-research",
    name: "Deep Research",
    description: "Searches knowledge base, analyzes with AI, produces a structured report",
    triggerLabel: "Deep Research",
    icon: "Search",
    tier: "pro",
    steps: [
      { id: "s1", type: "search", query: "{{input}}", outputVar: "rag_results" },
      {
        id: "s2", type: "llm",
        prompt: `Based on the following research data, create a detailed structured report on the topic: "{{input}}"

Research data:
{{rag_results}}

Format the report with:
- Summary
- Key findings (bullet points)
- Detailed analysis
- Sources`,
        outputVar: "report",
      },
      {
        id: "s3", type: "transform", transform: "extract_json",
        prompt: "{{report}}", outputVar: "structured_report",
      },
    ],
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Analyzes code for bugs, improvements, and security issues",
    triggerLabel: "Code Review",
    icon: "Code",
    tier: "pro",
    steps: [
      {
        id: "s1", type: "llm",
        prompt: `Analyze the following code for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code style improvements
5. Best practices violations

Code:
{{input}}

Provide your review in structured format with severity levels (Critical/Warning/Info) for each finding.`,
        outputVar: "review",
      },
    ],
  },
  {
    id: "smart-compose",
    name: "Smart Compose",
    description: "Generates content using RAG context + AI in one pipeline",
    triggerLabel: "Smart Compose",
    icon: "PenLine",
    tier: "free",
    steps: [
      { id: "s1", type: "search", query: "{{input}}", outputVar: "context" },
      {
        id: "s2", type: "llm",
        prompt: `Write content based on this request: "{{input}}"

Use the following context for accuracy and details:
{{context}}

Write in a clear, engaging style.`,
        outputVar: "draft",
      },
      {
        id: "s3", type: "llm",
        prompt: `Review and polish this draft. Fix any grammar issues, improve flow, and ensure factual accuracy based on the context:

Draft: {{draft}}
Context: {{context}}

Return the polished version.`,
        outputVar: "final",
      },
    ],
  },
  {
    id: "summarize-and-extract",
    name: "Summarize & Extract",
    description: "Summarizes text and extracts key entities, dates, and action items",
    triggerLabel: "Summarize",
    icon: "FileText",
    tier: "free",
    steps: [
      {
        id: "s1", type: "llm",
        prompt: `Analyze the following text and produce:

1. **Summary** (2-3 sentences)
2. **Key Entities** (names, organizations, products)
3. **Dates & Deadlines** (if any)
4. **Action Items** (tasks, decisions)
5. **Sentiment** (positive/neutral/negative)

Text:
{{input}}`,
        outputVar: "analysis",
      },
    ],
  },
  {
    id: "multi-model-debate",
    name: "Multi-Model Debate",
    description: "Gets multiple AI perspectives on a question and synthesizes an answer",
    triggerLabel: "Debate",
    icon: "MessageSquare",
    tier: "max",
    steps: [
      {
        id: "s1", type: "llm",
        prompt: `You are Analyst A. Answer this question from a technical/scientific perspective. Be precise and evidence-based:

Question: {{input}}`,
        outputVar: "perspective_a",
      },
      {
        id: "s2", type: "llm",
        prompt: `You are Analyst B. Answer this question from a practical/applied perspective. Focus on real-world implications:

Question: {{input}}`,
        outputVar: "perspective_b",
      },
      {
        id: "s3", type: "llm",
        prompt: `You are a Synthesis Expert. Two analysts have provided their perspectives on the same question. Synthesize their answers into a comprehensive, balanced response.

Analyst A (technical):
{{perspective_a}}

Analyst B (practical):
{{perspective_b}}

Question: {{input}}

Create a unified answer that incorporates the strongest points from both perspectives, highlights areas of agreement, and notes any contradictions.`,
        outputVar: "synthesis",
      },
    ],
  },
];

// --- Variable interpolation ---
function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// --- LLM call ---
async function callLLM(prompt: string, model: string): Promise<{ content: string; tokens: number }> {
  const api = getApiConfig();
  const messages = [
    { role: "system", content: "You are a helpful AI assistant. Be precise and thorough." },
    { role: "user", content: prompt },
  ];

  const res = await fetch(api.url, {
    method: "POST",
    headers: api.headers,
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`LLM error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const tokens = (data.usage?.total_tokens || estimateTokens(content));

  return { content, tokens };
}

// --- Transform operations ---
function transformOutput(input: string, transform: string): string {
  switch (transform) {
    case "extract_json": {
      const jsonMatch = input.match(/```json\n?([\s\S]*?)\n?```/);
      return jsonMatch ? jsonMatch[1] : input;
    }
    case "extract_code": {
      const codeMatch = input.match(/```\w*\n?([\s\S]*?)\n?```/);
      return codeMatch ? codeMatch[1] : input;
    }
    case "summarize":
      // Just return first 500 chars as a simple summary
      return input.length > 500 ? input.slice(0, 500) + "..." : input;
    default:
      return input;
  }
}

// --- Execute a single step ---
async function executeStep(
  step: WorkflowStep,
  vars: Record<string, string>,
  userId: string,
  tier: string,
): Promise<StepResult> {
  const start = Date.now();
  const model = getModelForMessage(tier, false);

  try {
    switch (step.type) {
      case "llm": {
        const prompt = interpolate(step.prompt || "", vars);
        const preprocessed = preprocessPrompt(prompt);
        if (preprocessed.blocked) {
          return { stepId: step.id, type: "llm", input: prompt, output: "", tokens: 0, durationMs: Date.now() - start, error: preprocessed.blockReason };
        }
        const result = await callLLM(preprocessed.sanitized, model);
        return { stepId: step.id, type: "llm", input: prompt.slice(0, 200), output: result.content, tokens: result.tokens, durationMs: Date.now() - start };
      }

      case "search": {
        const query = interpolate(step.query || "{{input}}", vars);
        const results = await searchKnowledge(userId, query, 5);
        return { stepId: step.id, type: "search", input: query, output: results.context, tokens: 0, durationMs: Date.now() - start };
      }

      case "transform": {
        const input = interpolate(step.prompt || "", vars);
        const output = transformOutput(input, step.transform || "");
        return { stepId: step.id, type: "transform", input: input.slice(0, 200), output, tokens: 0, durationMs: Date.now() - start };
      }

      case "webhook": {
        const url = interpolate(step.url || "", vars);
        const res = await fetch(url, {
          method: (step.method || "POST") as string,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vars),
          signal: AbortSignal.timeout(30_000),
        });
        const output = await res.text();
        return { stepId: step.id, type: "webhook", input: url, output, tokens: 0, durationMs: Date.now() - start };
      }

      default:
        return { stepId: step.id, type: step.type, input: "", output: "", tokens: 0, durationMs: Date.now() - start, error: `Unknown step type: ${step.type}` };
    }
  } catch (err: any) {
    return { stepId: step.id, type: step.type, input: "", output: "", tokens: 0, durationMs: Date.now() - start, error: err?.message || "Unknown error" };
  }
}

// --- Execute a workflow ---
export async function executeWorkflow(
  workflowId: string,
  userId: string,
  input: string,
  tier: string,
): Promise<WorkflowResult> {
  const workflow = WORKFLOWS.find(w => w.id === workflowId);
  if (!workflow) {
    return { workflowId, success: false, steps: [], finalOutput: "", totalTokens: 0, totalDurationMs: 0, error: `Workflow "${workflowId}" not found` };
  }

  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  const vars: Record<string, string> = { input };
  let totalTokens = 0;

  // Execute steps sequentially (each step may depend on previous outputs)
  for (const step of workflow.steps) {
    const result = await executeStep(step, vars, userId, tier);
    stepResults.push(result);
    totalTokens += result.tokens;

    if (result.error) {
      // On critical error, stop workflow
      return {
        workflowId,
        success: false,
        steps: stepResults,
        finalOutput: `Error at step "${step.id}": ${result.error}`,
        totalTokens,
        totalDurationMs: Date.now() - startTime,
        error: result.error,
      };
    }

    // Store output in vars for next steps
    vars[step.outputVar] = result.output;
  }

  // Log to DB
  const db = getDb();
  const runId = randomUUID();
  await db.from("workflow_runs").insert({
    id: runId,
    user_id: userId,
    workflow_id: workflowId,
    input: input.slice(0, 2000),
    output: (vars.final || vars.report || vars.synthesis || vars.analysis || vars.draft || "").slice(0, 5000),
    steps_json: JSON.stringify(stepResults),
    total_tokens: totalTokens,
    duration_ms: Date.now() - startTime,
    success: true,
  });

  const finalOutput = vars.final || vars.report || vars.synthesis || vars.analysis || vars.draft || vars.review || vars.structured_report || "";

  return {
    workflowId,
    success: true,
    steps: stepResults,
    finalOutput,
    totalTokens,
    totalDurationMs: Date.now() - startTime,
  };
}

// --- Get workflow list (filtered by tier) ---
export function getAvailableWorkflows(tier: string): Workflow[] {
  const tierOrder = ["free", "pro", "max"];
  const tierIdx = tierOrder.indexOf(tier);

  return WORKFLOWS.filter(w => {
    const minIdx = tierOrder.indexOf(w.tier);
    return tierIdx >= minIdx;
  }).map(w => ({
    ...w,
    steps: [], // Don't expose internal steps to client
  }));
}

// --- Get workflow run history ---
export async function getWorkflowRuns(userId: string, limit = 20) {
  const db = getDb();
  const { data } = await db
    .from("workflow_runs")
    .select("id, workflow_id, input, output, total_tokens, duration_ms, success, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}
