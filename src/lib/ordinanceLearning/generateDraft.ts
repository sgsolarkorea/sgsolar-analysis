import defaultOrdinance from "@/data/ordinances/_default.json";
import type { MunicipalityOrdinanceData } from "@/types/regulatoryReview";

const AI_DRAFT_ITEMS = [
  { label: "도로", distance: "200m", summary: "포장도로·대동로 기준 이격 검토" },
  { label: "주택", distance: "200m", summary: "주거지역·주택 밀집지역과의 거리 확인" },
  { label: "문화재", summary: "문화재 보호구역·역사문화환경 추가 확인" },
  { label: "관광지", distance: "200m", summary: "관광지·휴양시설 이격" },
  { label: "자연휴양림", distance: "200m", summary: "자연휴양림·산림경계 이격" },
  { label: "농업진흥구역", summary: "농지법·농업진흥구역 적용 검토" },
  { label: "경사도", summary: "경사 25° 초과 시 추가 검토" },
  { label: "예외조항", summary: "지붕형 설치 등 예외 규정 별도 확인" },
] as const;

function buildTemplateDraft(
  municipalityLabel: string,
  fullRegionName: string,
  slug: string,
): MunicipalityOrdinanceData {
  const base = defaultOrdinance as MunicipalityOrdinanceData;

  return {
    slug,
    municipalityLabel,
    ordinanceTitle: `${municipalityLabel} 도시·군계획 조례`,
    appendixTitle: "[별표] 태양광 발전시설 허가기준 (AI 초안)",
    relatedLaw: "재생에너지법 제27조의3 / 도시·군계획법 / 해당 지자체 조례",
    promulgatedDate: "조례 확인 필요",
    enforcedDate: "조례 확인 필요",
    statusNote: `${fullRegionName} 조례 AI 초안입니다. 관리자 검토·승인 전까지 공개되지 않습니다.`,
    distanceRules: base.distanceRules,
    articles: [
      {
        id: `${slug}-ai-art23`,
        title: "제23조(개발행위허가의 기준) — AI 초안",
        summary: `${municipalityLabel} 태양광 발전시설 설치 시 주요 시설물 이격거리 기준 초안`,
        items: AI_DRAFT_ITEMS.map((item) => ({ ...item })),
        originalText: `${fullRegionName} 도시·군계획 조례 및 태양광 발전시설 허가기준 AI 초안입니다.\n\n관리자가 조례 원문과 대조·검증한 뒤 승인하면 공개됩니다.\n\n※ 본 초안은 유사 지자체 조례 패턴과 공개 정보를 바탕으로 생성되었으며, 실제 조례와 다를 수 있습니다.`,
      },
    ],
  };
}

async function generateWithOpenAI(
  municipalityLabel: string,
  fullRegionName: string,
  slug: string,
): Promise<MunicipalityOrdinanceData | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_ORDINANCE_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate Korean municipal solar ordinance summaries as JSON matching MunicipalityOrdinanceData schema with fields: slug, municipalityLabel, ordinanceTitle, appendixTitle, relatedLaw, promulgatedDate, enforcedDate, statusNote, distanceRules[{label,distance}], articles[{id,title,summary,items[{label,distance?,summary}],originalText}]. Use conservative 200m defaults when uncertain. Mark uncertain items clearly.",
          },
          {
            role: "user",
            content: `Generate ordinance draft JSON for: ${fullRegionName} (${municipalityLabel}), slug: ${slug}. Include items: 도로, 주택, 문화재, 관광지, 자연휴양림, 농업진흥구역, 경사도, 예외조항.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("[OrdinanceAI] OpenAI request failed:", response.status);
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as MunicipalityOrdinanceData;
    if (!parsed.municipalityLabel || !parsed.articles?.length) return null;

    return {
      ...parsed,
      slug,
      municipalityLabel,
      statusNote: `${parsed.statusNote ?? ""} (AI 생성 초안 — 관리자 검토 필요)`.trim(),
    };
  } catch (error) {
    console.warn("[OrdinanceAI] Generation failed:", error);
    return null;
  }
}

export async function generateOrdinanceDraft(input: {
  slug: string;
  municipalityLabel: string;
  fullRegionName: string;
}): Promise<MunicipalityOrdinanceData> {
  const aiDraft = await generateWithOpenAI(
    input.municipalityLabel,
    input.fullRegionName,
    input.slug,
  );
  if (aiDraft) return aiDraft;

  return buildTemplateDraft(input.municipalityLabel, input.fullRegionName, input.slug);
}
