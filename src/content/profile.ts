/**
 * 첫 화면의 인적 사항(표제란).
 *
 * 경력·역량·프로젝트는 DB(관리자 화면)가 정본이지만, 이 값들은 거의 바뀌지 않고 코드 리뷰를
 * 거쳐 바뀌는 편이 안전해서 파일로 둡니다. 공개 저장소이므로 전화번호는 넣지 않습니다.
 *
 * TODO(#9): 실제 값으로 채우기 — 비어 있는 항목은 표제란에서 빠집니다.
 */
export type Profile = {
  name: string;
  role: string;
  /** 한두 문장. 무엇을 잘하는 사람인지 */
  intro: string;
  birth?: string;
  location?: string;
  education?: string;
  email?: string;
  github?: string;
};

export const PROFILE: Profile = {
  name: "이름",
  role: "프론트엔드 개발자",
  intro: "실시간으로 움직이는 화면과, 그 화면이 틀리지 않게 지키는 테스트를 함께 만듭니다.",
  birth: "",
  location: "",
  education: "",
  email: "",
  github: "dongeul2",
};
