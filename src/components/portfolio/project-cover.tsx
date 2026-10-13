import Image from "next/image";

/**
 * 프로젝트 커버. 이미지가 있으면 이미지, 없으면 프로젝트 강조색으로 그린 표지.
 * 저장소에 둔 이미지(`/projects/...`)는 next/image로 최적화하고, 외부 URL은 그대로 씁니다 —
 * 외부 도메인을 이미지 최적화에 열어 두지 않기 위해서입니다(SSRF 패치 #56 참고).
 */
export function ProjectCover({
  name,
  src,
  alt,
  sizes,
  priority = false,
}: {
  name: string;
  src: string | null;
  alt?: string | null;
  sizes: string;
  priority?: boolean;
}) {
  if (src?.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={alt ?? `${name} 화면`}
        fill
        sizes={sizes}
        priority={priority}
        className="cover__img"
      />
    );
  }
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- 외부 이미지는 최적화 경로에 태우지 않습니다
    return <img src={src} alt={alt ?? `${name} 화면`} loading={priority ? "eager" : "lazy"} className="cover__img" />;
  }
  return (
    <div className="cover__generated" aria-hidden="true">
      <span>{name}</span>
    </div>
  );
}
