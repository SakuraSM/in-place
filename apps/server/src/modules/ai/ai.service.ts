import { aiRecognitionResultsSchema, type AiRecognitionResult } from './ai.schemas.js';

const AI_PROMPT = `请分析图片中的物品，返回JSON数组，每个物品包含以下字段：
{
  "type": "item 或 container",
  "name": "物品名称（中文）",
  "category": "类别（从以下选择：家电/服装/书籍/食品/家具/工具/玩具/文具/运动/其他）",
  "brand": "品牌（如果能识别）",
  "description": "简短描述（中文，20字以内）",
  "tags": ["标签1", "标签2"],
  "price": 价格数字（如果无法判断可省略）,
  "boundingBox": {
    "x": 左上角 x，范围 0-1000,
    "y": 左上角 y，范围 0-1000,
    "width": 宽度，范围 1-1000,
    "height": 高度，范围 1-1000
  }
}
boundingBox 代表该对象在原图中的相对位置，基于 1000x1000 归一化坐标。如果无法可靠判断，可省略 boundingBox。
只返回JSON数组，不要其他文字。如果有多个物品，每个物品单独一个对象。`;

export class AiRecognitionError extends Error {
  details?: string;
  debug?: Record<string, unknown>;

  constructor(message: string, details?: string, debug?: Record<string, unknown>) {
    super(message);
    this.name = 'AiRecognitionError';
    this.details = details;
    this.debug = debug;
  }
}

export async function recognizeItemsFromImage(input: {
  config: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  imageBuffer: Buffer;
  mimeType: string;
}): Promise<AiRecognitionResult[]> {
  const response = await fetch(`${input.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.config.apiKey}`,
    },
    body: JSON.stringify({
      model: input.config.model,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.mimeType};base64,${input.imageBuffer.toString('base64')}`,
              },
            },
            {
              type: 'text',
              text: AI_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error?.message ?? `OpenAI API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  const firstChoice = data.choices?.[0];
  const assistantMessage = firstChoice?.message;
  const content = extractMessageContent(assistantMessage?.content);
  const rawPreview = createPreview(content || JSON.stringify(data.choices?.[0]?.message?.content ?? ''));
  const responseDebug = {
    finishReason: firstChoice?.finish_reason,
    usage: data.usage,
    messageKeys: assistantMessage && typeof assistantMessage === 'object' ? Object.keys(assistantMessage) : [],
    contentType: Array.isArray(assistantMessage?.content) ? 'array' : typeof assistantMessage?.content,
    refusal: assistantMessage?.refusal,
  };

  if (!content.trim()) {
    throw new AiRecognitionError('模型没有返回可解析的文本内容', rawPreview, responseDebug);
  }

  const jsonText = extractJsonArray(content);
  if (!jsonText) {
    throw new AiRecognitionError('模型返回了内容，但没有返回合法的 JSON 数组', rawPreview, responseDebug);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new AiRecognitionError(
      `模型返回的 JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      rawPreview,
      responseDebug,
    );
  }

  const items = aiRecognitionResultsSchema.parse(parsed);
  if (items.length === 0) {
    throw new AiRecognitionError('模型返回了空识别结果', rawPreview, responseDebug);
  }

  return items;
}

function extractMessageContent(content: unknown) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .join('\n');
  }

  return '';
}

function extractJsonArray(content: string) {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    return cleaned;
  }

  const startIndex = cleaned.indexOf('[');
  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  for (let index = startIndex; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return cleaned.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function createPreview(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 300);
}
