import type { InstallTypeOption } from "@/data/resultUx";

/** CS-1 시공사례 — sampleData.cases 마이그레이션 원본 */
export interface CaseStudy {
  id: string;
  title: string;
  summary: string;
  installType: InstallTypeOption;
  installCategory: string;
  capacityKw: number;
  capacityLabel: string;
  regionLabel: string;
  province: string;
  city?: string;
  thumbnail: {
    src: string;
    alt: string;
  };
  links: {
    blogUrl?: string;
    youtubeUrl?: string;
  };
  completedAt: string;
  featured: boolean;
  published: boolean;
  tags: string[];
  /** recommendConstructionCases 호환 — 지목 */
  landCategory?: string;
}

export interface RecommendedCaseStudy extends CaseStudy {
  recommendReason: string;
}

/** public/case-studies/{id}/thumb.webp — 이미지 추가 시 자동 표시 */
export function caseStudyThumbnailPath(id: string): string {
  return `/case-studies/${id}/thumb.webp`;
}

function roofStudy(input: Omit<CaseStudy, "installType">): CaseStudy {
  return { ...input, installType: "지붕형" };
}

function landStudy(input: Omit<CaseStudy, "installType">): CaseStudy {
  return { ...input, installType: "토지형" };
}

/**
 * sampleData.cases → CaseStudy (id/thumbnail 경로 정규화)
 * @see src/data/sampleData.ts cases
 */
export const caseStudies: CaseStudy[] = [
  landStudy({
    id: "jeonbuk-kimje-198kw-land",
    title: "전북 김제 198kW 토지형 태양광",
    summary: "발전사업용 태양광 시공사례",
    installCategory: "토지형",
    capacityKw: 198,
    capacityLabel: "198kW",
    regionLabel: "전북특별자치도 김제시",
    province: "전북",
    city: "김제시",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-kimje-198kw-land"),
      alt: "전북 김제 198kW 토지형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.09",
    featured: true,
    published: true,
    tags: ["토지형", "발전사업", "김제"],
    landCategory: "대",
  }),
  roofStudy({
    id: "jeonbuk-buan-800kw-barn",
    title: "전북 부안 800kW 축사 지붕형 태양광",
    summary: "대형 축사 지붕을 활용한 발전사업 검토 사례",
    installCategory: "축사형",
    capacityKw: 800,
    capacityLabel: "800kW",
    regionLabel: "전북특별자치도 부안군",
    province: "전북",
    city: "부안군",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-buan-800kw-barn"),
      alt: "전북 부안 800kW 축사 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.06",
    featured: true,
    published: true,
    tags: ["축사", "지붕형", "부안"],
    landCategory: "대",
  }),
  roofStudy({
    id: "jeonbuk-gunsan-3kw-shop",
    title: "전북 군산 3.2kW 상가 지붕형 태양광",
    summary: "상가 지붕 자가소비형 태양광 설치 사례",
    installCategory: "상가형",
    capacityKw: 3.2,
    capacityLabel: "3.2kW",
    regionLabel: "전북특별자치도 군산시",
    province: "전북",
    city: "군산시",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-gunsan-3kw-shop"),
      alt: "전북 군산 3.2kW 상가 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2025.01",
    featured: false,
    published: true,
    tags: ["상가", "소규모", "군산"],
    landCategory: "대",
  }),
  roofStudy({
    id: "jeonbuk-jeonju-12kw-house",
    title: "전북 전주 12kW 주택 지붕형 태양광",
    summary: "주택 지붕 자가소비형 태양광 설치 사례",
    installCategory: "주택형",
    capacityKw: 12,
    capacityLabel: "12kW",
    regionLabel: "전북특별자치도 전주시",
    province: "전북",
    city: "전주시",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-jeonju-12kw-house"),
      alt: "전북 전주 12kW 주택 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.11",
    featured: true,
    published: true,
    tags: ["주택", "전주", "소규모"],
    landCategory: "대",
  }),
  roofStudy({
    id: "jeonbuk-jeonju-95kw-factory",
    title: "전북 전주 95kW 공장 지붕형 태양광",
    summary: "공장 지붕 자가소비·발전사업 병행 검토 사례",
    installCategory: "공장형",
    capacityKw: 95,
    capacityLabel: "95kW",
    regionLabel: "전북특별자치도 전주시",
    province: "전북",
    city: "전주시",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-jeonju-95kw-factory"),
      alt: "전북 전주 95kW 공장 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.03",
    featured: true,
    published: true,
    tags: ["공장", "전주", "지붕형"],
    landCategory: "대",
  }),
  roofStudy({
    id: "jeonbuk-iksan-120kw-factory",
    title: "전북 익산 120kW 공장 지붕형 태양광",
    summary: "중소공장 옥상 태양광 자가소비 사례",
    installCategory: "공장형",
    capacityKw: 120,
    capacityLabel: "120kW",
    regionLabel: "전북특별자치도 익산시",
    province: "전북",
    city: "익산시",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-iksan-120kw-factory"),
      alt: "전북 익산 120kW 공장 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2023.08",
    featured: false,
    published: true,
    tags: ["공장", "익산", "지붕형"],
    landCategory: "대",
  }),
  roofStudy({
    id: "gyeonggi-seongnam-99kw-roof",
    title: "경기 성남 99kW 옥상형 태양광",
    summary: "업무시설 옥상 태양광 설치 사례",
    installCategory: "지붕형",
    capacityKw: 99,
    capacityLabel: "99kW",
    regionLabel: "경기도 성남시",
    province: "경기",
    city: "성남시",
    thumbnail: {
      src: caseStudyThumbnailPath("gyeonggi-seongnam-99kw-roof"),
      alt: "경기 성남 99kW 옥상형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.05",
    featured: false,
    published: true,
    tags: ["옥상", "성남", "업무시설"],
    landCategory: "대",
  }),
  roofStudy({
    id: "gyeonggi-suwon-5kw-house",
    title: "경기 수원 5kW 주택 지붕형 태양광",
    summary: "단독주택 소규모 태양광 설치 사례",
    installCategory: "주택형",
    capacityKw: 5,
    capacityLabel: "5kW",
    regionLabel: "경기도 수원시",
    province: "경기",
    city: "수원시",
    thumbnail: {
      src: caseStudyThumbnailPath("gyeonggi-suwon-5kw-house"),
      alt: "경기 수원 5kW 주택 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2025.02",
    featured: false,
    published: true,
    tags: ["주택", "수원", "소규모"],
    landCategory: "대",
  }),
  landStudy({
    id: "chungnam-cheonan-250kw-land",
    title: "충남 천안 250kW 토지형 태양광",
    summary: "유휴 토지 활용 발전사업 시공 사례",
    installCategory: "토지형",
    capacityKw: 250,
    capacityLabel: "250kW",
    regionLabel: "충청남도 천안시",
    province: "충남",
    city: "천안시",
    thumbnail: {
      src: caseStudyThumbnailPath("chungnam-cheonan-250kw-land"),
      alt: "충남 천안 250kW 토지형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2023.12",
    featured: true,
    published: true,
    tags: ["토지형", "천안", "발전사업"],
    landCategory: "대",
  }),
  landStudy({
    id: "gyeongnam-geoje-500kw-land",
    title: "경남 거제 500kW 토지형 태양광",
    summary: "경남권 중형 토지 발전사업 시공 사례",
    installCategory: "토지형",
    capacityKw: 500,
    capacityLabel: "500kW",
    regionLabel: "경상남도 거제시",
    province: "경남",
    city: "거제시",
    thumbnail: {
      src: caseStudyThumbnailPath("gyeongnam-geoje-500kw-land"),
      alt: "경남 거제 500kW 토지형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.04",
    featured: false,
    published: true,
    tags: ["토지형", "거제", "발전사업"],
    landCategory: "대",
  }),
  landStudy({
    id: "gyeongnam-miryang-800kw-land",
    title: "경남 밀양 800kW 토지형 태양광",
    summary: "대형 유휴 토지 활용 발전사업 시공 사례",
    installCategory: "토지형",
    capacityKw: 800,
    capacityLabel: "800kW",
    regionLabel: "경상남도 밀양시",
    province: "경남",
    city: "밀양시",
    thumbnail: {
      src: caseStudyThumbnailPath("gyeongnam-miryang-800kw-land"),
      alt: "경남 밀양 800kW 토지형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2023.10",
    featured: true,
    published: true,
    tags: ["토지형", "밀양", "대형"],
    landCategory: "대",
  }),
  landStudy({
    id: "gyeongnam-gimhae-1000kw-land",
    title: "경남 김해 1MW 토지형 태양광",
    summary: "1MW급 토지 발전사업 시공 사례",
    installCategory: "토지형",
    capacityKw: 1000,
    capacityLabel: "1MW",
    regionLabel: "경상남도 김해시",
    province: "경남",
    city: "김해시",
    thumbnail: {
      src: caseStudyThumbnailPath("gyeongnam-gimhae-1000kw-land"),
      alt: "경남 김해 1MW 토지형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.01",
    featured: true,
    published: true,
    tags: ["토지형", "김해", "1MW"],
    landCategory: "대",
  }),
  roofStudy({
    id: "jeonbuk-wanju-50kw-barn",
    title: "전북 완주 50kW 축사 지붕형 태양광",
    summary: "축사 지붕 소규모 발전사업 검토 사례",
    installCategory: "축사형",
    capacityKw: 50,
    capacityLabel: "50kW",
    regionLabel: "전북특별자치도 완주군",
    province: "전북",
    city: "완주군",
    thumbnail: {
      src: caseStudyThumbnailPath("jeonbuk-wanju-50kw-barn"),
      alt: "전북 완주 50kW 축사 지붕형 태양광 시공 현장",
    },
    links: {},
    completedAt: "2024.07",
    featured: false,
    published: true,
    tags: ["축사", "완주", "소규모"],
    landCategory: "대",
  }),
];

export const publishedCaseStudies = caseStudies.filter((item) => item.published);
