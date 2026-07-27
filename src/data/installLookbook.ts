/**
 * Installation lookbook — type examples, not verified project case studies.
 */

export interface LookbookItem {
  id: string;
  title: string;
  blurb: string;
  points: string[];
  visualKey: "ground" | "factory" | "residential" | "carport" | "warehouse" | "building";
  featured?: boolean;
}

export const INSTALL_LOOKBOOK: LookbookItem[] = [
  {
    id: "ground",
    title: "토지형 태양광",
    blurb: "유휴부지에 구조물을 설치해 발전설비를 구성하는 형태입니다.",
    points: ["부지면적", "경사", "개발행위", "계통연계"],
    visualKey: "ground",
    featured: true,
  },
  {
    id: "factory",
    title: "공장·창고 지붕형",
    blurb: "기존 건축물 지붕을 활용해 토지 추가 확보 없이 설치하는 형태입니다.",
    points: ["지붕 구조", "방수", "하중", "음영"],
    visualKey: "factory",
  },
  {
    id: "residential",
    title: "주택·상계형",
    blurb: "자가소비 및 상계거래를 고려하는 소규모 설치형태입니다.",
    points: ["계약전력", "지붕방향", "한전 접수"],
    visualKey: "residential",
  },
  {
    id: "carport",
    title: "주차장형",
    blurb: "주차공간 상부에 구조물을 설치해 주차와 발전을 함께 활용하는 형태입니다.",
    points: ["구조물 높이", "주차동선", "하중", "배수"],
    visualKey: "carport",
  },
];
