import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("testimonial")) {
      componentType = "testimonial";
      componentName = "TestimonialCard";
    } else if (promptLower.includes("pricing")) {
      componentType = "pricing";
      componentName = "PricingCard";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "testimonial":
        return `import React from 'react';

const StarRating = ({ rating = 5 }) => (
  <div style={{ display: 'flex', gap: '4px' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={i < rating ? '#F59E0B' : 'none'}
        stroke={i < rating ? '#F59E0B' : '#D1D5DB'}
        strokeWidth="2"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

const TestimonialCard = ({
  quote = "This product has completely transformed the way our team works. The efficiency gains have been remarkable, and the support team is always there when we need them.",
  name = "Sarah Johnson",
  role = "Head of Product",
  company = "TechCorp Inc.",
  rating = 5,
  avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
}) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '2px',
      boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
      maxWidth: '480px',
      width: '100%',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '18px',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative quote mark */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '24px',
          fontSize: '96px',
          lineHeight: 1,
          color: '#EDE9FE',
          fontFamily: 'Georgia, serif',
          userSelect: 'none',
        }}>
          "
        </div>

        {/* Star rating */}
        <div style={{ marginBottom: '16px' }}>
          <StarRating rating={rating} />
        </div>

        {/* Quote text */}
        <p style={{
          fontSize: '16px',
          lineHeight: '1.7',
          color: '#374151',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1,
        }}>
          "{quote}"
        </p>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, #667eea, transparent)',
          marginBottom: '20px',
        }} />

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={avatarUrl}
            alt={name}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '3px solid #EDE9FE',
              background: '#F3F4F6',
            }}
          />
          <div>
            <p style={{ fontWeight: '700', color: '#111827', margin: 0, fontSize: '15px' }}>
              {name}
            </p>
            <p style={{ color: '#6B7280', margin: 0, fontSize: '13px', marginTop: '2px' }}>
              {role} · {company}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;`;

      case "pricing":
        return `import React, { useState } from 'react';

const PricingCard = ({
  plan = "Pro",
  price = 29,
  period = "month",
  description = "Perfect for growing teams and businesses.",
  features = [
    "Unlimited projects",
    "Advanced analytics",
    "Priority support",
    "Custom integrations",
    "Team collaboration",
  ],
  highlighted = true,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: highlighted
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'white',
        borderRadius: '20px',
        padding: highlighted ? '32px' : '30px',
        border: highlighted ? 'none' : '2px solid #E5E7EB',
        boxShadow: hovered
          ? '0 25px 50px rgba(102, 126, 234, 0.5)'
          : highlighted
          ? '0 15px 40px rgba(102, 126, 234, 0.3)'
          : '0 4px 20px rgba(0,0,0,0.08)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.3s ease',
        maxWidth: '320px',
        width: '100%',
        color: highlighted ? 'white' : '#111827',
      }}
    >
      <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8 }}>
        {plan}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '48px', fontWeight: '800' }}>\${price}</span>
        <span style={{ fontSize: '16px', opacity: 0.7 }}>/{period}</span>
      </div>
      <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>{description}</p>
      <div style={{ marginBottom: '28px' }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '14px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: highlighted ? 'rgba(255,255,255,0.2)' : '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke={highlighted ? 'white' : '#7C3AED'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {f}
          </div>
        ))}
      </div>
      <button style={{
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '15px',
        background: highlighted ? 'white' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: highlighted ? '#7C3AED' : 'white',
        transition: 'opacity 0.2s',
      }}>
        Get started
      </button>
    </div>
  );
};

export default PricingCard;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Welcome to Our Service",
  description = "Discover amazing features and capabilities that will transform your experience.",
  tag = "Featured",
  imageUrl,
  actions
}) => {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      maxWidth: '380px',
      width: '100%',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {tag && (
          <span style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
          }}>{tag}</span>
        )}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <div style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 20px' }}>{description}</p>
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button
          onClick={decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={increment}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "testimonial":
        return "  company = \"TechCorp Inc.\",";
      case "pricing":
        return "  highlighted = true,";
      case "card":
        return "  tag = \"Featured\",";
      default:
        return "  const increment = () => setCount(count + 1);";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "testimonial":
        return "  company = \"TechCorp Inc.\",\n  verified = true,";
      case "pricing":
        return "  highlighted = true,\n  badge = \"Most Popular\",";
      case "card":
        return "  tag = \"Featured\",\n  ctaLabel = \"Learn More\",";
      default:
        return "  const increment = () => setCount(prev => prev + 1);";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "TestimonialCard") {
      return `import TestimonialCard from '@/components/TestimonialCard';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <TestimonialCard
        quote="This product has completely transformed the way our team works. The efficiency gains have been remarkable, and the support team is always there when we need them."
        name="Sarah Johnson"
        role="Head of Product"
        company="TechCorp Inc."
        rating={5}
        avatarUrl="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
      />
    </div>
  );
}`;
    }

    if (componentName === "PricingCard") {
      return `import PricingCard from '@/components/PricingCard';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <PricingCard
        plan="Pro"
        price={29}
        period="month"
        description="Perfect for growing teams and businesses."
        features={["Unlimited projects", "Advanced analytics", "Priority support", "Custom integrations", "Team collaboration"]}
        highlighted={true}
      />
    </div>
  );
}`;
    }

    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <Card
        title="Amazing Product"
        description="This is a fantastic product that will change your life. Experience the difference today!"
        tag="Featured"
        actions={
          <button style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
            Learn More
          </button>
        }
      />
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

export function getLanguageModel(): LanguageModelV1 {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey && openaiKey.trim() !== "") {
    return openai("gpt-5.4-nano") as unknown as LanguageModelV1;
  }

  if (anthropicKey && anthropicKey.trim() !== "") {
    return anthropic(MODEL) as LanguageModelV1;
  }

  console.log("No API key found, using mock provider");
  return new MockLanguageModel("mock-claude-sonnet-4-0");
}
